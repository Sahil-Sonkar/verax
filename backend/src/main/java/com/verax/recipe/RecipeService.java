package com.verax.recipe;

import com.verax.common.ApiException;
import com.verax.habit.AutoCompleteService;
import com.verax.train.TrainDtos;
import com.verax.train.TrainService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class RecipeService {

    private static final List<String> SLOTS = List.of("BREAKFAST", "LUNCH", "SNACK", "DINNER", "OTHER");

    private final FoodRecipeRepository recipes;
    private final FoodRecipeItemRepository recipeItems;
    private final MealLogRepository meals;
    private final MealLogItemRepository mealItems;
    private final WaterLogRepository water;
    private final FuelSupplementRepository supplements;
    private final FuelSupplementLogRepository supplementLogs;
    private final UserRepository users;
    private final FoodSearchService search;
    private final TrainService train;
    private final AutoCompleteService autoComplete;
    private final UserFoodRepository foods;

    public RecipeService(
            FoodRecipeRepository recipes,
            FoodRecipeItemRepository recipeItems,
            MealLogRepository meals,
            MealLogItemRepository mealItems,
            WaterLogRepository water,
            FuelSupplementRepository supplements,
            FuelSupplementLogRepository supplementLogs,
            UserRepository users,
            FoodSearchService search,
            TrainService train,
            AutoCompleteService autoComplete,
            UserFoodRepository foods
    ) {
        this.recipes = recipes;
        this.recipeItems = recipeItems;
        this.meals = meals;
        this.mealItems = mealItems;
        this.water = water;
        this.supplements = supplements;
        this.supplementLogs = supplementLogs;
        this.users = users;
        this.search = search;
        this.train = train;
        this.autoComplete = autoComplete;
        this.foods = foods;
    }

    public List<RecipeDtos.FoodHit> searchFoods(UUID userId, String query) {
        List<RecipeDtos.FoodHit> hits = new ArrayList<>();
        if (query != null && !query.isBlank()) {
            for (UserFood food : foods.findByUserIdAndNameContainingIgnoreCase(userId, query.trim())) {
                hits.add(RecipeDtos.UserFoodView.from(food).toHit());
            }
        }
        hits.addAll(search.search(query));
        return hits.size() <= 16 ? hits : hits.subList(0, 16);
    }

    @Transactional(readOnly = true)
    public List<RecipeDtos.UserFoodView> listFoods(UUID userId) {
        return foods.findByUserIdOrderByNameAsc(userId).stream().map(RecipeDtos.UserFoodView::from).toList();
    }

    @Transactional
    public RecipeDtos.UserFoodView createFood(UUID userId, RecipeDtos.UserFoodUpsert request) {
        UserFood food = new UserFood();
        food.setUser(users.getReferenceById(userId));
        applyFood(food, request, true);
        foods.save(food);
        return RecipeDtos.UserFoodView.from(food);
    }

    @Transactional
    public RecipeDtos.UserFoodView updateFood(UUID userId, UUID id, RecipeDtos.UserFoodUpsert request) {
        UserFood food = foods.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Food not found"));
        applyFood(food, request, false);
        return RecipeDtos.UserFoodView.from(food);
    }

    @Transactional
    public void deleteFood(UUID userId, UUID id) {
        UserFood food = foods.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Food not found"));
        foods.delete(food);
    }

    @Transactional
    public List<RecipeDtos.RecipeView> listRecipes(UUID userId) {
        return recipes.findWithItems(userId).stream().map(RecipeDtos.RecipeView::from).toList();
    }

    @Transactional
    public RecipeDtos.RecipeView createRecipe(UUID userId, RecipeDtos.RecipeUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Recipe name is required");
        }
        FoodRecipe recipe = new FoodRecipe();
        recipe.setUser(users.getReferenceById(userId));
        recipe.setName(request.name().trim());
        recipe.setServings(request.servings() == null || request.servings().signum() <= 0 ? BigDecimal.ONE : request.servings());
        recipes.save(recipe);
        return RecipeDtos.RecipeView.from(recipe);
    }

    @Transactional
    public RecipeDtos.RecipeView updateRecipe(UUID userId, UUID id, RecipeDtos.RecipeUpsert request) {
        FoodRecipe recipe = recipes.findWithItems(id, userId).orElseThrow(() -> ApiException.notFound("Recipe not found"));
        if (request.name() != null && !request.name().isBlank()) {
            recipe.setName(request.name().trim());
        }
        if (request.servings() != null && request.servings().signum() > 0) {
            recipe.setServings(request.servings());
        }
        return RecipeDtos.RecipeView.from(recipe);
    }

    @Transactional
    public void deleteRecipe(UUID userId, UUID id) {
        FoodRecipe recipe = recipes.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Recipe not found"));
        recipes.delete(recipe);
    }

    @Transactional
    public RecipeDtos.RecipeView addItem(UUID userId, UUID recipeId, RecipeDtos.LineUpsert request) {
        FoodRecipe recipe = recipes.findWithItems(recipeId, userId).orElseThrow(() -> ApiException.notFound("Recipe not found"));
        FoodRecipeItem item = new FoodRecipeItem();
        item.setRecipe(recipe);
        apply(item, request);
        recipe.getItems().add(item);
        recipes.save(recipe);
        return RecipeDtos.RecipeView.from(recipe);
    }

    @Transactional
    public RecipeDtos.LineView updateItem(UUID userId, UUID itemId, RecipeDtos.LineUpsert request) {
        FoodRecipeItem item = recipeItems.findByIdAndRecipeUserId(itemId, userId)
                .orElseThrow(() -> ApiException.notFound("Ingredient not found"));
        if (request.grams() != null && item.getGrams() != null && item.getGrams().signum() > 0
                && request.grams().compareTo(item.getGrams()) != 0
                && request.kcal() == null && request.protein() == null && request.carbs() == null && request.fat() == null) {
            BigDecimal factor = request.grams().divide(item.getGrams(), 6, java.math.RoundingMode.HALF_UP);
            item.setGrams(request.grams());
            item.setKcal(scale(item.getKcal(), factor));
            item.setProtein(scale(item.getProtein(), factor));
            item.setCarbs(scale(item.getCarbs(), factor));
            item.setFat(scale(item.getFat(), factor));
            item.setMicros(FoodNutrients.scaleStored(item.getMicros(), factor));
        }
        if (request.name() != null && !request.name().isBlank()) {
            item.setName(request.name().trim());
        }
        if (request.kcal() != null) {
            item.setKcal(nvl(request.kcal()));
        }
        if (request.protein() != null) {
            item.setProtein(nvl(request.protein()));
        }
        if (request.carbs() != null) {
            item.setCarbs(nvl(request.carbs()));
        }
        if (request.fat() != null) {
            item.setFat(nvl(request.fat()));
        }
        if (request.micros() != null && !request.micros().isEmpty()) {
            item.setMicros(FoodNutrients.toStored(request.micros()));
        }
        if (request.grams() != null && (request.kcal() != null || item.getGrams() == null || item.getGrams().signum() == 0)) {
            item.setGrams(nvl(request.grams()));
        }
        if (request.unit() != null && !request.unit().isBlank()) {
            item.setUnit(RecipeDtos.LineView.measure(request.unit()));
        }
        return RecipeDtos.LineView.from(item);
    }

    @Transactional
    public void deleteItem(UUID userId, UUID itemId) {
        FoodRecipeItem item = recipeItems.findByIdAndRecipeUserId(itemId, userId)
                .orElseThrow(() -> ApiException.notFound("Ingredient not found"));
        recipeItems.delete(item);
    }

    @Transactional(readOnly = true)
    public RecipeDtos.DayMeals day(UUID userId, LocalDate date) {
        List<MealLog> rows = meals.findDay(userId, date);
        List<RecipeDtos.MealView> views = rows.stream().map(RecipeDtos.MealView::from).toList();
        RecipeDtos.Macros totals = RecipeDtos.Macros.sum(views.stream().map(RecipeDtos.MealView::totals).toList());
        TrainDtos.DayEnergy trainEnergy = train.dayEnergy(userId, date);
        BigDecimal consumed = totals.kcal();
        BigDecimal burned = trainEnergy.burned() == null ? BigDecimal.ZERO : trainEnergy.burned();
        BigDecimal remaining = trainEnergy.tdee() == null ? null : trainEnergy.tdee().subtract(consumed).add(burned);
        List<RecipeDtos.Burn> burns = trainEnergy.burns().stream()
                .map(row -> new RecipeDtos.Burn(row.name(), row.source(), row.kcal()))
                .toList();
        return new RecipeDtos.DayMeals(
                date,
                totals,
                views,
                new RecipeDtos.Energy(trainEnergy.tdee(), consumed, burned, remaining, burns),
                water.findByUserIdAndLogDate(userId, date).map(WaterLog::getMilliliters).orElse(0)
        );
    }

    @Transactional
    public RecipeDtos.DayMeals saveWater(UUID userId, RecipeDtos.WaterUpsert request) {
        if (request == null || request.date() == null) {
            throw ApiException.badRequest("Date is required");
        }
        int current = water.findByUserIdAndLogDate(userId, request.date()).map(WaterLog::getMilliliters).orElse(0);
        int next = request.milliliters() != null ? request.milliliters() : current + (request.addMl() == null ? 0 : request.addMl());
        next = Math.max(0, Math.min(10000, next));
        WaterLog row = water.findByUserIdAndLogDate(userId, request.date()).orElse(null);
        if (next == 0) {
            if (row != null) {
                water.delete(row);
            }
        } else {
            if (row == null) {
                row = new WaterLog();
                row.setUser(users.getReferenceById(userId));
                row.setLogDate(request.date());
            }
            row.setMilliliters(next);
            water.save(row);
        }
        autoComplete.applyNamed(
                userId,
                request.date(),
                "water",
                BigDecimal.valueOf(next).divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP),
                BigDecimal.valueOf(3),
                "Fuel water"
        );
        return day(userId, request.date());
    }

    @Transactional(readOnly = true)
    public List<RecipeDtos.SupplementView> listSupplements(UUID userId, LocalDate date) {
        LocalDate day = date == null ? LocalDate.now() : date;
        Map<UUID, Integer> servings = new LinkedHashMap<>();
        for (FuelSupplementLog log : supplementLogs.findByUserIdAndLogDate(userId, day)) {
            servings.put(log.getSupplement().getId(), log.getServings());
        }
        return supplements.findByUserIdOrderBySortOrderAscNameAsc(userId).stream()
                .map(row -> RecipeDtos.SupplementView.from(row, servings.getOrDefault(row.getId(), 0)))
                .toList();
    }

    @Transactional
    public RecipeDtos.SupplementView createSupplement(UUID userId, RecipeDtos.SupplementUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Supplement name is required");
        }
        FuelSupplement row = new FuelSupplement();
        row.setUser(users.getReferenceById(userId));
        row.setName(request.name().trim());
        row.setDose(blankToNull(request.dose()));
        row.setTiming(blankToNull(request.timing()));
        row.setNotes(blankToNull(request.notes()));
        row.setSortOrder((int) supplements.countByUserId(userId));
        supplements.save(row);
        return RecipeDtos.SupplementView.from(row, 0);
    }

    @Transactional
    public RecipeDtos.SupplementView updateSupplement(UUID userId, UUID id, RecipeDtos.SupplementUpsert request) {
        FuelSupplement row = supplementOn(userId, id);
        if (request.name() != null && !request.name().isBlank()) {
            row.setName(request.name().trim());
        }
        if (request.dose() != null) {
            row.setDose(blankToNull(request.dose()));
        }
        if (request.timing() != null) {
            row.setTiming(blankToNull(request.timing()));
        }
        if (request.notes() != null) {
            row.setNotes(blankToNull(request.notes()));
        }
        return RecipeDtos.SupplementView.from(row, 0);
    }

    @Transactional
    public void deleteSupplement(UUID userId, UUID id) {
        FuelSupplement row = supplementOn(userId, id);
        supplementLogs.deleteBySupplementId(id);
        supplementLogs.flush();
        supplements.delete(row);
    }

    @Transactional
    public RecipeDtos.SupplementView logSupplementDay(UUID userId, UUID id, RecipeDtos.SupplementLogUpsert request) {
        if (request.date() == null) {
            throw ApiException.badRequest("Date is required");
        }
        FuelSupplement row = supplementOn(userId, id);
        int servings = Math.max(0, Math.min(20, request.servings() == null ? 0 : request.servings()));
        Optional<FuelSupplementLog> existing = supplementLogs.findBySupplementIdAndLogDate(id, request.date());
        if (servings <= 0) {
            existing.ifPresent(supplementLogs::delete);
            return RecipeDtos.SupplementView.from(row, 0);
        }
        FuelSupplementLog log = existing.orElseGet(() -> {
            FuelSupplementLog created = new FuelSupplementLog();
            created.setUser(users.getReferenceById(userId));
            created.setSupplement(row);
            created.setLogDate(request.date());
            return created;
        });
        log.setServings(servings);
        supplementLogs.save(log);
        return RecipeDtos.SupplementView.from(row, servings);
    }

    @Transactional
    public RecipeDtos.MealView logMeal(UUID userId, RecipeDtos.MealUpsert request) {
        if (request.date() == null) {
            throw ApiException.badRequest("Date is required");
        }
        String slot = normalizeSlot(request.slot());
        User user = users.getReferenceById(userId);
        MealLog meal = new MealLog();
        meal.setUser(user);
        meal.setLogDate(request.date());
        meal.setSlot(slot);
        if (request.recipeId() != null) {
            FoodRecipe recipe = recipes.findWithItems(request.recipeId(), userId)
                    .orElseThrow(() -> ApiException.notFound("Recipe not found"));
            meal.setRecipe(recipe);
            meal.setName(request.name() == null || request.name().isBlank() ? recipe.getName() : request.name().trim());
            for (FoodRecipeItem source : recipe.getItems()) {
                MealLogItem copy = new MealLogItem();
                copy.setMeal(meal);
                copy.setName(source.getName());
                copy.setExternalId(source.getExternalId());
                copy.setSource(source.getSource());
                copy.setGrams(source.getGrams());
                copy.setUnit(RecipeDtos.LineView.measure(source.getUnit()));
                copy.setKcal(source.getKcal());
                copy.setProtein(source.getProtein());
                copy.setCarbs(source.getCarbs());
                copy.setFat(source.getFat());
                copy.setMicros(source.getMicros() == null ? Map.of() : new LinkedHashMap<>(source.getMicros()));
                meal.getItems().add(copy);
            }
        } else {
            if (request.name() == null || request.name().isBlank()) {
                throw ApiException.badRequest("Meal name is required");
            }
            meal.setName(request.name().trim());
            for (RecipeDtos.LineUpsert line : request.items() == null ? List.<RecipeDtos.LineUpsert>of() : request.items()) {
                MealLogItem item = new MealLogItem();
                item.setMeal(meal);
                apply(item, line);
                meal.getItems().add(item);
            }
        }
        meals.save(meal);
        return RecipeDtos.MealView.from(meal);
    }

    @Transactional
    public void deleteMeal(UUID userId, UUID id) {
        MealLog meal = meals.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Meal not found"));
        meals.delete(meal);
    }

    @Transactional
    public RecipeDtos.MealView updateMeal(UUID userId, UUID id, RecipeDtos.MealPatch request) {
        MealLog meal = meals.findWithItems(id, userId).orElseThrow(() -> ApiException.notFound("Meal not found"));
        if (request.name() != null && !request.name().isBlank()) {
            meal.setName(request.name().trim());
        }
        if (request.slot() != null && !request.slot().isBlank()) {
            meal.setSlot(normalizeSlot(request.slot()));
        }
        return RecipeDtos.MealView.from(meal);
    }

    @Transactional
    public RecipeDtos.MealView addMealItem(UUID userId, UUID mealId, RecipeDtos.LineUpsert request) {
        MealLog meal = meals.findWithItems(mealId, userId).orElseThrow(() -> ApiException.notFound("Meal not found"));
        MealLogItem item = new MealLogItem();
        item.setMeal(meal);
        apply(item, request);
        meal.getItems().add(item);
        mealItems.save(item);
        return RecipeDtos.MealView.from(meal);
    }

    @Transactional
    public RecipeDtos.LineView updateMealItem(UUID userId, UUID itemId, RecipeDtos.LineUpsert request) {
        MealLogItem item = mealItems.findByIdAndMealUserId(itemId, userId)
                .orElseThrow(() -> ApiException.notFound("Ingredient not found"));
        if (request.grams() != null && item.getGrams() != null && item.getGrams().signum() > 0
                && request.grams().compareTo(item.getGrams()) != 0
                && request.kcal() == null && request.protein() == null && request.carbs() == null && request.fat() == null) {
            BigDecimal factor = request.grams().divide(item.getGrams(), 6, java.math.RoundingMode.HALF_UP);
            item.setGrams(request.grams());
            item.setKcal(scale(item.getKcal(), factor));
            item.setProtein(scale(item.getProtein(), factor));
            item.setCarbs(scale(item.getCarbs(), factor));
            item.setFat(scale(item.getFat(), factor));
            item.setMicros(FoodNutrients.scaleStored(item.getMicros(), factor));
        }
        if (request.name() != null && !request.name().isBlank()) {
            item.setName(request.name().trim());
        }
        if (request.kcal() != null) {
            item.setKcal(nvl(request.kcal()));
        }
        if (request.protein() != null) {
            item.setProtein(nvl(request.protein()));
        }
        if (request.carbs() != null) {
            item.setCarbs(nvl(request.carbs()));
        }
        if (request.fat() != null) {
            item.setFat(nvl(request.fat()));
        }
        if (request.micros() != null && !request.micros().isEmpty()) {
            item.setMicros(FoodNutrients.toStored(request.micros()));
        }
        if (request.grams() != null && (request.kcal() != null || item.getGrams() == null || item.getGrams().signum() == 0)) {
            item.setGrams(nvl(request.grams()));
        }
        if (request.unit() != null && !request.unit().isBlank()) {
            item.setUnit(RecipeDtos.LineView.measure(request.unit()));
        }
        return RecipeDtos.LineView.from(item);
    }

    @Transactional
    public void deleteMealItem(UUID userId, UUID itemId) {
        MealLogItem item = mealItems.findByIdAndMealUserId(itemId, userId)
                .orElseThrow(() -> ApiException.notFound("Ingredient not found"));
        mealItems.delete(item);
    }

    @Transactional(readOnly = true)
    public RecipeDtos.Summary summary(UUID userId, LocalDate from, LocalDate to, String granularity) {
        List<MealLog> rows = meals.findRange(userId, from, to);
        String grain = granularity == null ? "day" : granularity.toLowerCase(Locale.ROOT);
        Map<String, List<RecipeDtos.Macros>> buckets = new LinkedHashMap<>();
        for (MealLog meal : rows) {
            String key = periodKey(meal.getLogDate(), grain);
            buckets.computeIfAbsent(key, ignored -> new ArrayList<>()).add(RecipeDtos.mealMacros(meal.getItems()));
        }
        List<RecipeDtos.PeriodPoint> points = new ArrayList<>();
        for (Map.Entry<String, List<RecipeDtos.Macros>> entry : buckets.entrySet()) {
            points.add(new RecipeDtos.PeriodPoint(entry.getKey(), RecipeDtos.Macros.sum(entry.getValue())));
        }
        return new RecipeDtos.Summary(points, RecipeDtos.Macros.sum(points.stream().map(RecipeDtos.PeriodPoint::totals).toList()));
    }

    private FuelSupplement supplementOn(UUID userId, UUID id) {
        return supplements.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Supplement not found"));
    }

    private static void applyFood(UserFood food, RecipeDtos.UserFoodUpsert request, boolean creating) {
        if (request == null || request.name() == null || request.name().isBlank()) {
            if (creating) {
                throw ApiException.badRequest("Food name is required");
            }
        } else {
            food.setName(request.name().trim());
        }
        if (request != null && (creating || request.brand() != null)) {
            food.setBrand(blankToNull(request.brand()));
        }
        if (request != null && (creating || request.servingAmount() != null || request.servings() != null || request.servingUnit() != null)) {
            food.setServingAmount(
                    request.servingAmount() == null || request.servingAmount().signum() <= 0
                            ? BigDecimal.valueOf(100)
                            : request.servingAmount()
            );
            food.setServingUnit(RecipeDtos.LineView.measure(request.servingUnit()));
            food.setServings(
                    request.servings() == null || request.servings().signum() <= 0
                            ? BigDecimal.ONE
                            : request.servings()
            );
        }
        BigDecimal grams = FoodNutrients.portionGrams(food.getServingAmount(), food.getServings());
        if (request != null && (creating || request.kcal() != null)) {
            food.setKcal(FoodNutrients.toPer100(nvl(request.kcal()), grams));
        }
        if (request != null && (creating || request.protein() != null)) {
            food.setProtein(FoodNutrients.toPer100(nvl(request.protein()), grams));
        }
        if (request != null && (creating || request.carbs() != null)) {
            food.setCarbs(FoodNutrients.toPer100(nvl(request.carbs()), grams));
        }
        if (request != null && (creating || request.fat() != null)) {
            food.setFat(FoodNutrients.toPer100(nvl(request.fat()), grams));
        }
        if (request != null && (creating || request.micros() != null)) {
            BigDecimal factor = grams.signum() <= 0
                    ? BigDecimal.ONE
                    : BigDecimal.valueOf(100).divide(grams, 8, RoundingMode.HALF_UP);
            food.setMicros(FoodNutrients.toStored(FoodNutrients.scale(FoodNutrients.compact(request.micros()), factor)));
        }
        if (food.getName() == null || food.getName().isBlank()) {
            throw ApiException.badRequest("Food name is required");
        }
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String periodKey(LocalDate date, String grain) {
        if ("week".equals(grain)) {
            return date.getYear() + "-W" + date.get(WeekFields.ISO.weekOfWeekBasedYear());
        }
        if ("month".equals(grain)) {
            return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
        }
        return date.toString();
    }

    private static String normalizeSlot(String slot) {
        if (slot == null || slot.isBlank()) {
            return "OTHER";
        }
        String value = slot.trim().toUpperCase(Locale.ROOT);
        return SLOTS.contains(value) ? value : "OTHER";
    }

    private static void apply(FoodRecipeItem item, RecipeDtos.LineUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Ingredient name is required");
        }
        item.setName(request.name().trim());
        item.setExternalId(request.externalId());
        item.setSource(request.source());
        item.setGrams(nvl(request.grams()));
        item.setUnit(RecipeDtos.LineView.measure(request.unit()));
        item.setKcal(nvl(request.kcal()));
        item.setProtein(nvl(request.protein()));
        item.setCarbs(nvl(request.carbs()));
        item.setFat(nvl(request.fat()));
        item.setMicros(FoodNutrients.toStored(request.micros()));
    }

    private static void apply(MealLogItem item, RecipeDtos.LineUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Ingredient name is required");
        }
        item.setName(request.name().trim());
        item.setExternalId(request.externalId());
        item.setSource(request.source());
        item.setGrams(nvl(request.grams()));
        item.setUnit(RecipeDtos.LineView.measure(request.unit()));
        item.setKcal(nvl(request.kcal()));
        item.setProtein(nvl(request.protein()));
        item.setCarbs(nvl(request.carbs()));
        item.setFat(nvl(request.fat()));
        item.setMicros(FoodNutrients.toStored(request.micros()));
    }

    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal scale(BigDecimal value, BigDecimal factor) {
        return nvl(value).multiply(factor).setScale(1, java.math.RoundingMode.HALF_UP);
    }
}
