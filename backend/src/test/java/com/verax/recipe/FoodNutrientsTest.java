package com.verax.recipe;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FoodNutrientsTest {

    @Test
    void compactKeepsKnownKeysAndAliasesTranFat() {
        Map<String, BigDecimal> out = FoodNutrients.compact(Map.of(
                "tran_fat", new BigDecimal("0.4"),
                "fiber", new BigDecimal("3.5"),
                "energy", new BigDecimal("717"),
                "unknown", BigDecimal.ONE
        ));
        assertEquals(0, out.get("trans_fat").compareTo(new BigDecimal("0.4")));
        assertEquals(0, out.get("fiber").compareTo(new BigDecimal("3.5")));
        assertFalse(out.containsKey("energy"));
        assertFalse(out.containsKey("unknown"));
        assertTrue(out.containsKey("trans_fat"));
    }

    @Test
    void portionConvertsToPer100() {
        assertEquals(0, FoodNutrients.portionGrams(new BigDecimal("170"), new BigDecimal("2")).compareTo(new BigDecimal("340")));
        assertEquals(0, FoodNutrients.portionGrams(new BigDecimal("100"), new BigDecimal("1.5")).compareTo(new BigDecimal("150.0")));
        assertEquals(0, FoodNutrients.toPer100(new BigDecimal("200"), new BigDecimal("340")).compareTo(new BigDecimal("58.82")));
    }

    @Test
    void fromUsdaMapsFatFiberSodiumAndVitaminPercent() {
        assertEquals(0, FoodNutrients.fromUsda("Fatty acids, total saturated", "g", new BigDecimal("3.2")).get("saturated_fat").compareTo(new BigDecimal("3.2")));
        assertEquals(0, FoodNutrients.fromUsda("Fiber, total dietary", "g", new BigDecimal("2.4")).get("fiber").compareTo(new BigDecimal("2.4")));
        assertEquals(0, FoodNutrients.fromUsda("Sodium, Na", "mg", new BigDecimal("120")).get("sodium").compareTo(new BigDecimal("120")));
        assertEquals(0, FoodNutrients.fromUsda("Vitamin C, total ascorbic acid", "mg", new BigDecimal("45")).get("vitamin_c").compareTo(new BigDecimal("50.0")));
        assertTrue(FoodNutrients.fromUsda("Energy", "kcal", new BigDecimal("200")).isEmpty());
        assertTrue(FoodNutrients.fromUsda("Vitamin A, IU", "IU", new BigDecimal("248")).isEmpty());
        assertEquals(0, FoodNutrients.fromUsda("Vitamin A, RAE", "UG", new BigDecimal("90")).get("vitamin_a").compareTo(new BigDecimal("10.0")));
    }

    @Test
    void fromOffConvertsSodiumGramsAndSkipsZeros() {
        Map<String, BigDecimal> out = FoodNutrients.fromOff(Map.of(
                "saturated-fat_100g", 4.5,
                "sodium_100g", 0.12,
                "fiber_100g", 0,
                "sugars_100g", 1.8
        ));
        assertEquals(0, out.get("saturated_fat").compareTo(BigDecimal.valueOf(4.5)));
        assertEquals(0, out.get("sodium").compareTo(new BigDecimal("120.00")));
        assertEquals(0, out.get("sugar").compareTo(BigDecimal.valueOf(1.8)));
        assertFalse(out.containsKey("fiber"));
    }

    @Test
    void scaleStoredMultipliesPortionMicros() {
        Map<String, Double> out = FoodNutrients.scaleStored(Map.of("fiber", 2.0, "sodium", 100.0), new BigDecimal("2.5"));
        assertEquals(5.0, out.get("fiber"));
        assertEquals(250.0, out.get("sodium"));
    }
}
