package com.verax.recipe;

import com.verax.security.CurrentUser;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class RecipeController {

    private final RecipeService recipes;
    private final CurrentUser currentUser;

    public RecipeController(RecipeService recipes, CurrentUser currentUser) {
        this.recipes = recipes;
        this.currentUser = currentUser;
    }

    @GetMapping("/foods/search")
    public List<RecipeDtos.FoodHit> search(@RequestParam String q) {
        return recipes.searchFoods(currentUser.id(), q);
    }

    @GetMapping("/foods")
    public List<RecipeDtos.UserFoodView> listFoods() {
        return recipes.listFoods(currentUser.id());
    }

    @PostMapping("/foods")
    public RecipeDtos.UserFoodView createFood(@RequestBody RecipeDtos.UserFoodUpsert request) {
        return recipes.createFood(currentUser.id(), request);
    }

    @PatchMapping("/foods/{id}")
    public RecipeDtos.UserFoodView updateFood(@PathVariable UUID id, @RequestBody RecipeDtos.UserFoodUpsert request) {
        return recipes.updateFood(currentUser.id(), id, request);
    }

    @DeleteMapping("/foods/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFood(@PathVariable UUID id) {
        recipes.deleteFood(currentUser.id(), id);
    }

    @GetMapping("/recipes")
    public List<RecipeDtos.RecipeView> list() {
        return recipes.listRecipes(currentUser.id());
    }

    @PostMapping("/recipes")
    public RecipeDtos.RecipeView create(@RequestBody RecipeDtos.RecipeUpsert request) {
        return recipes.createRecipe(currentUser.id(), request);
    }

    @PatchMapping("/recipes/{id}")
    public RecipeDtos.RecipeView update(@PathVariable UUID id, @RequestBody RecipeDtos.RecipeUpsert request) {
        return recipes.updateRecipe(currentUser.id(), id, request);
    }

    @DeleteMapping("/recipes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        recipes.deleteRecipe(currentUser.id(), id);
    }

    @PostMapping("/recipes/{id}/items")
    public RecipeDtos.RecipeView addItem(@PathVariable UUID id, @RequestBody RecipeDtos.LineUpsert request) {
        return recipes.addItem(currentUser.id(), id, request);
    }

    @PatchMapping("/recipes/items/{itemId}")
    public RecipeDtos.LineView updateItem(@PathVariable UUID itemId, @RequestBody RecipeDtos.LineUpsert request) {
        return recipes.updateItem(currentUser.id(), itemId, request);
    }

    @DeleteMapping("/recipes/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@PathVariable UUID itemId) {
        recipes.deleteItem(currentUser.id(), itemId);
    }

    @GetMapping("/meals/day")
    public RecipeDtos.DayMeals day(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return recipes.day(currentUser.id(), date);
    }

    @PutMapping("/meals/water")
    public RecipeDtos.DayMeals water(@RequestBody RecipeDtos.WaterUpsert request) {
        return recipes.saveWater(currentUser.id(), request);
    }

    @GetMapping("/supplements")
    public List<RecipeDtos.SupplementView> supplements(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return recipes.listSupplements(currentUser.id(), date);
    }

    @PostMapping("/supplements")
    public RecipeDtos.SupplementView createSupplement(@RequestBody RecipeDtos.SupplementUpsert request) {
        return recipes.createSupplement(currentUser.id(), request);
    }

    @PatchMapping("/supplements/{id}")
    public RecipeDtos.SupplementView updateSupplement(
            @PathVariable UUID id,
            @RequestBody RecipeDtos.SupplementUpsert request
    ) {
        return recipes.updateSupplement(currentUser.id(), id, request);
    }

    @DeleteMapping("/supplements/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSupplement(@PathVariable UUID id) {
        recipes.deleteSupplement(currentUser.id(), id);
    }

    @PutMapping("/supplements/{id}/day")
    public RecipeDtos.SupplementView logSupplementDay(
            @PathVariable UUID id,
            @RequestBody RecipeDtos.SupplementLogUpsert request
    ) {
        return recipes.logSupplementDay(currentUser.id(), id, request);
    }

    @PostMapping("/meals")
    public RecipeDtos.MealView log(@RequestBody RecipeDtos.MealUpsert request) {
        return recipes.logMeal(currentUser.id(), request);
    }

    @PatchMapping("/meals/{id}")
    public RecipeDtos.MealView updateMeal(@PathVariable UUID id, @RequestBody RecipeDtos.MealPatch request) {
        return recipes.updateMeal(currentUser.id(), id, request);
    }

    @PostMapping("/meals/{id}/items")
    public RecipeDtos.MealView addMealItem(@PathVariable UUID id, @RequestBody RecipeDtos.LineUpsert request) {
        return recipes.addMealItem(currentUser.id(), id, request);
    }

    @PatchMapping("/meals/items/{itemId}")
    public RecipeDtos.LineView updateMealItem(@PathVariable UUID itemId, @RequestBody RecipeDtos.LineUpsert request) {
        return recipes.updateMealItem(currentUser.id(), itemId, request);
    }

    @DeleteMapping("/meals/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMealItem(@PathVariable UUID itemId) {
        recipes.deleteMealItem(currentUser.id(), itemId);
    }

    @DeleteMapping("/meals/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMeal(@PathVariable UUID id) {
        recipes.deleteMeal(currentUser.id(), id);
    }

    @GetMapping("/meals/summary")
    public RecipeDtos.Summary summary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String granularity
    ) {
        return recipes.summary(currentUser.id(), from, to, granularity);
    }
}
