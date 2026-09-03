package com.verax.recipe;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class FoodNutrients {

    static final Set<String> KEYS = Set.of(
            "saturated_fat",
            "polyunsaturated_fat",
            "monounsaturated_fat",
            "trans_fat",
            "cholesterol",
            "sodium",
            "potassium",
            "fiber",
            "sugar",
            "vitamin_a",
            "vitamin_c",
            "calcium",
            "iron"
    );

    private static final Map<String, String> ALIAS = Map.of("tran_fat", "trans_fat");

    private FoodNutrients() {
    }

    static Map<String, BigDecimal> fromUsda(String label, String unit, BigDecimal value) {
        if (value == null || value.signum() == 0 || label == null || label.isBlank()) {
            return Map.of();
        }
        String name = label.toLowerCase(Locale.ROOT);
        String measure = unit == null ? "" : unit.toLowerCase(Locale.ROOT);
        Map<String, BigDecimal> out = new LinkedHashMap<>();
        if (name.contains("fatty acids") && name.contains("saturated")) {
            out.put("saturated_fat", value);
        } else if (name.contains("fatty acids") && name.contains("polyunsaturated")) {
            out.put("polyunsaturated_fat", value);
        } else if (name.contains("fatty acids") && name.contains("monounsaturated")) {
            out.put("monounsaturated_fat", value);
        } else if (name.contains("fatty acids") && name.contains("trans")) {
            out.put("trans_fat", value);
        } else if (name.startsWith("cholesterol")) {
            out.put("cholesterol", value);
        } else if (name.startsWith("sodium")) {
            out.put("sodium", value);
        } else if (name.startsWith("potassium")) {
            out.put("potassium", value);
        } else if (name.contains("fiber")) {
            out.put("fiber", value);
        } else if (name.contains("sugar")) {
            out.put("sugar", value);
        } else if (name.startsWith("vitamin a") && !measure.contains("iu") && !name.contains("iu")) {
            out.put("vitamin_a", toDailyPercent(value, measure, new BigDecimal("900")));
        } else if (name.startsWith("vitamin c")) {
            out.put("vitamin_c", toDailyPercent(value, measure, new BigDecimal("90")));
        } else if (name.startsWith("calcium")) {
            out.put("calcium", toDailyPercent(value, measure, new BigDecimal("1300")));
        } else if (name.startsWith("iron")) {
            out.put("iron", toDailyPercent(value, measure, new BigDecimal("18")));
        }
        return compact(out);
    }

    static Map<String, BigDecimal> fromOff(Map<String, Object> nutriments) {
        if (nutriments == null || nutriments.isEmpty()) {
            return Map.of();
        }
        Map<String, BigDecimal> raw = new LinkedHashMap<>();
        put(raw, "saturated_fat", decimal(nutriments.get("saturated-fat_100g")));
        put(raw, "polyunsaturated_fat", decimal(nutriments.get("polyunsaturated-fat_100g")));
        put(raw, "monounsaturated_fat", decimal(nutriments.get("monounsaturated-fat_100g")));
        put(raw, "trans_fat", decimal(first(nutriments.get("trans-fat_100g"), nutriments.get("trans-fats_100g"))));
        put(raw, "cholesterol", decimal(nutriments.get("cholesterol_100g")));
        put(raw, "sodium", gramsToMg(decimal(nutriments.get("sodium_100g"))));
        put(raw, "potassium", decimal(nutriments.get("potassium_100g")));
        put(raw, "fiber", decimal(nutriments.get("fiber_100g")));
        put(raw, "sugar", decimal(first(nutriments.get("sugars_100g"), nutriments.get("sugar_100g"))));
        put(raw, "vitamin_a", toDailyPercent(decimal(nutriments.get("vitamin-a_100g")), "ug", new BigDecimal("900")));
        put(raw, "vitamin_c", toDailyPercent(decimal(nutriments.get("vitamin-c_100g")), "mg", new BigDecimal("90")));
        put(raw, "calcium", toDailyPercent(decimal(nutriments.get("calcium_100g")), "mg", new BigDecimal("1300")));
        put(raw, "iron", toDailyPercent(decimal(nutriments.get("iron_100g")), "mg", new BigDecimal("18")));
        return compact(raw);
    }

    private static void put(Map<String, BigDecimal> out, String key, BigDecimal value) {
        if (value != null && value.signum() != 0) {
            out.put(key, value);
        }
    }

    private static BigDecimal toDailyPercent(BigDecimal value, String unit, BigDecimal daily) {
        if (value == null || value.signum() == 0 || daily.signum() == 0) {
            return BigDecimal.ZERO;
        }
        String measure = unit == null ? "" : unit.toLowerCase(Locale.ROOT);
        if (measure.contains("%")) {
            return value;
        }
        return value.multiply(BigDecimal.valueOf(100)).divide(daily, 1, RoundingMode.HALF_UP);
    }

    private static BigDecimal gramsToMg(BigDecimal grams) {
        if (grams == null || grams.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return grams.multiply(BigDecimal.valueOf(1000));
    }

    private static Object first(Object a, Object b) {
        return a != null ? a : b;
    }

    private static BigDecimal decimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    static Map<String, BigDecimal> compact(Map<String, BigDecimal> raw) {
        if (raw == null || raw.isEmpty()) {
            return Map.of();
        }
        Map<String, BigDecimal> out = new LinkedHashMap<>();
        for (Map.Entry<String, BigDecimal> entry : raw.entrySet()) {
            if (entry.getKey() == null || entry.getValue() == null) {
                continue;
            }
            String key = ALIAS.getOrDefault(
                    entry.getKey().trim().toLowerCase(Locale.ROOT),
                    entry.getKey().trim().toLowerCase(Locale.ROOT)
            );
            if (!KEYS.contains(key)) {
                continue;
            }
            out.put(key, entry.getValue());
        }
        return Map.copyOf(out);
    }

    static Map<String, Double> toStored(Map<String, BigDecimal> micros) {
        if (micros == null || micros.isEmpty()) {
            return Map.of();
        }
        Map<String, Double> out = new LinkedHashMap<>();
        micros.forEach((key, value) -> out.put(key, value.doubleValue()));
        return out;
    }

    static Map<String, BigDecimal> fromStored(Map<String, Double> micros) {
        if (micros == null || micros.isEmpty()) {
            return Map.of();
        }
        Map<String, BigDecimal> out = new LinkedHashMap<>();
        micros.forEach((key, value) -> {
            if (value != null) {
                out.put(key, BigDecimal.valueOf(value));
            }
        });
        return out;
    }

    static BigDecimal portionGrams(BigDecimal servingAmount, BigDecimal servings) {
        BigDecimal amount = servingAmount == null || servingAmount.signum() <= 0
                ? BigDecimal.valueOf(100)
                : servingAmount;
        BigDecimal count = servings == null || servings.signum() <= 0 ? BigDecimal.ONE : servings;
        return amount.multiply(count);
    }

    static BigDecimal toPer100(BigDecimal value, BigDecimal grams) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (grams == null || grams.signum() <= 0) {
            return value;
        }
        return value.multiply(BigDecimal.valueOf(100)).divide(grams, 2, RoundingMode.HALF_UP);
    }

    static Map<String, BigDecimal> scale(Map<String, BigDecimal> micros, BigDecimal factor) {
        if (micros == null || micros.isEmpty()) {
            return Map.of();
        }
        Map<String, BigDecimal> out = new LinkedHashMap<>();
        micros.forEach((key, value) -> out.put(
                key,
                value.multiply(factor).setScale(2, RoundingMode.HALF_UP)
        ));
        return out;
    }

    static Map<String, Double> scaleStored(Map<String, Double> micros, BigDecimal factor) {
        return toStored(scale(fromStored(micros), factor));
    }
}
