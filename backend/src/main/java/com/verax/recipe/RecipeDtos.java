package com.verax.recipe;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class RecipeDtos {

    private RecipeDtos() {
    }

    public record ServingOption(String label, BigDecimal amount, String unit) {
    }

    public record FoodHit(
            String id,
            String source,
            String name,
            String brand,
            BigDecimal kcal,
            BigDecimal protein,
            BigDecimal carbs,
            BigDecimal fat,
            String per,
            java.util.List<ServingOption> servings
    ) {
        public FoodHit(
                String id,
                String source,
                String name,
                String brand,
                BigDecimal kcal,
                BigDecimal protein,
                BigDecimal carbs,
                BigDecimal fat,
                String per
        ) {
            this(id, source, name, brand, kcal, protein, carbs, fat, per, java.util.List.of());
        }
    }

    public record Macros(BigDecimal kcal, BigDecimal protein, BigDecimal carbs, BigDecimal fat) {
        public static Macros of(BigDecimal kcal, BigDecimal protein, BigDecimal carbs, BigDecimal fat) {
            return new Macros(n(kcal), n(protein), n(carbs), n(fat));
        }

        public static Macros sum(List<Macros> rows) {
            BigDecimal kcal = BigDecimal.ZERO;
            BigDecimal protein = BigDecimal.ZERO;
            BigDecimal carbs = BigDecimal.ZERO;
            BigDecimal fat = BigDecimal.ZERO;
            for (Macros row : rows) {
                kcal = kcal.add(n(row.kcal()));
                protein = protein.add(n(row.protein()));
                carbs = carbs.add(n(row.carbs()));
                fat = fat.add(n(row.fat()));
            }
            return of(kcal, protein, carbs, fat);
        }

        private static BigDecimal n(BigDecimal value) {
            return value == null ? BigDecimal.ZERO : value;
        }
    }

    public record LineUpsert(
            String name,
            String externalId,
            String source,
            BigDecimal grams,
            String unit,
            BigDecimal kcal,
            BigDecimal protein,
            BigDecimal carbs,
            BigDecimal fat
    ) {
    }

    public record RecipeUpsert(String name, BigDecimal servings) {
    }

    public record LineView(
            UUID id,
            String name,
            String externalId,
            String source,
            BigDecimal grams,
            String unit,
            BigDecimal kcal,
            BigDecimal protein,
            BigDecimal carbs,
            BigDecimal fat
    ) {
        public static LineView from(FoodRecipeItem item) {
            return new LineView(
                    item.getId(),
                    item.getName(),
                    item.getExternalId(),
                    item.getSource(),
                    item.getGrams(),
                    measure(item.getUnit()),
                    item.getKcal(),
                    item.getProtein(),
                    item.getCarbs(),
                    item.getFat()
            );
        }

        public static LineView from(MealLogItem item) {
            return new LineView(
                    item.getId(),
                    item.getName(),
                    item.getExternalId(),
                    item.getSource(),
                    item.getGrams(),
                    measure(item.getUnit()),
                    item.getKcal(),
                    item.getProtein(),
                    item.getCarbs(),
                    item.getFat()
            );
        }

        public static String measure(String unit) {
            return "ml".equalsIgnoreCase(unit) ? "ml" : "g";
        }
    }

    public record RecipeView(UUID id, String name, BigDecimal servings, Macros totals, List<LineView> items) {
        public static RecipeView from(FoodRecipe recipe) {
            List<LineView> lines = recipe.getItems().stream().map(LineView::from).toList();
            return new RecipeView(recipe.getId(), recipe.getName(), recipe.getServings(), macros(recipe.getItems()), lines);
        }
    }

    public record MealUpsert(LocalDate date, String slot, UUID recipeId, String name, List<LineUpsert> items) {
    }

    public record MealPatch(String name, String slot) {
    }

    public record MealView(
            UUID id,
            LocalDate date,
            String slot,
            UUID recipeId,
            String name,
            Macros totals,
            List<LineView> items
    ) {
        public static MealView from(MealLog meal) {
            UUID recipeId = meal.getRecipe() == null ? null : meal.getRecipe().getId();
            return new MealView(
                    meal.getId(),
                    meal.getLogDate(),
                    meal.getSlot(),
                    recipeId,
                    meal.getName(),
                    mealMacros(meal.getItems()),
                    meal.getItems().stream().map(LineView::from).toList()
            );
        }
    }

    public record DayMeals(LocalDate date, Macros totals, List<MealView> meals, Energy energy, int waterMl) {
    }

    public record WaterUpsert(LocalDate date, Integer milliliters, Integer addMl) {
    }

    public record SupplementUpsert(String name, String dose, String timing, String notes) {
    }

    public record SupplementLogUpsert(LocalDate date, Integer servings) {
    }

    public record SupplementView(
            UUID id,
            String name,
            String dose,
            String timing,
            String notes,
            int sortOrder,
            int servings
    ) {
        public static SupplementView from(FuelSupplement row, int servings) {
            return new SupplementView(
                    row.getId(),
                    row.getName(),
                    row.getDose(),
                    row.getTiming(),
                    row.getNotes(),
                    row.getSortOrder(),
                    servings
            );
        }
    }

    public record Energy(
            BigDecimal tdee,
            BigDecimal consumed,
            BigDecimal burned,
            BigDecimal remaining,
            List<Burn> burns
    ) {
    }

    public record Burn(String name, String source, BigDecimal kcal) {
    }

    public record PeriodPoint(String period, Macros totals) {
    }

    public record Summary(List<PeriodPoint> points, Macros totals) {
    }

    static Macros macros(List<FoodRecipeItem> items) {
        return Macros.sum(items.stream()
                .map(item -> Macros.of(item.getKcal(), item.getProtein(), item.getCarbs(), item.getFat()))
                .toList());
    }

    static Macros mealMacros(List<MealLogItem> items) {
        return Macros.sum(items.stream()
                .map(item -> Macros.of(item.getKcal(), item.getProtein(), item.getCarbs(), item.getFat()))
                .toList());
    }
}
