package com.verax.recipe;

import com.verax.config.VeraxProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class FoodSearchService {

    private static final Logger log = LoggerFactory.getLogger(FoodSearchService.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP = new ParameterizedTypeReference<>() {
    };

    private final RestClient http = RestClient.builder()
            .defaultHeader("User-Agent", "Verax/0.1 (personal nutrition tracker)")
            .build();
    private final VeraxProperties properties;

    public FoodSearchService(VeraxProperties properties) {
        this.properties = properties;
    }

    public List<RecipeDtos.FoodHit> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String q = query.trim();
        List<RecipeDtos.FoodHit> hits = new ArrayList<>();
        hits.addAll(usda(q));
        if (hits.size() < 6) {
            hits.addAll(openFoodFacts(q));
        }
        return hits.stream().limit(12).toList();
    }

    @SuppressWarnings("unchecked")
    private List<RecipeDtos.FoodHit> usda(String query) {
        try {
            String key = properties.getUsdaApiKey();
            String url = "https://api.nal.usda.gov/fdc/v1/foods/search?query="
                    + enc(query) + "&pageSize=8&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)&api_key=" + enc(key);
            Map<String, Object> body = http.get().uri(url).retrieve().body(MAP);
            if (body == null) {
                return List.of();
            }
            Object raw = body.get("foods");
            if (!(raw instanceof List<?> foods)) {
                return List.of();
            }
            List<RecipeDtos.FoodHit> hits = new ArrayList<>();
            for (Object row : foods) {
                if (!(row instanceof Map<?, ?> food)) {
                    continue;
                }
                Map<String, Object> map = (Map<String, Object>) food;
                RecipeDtos.FoodHit hit = fromUsda(map);
                if (hit != null) {
                    hits.add(hit);
                }
            }
            return hits;
        } catch (Exception ex) {
            log.info("USDA search failed: {}", ex.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private RecipeDtos.FoodHit fromUsda(Map<String, Object> food) {
        String name = str(food.get("description"));
        if (name.isBlank()) {
            return null;
        }
        Object nutrients = food.get("foodNutrients");
        BigDecimal kcal = BigDecimal.ZERO;
        BigDecimal protein = BigDecimal.ZERO;
        BigDecimal carbs = BigDecimal.ZERO;
        BigDecimal fat = BigDecimal.ZERO;
        if (nutrients instanceof List<?> list) {
            for (Object row : list) {
                if (!(row instanceof Map<?, ?> nutrient)) {
                    continue;
                }
                Map<String, Object> n = (Map<String, Object>) nutrient;
                String label = str(n.get("nutrientName")).toLowerCase(Locale.ROOT);
                String unit = str(n.get("unitName")).toLowerCase(Locale.ROOT);
                BigDecimal value = decimal(n.get("value"));
                if (label.startsWith("energy") && unit.contains("kcal")) {
                    kcal = value;
                } else if (label.equals("protein")) {
                    protein = value;
                } else if (label.startsWith("carbohydrate")) {
                    carbs = value;
                } else if (label.startsWith("total lipid")) {
                    fat = value;
                }
            }
        }
        return new RecipeDtos.FoodHit(
                String.valueOf(food.get("fdcId")),
                "USDA",
                name,
                str(food.get("brandOwner")),
                kcal,
                protein,
                carbs,
                fat,
                "100g",
                servingsFromUsda(food)
        );
    }

    @SuppressWarnings("unchecked")
    private List<RecipeDtos.FoodHit> openFoodFacts(String query) {
        try {
            String url = "https://world.openfoodfacts.org/cgi/search.pl?search_terms="
                    + enc(query) + "&search_simple=1&action=process&json=1&page_size=8";
            Map<String, Object> body = http.get().uri(url).retrieve().body(MAP);
            if (body == null) {
                return List.of();
            }
            Object raw = body.get("products");
            if (!(raw instanceof List<?> products)) {
                return List.of();
            }
            List<RecipeDtos.FoodHit> hits = new ArrayList<>();
            for (Object row : products) {
                if (!(row instanceof Map<?, ?> product)) {
                    continue;
                }
                Map<String, Object> map = (Map<String, Object>) product;
                String name = first(str(map.get("product_name")), str(map.get("generic_name")));
                if (name.isBlank()) {
                    continue;
                }
                Map<String, Object> nutriments = map.get("nutriments") instanceof Map<?, ?> n
                        ? (Map<String, Object>) n
                        : new LinkedHashMap<>();
                hits.add(new RecipeDtos.FoodHit(
                        str(map.get("code")),
                        "OFF",
                        name,
                        str(map.get("brands")),
                        decimal(first(nutriments.get("energy-kcal_100g"), nutriments.get("energy-kcal"))),
                        decimal(nutriments.get("proteins_100g")),
                        decimal(nutriments.get("carbohydrates_100g")),
                        decimal(nutriments.get("fat_100g")),
                        "100g",
                        servingsFromOff(map)
                ));
            }
            return hits;
        } catch (Exception ex) {
            log.info("Open Food Facts search failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<RecipeDtos.ServingOption> servingsFromUsda(Map<String, Object> food) {
        List<RecipeDtos.ServingOption> extra = new ArrayList<>();
        BigDecimal size = decimal(food.get("servingSize"));
        String unit = normalizeUnit(str(food.get("servingSizeUnit")));
        String household = str(food.get("householdServingFullText"));
        if (size.signum() > 0 && unit != null) {
            String label = household.isBlank()
                    ? size.stripTrailingZeros().toPlainString() + " " + unit
                    : household;
            extra.add(new RecipeDtos.ServingOption(label, size, unit));
        }
        Object portions = food.get("foodPortions");
        if (portions instanceof List<?> list) {
            for (Object row : list) {
                if (!(row instanceof Map<?, ?> portion)) {
                    continue;
                }
                BigDecimal grams = decimal(portion.get("gramWeight"));
                if (grams.signum() <= 0) {
                    continue;
                }
                String label = str(portion.get("portionDescription"));
                if (label.isBlank()) {
                    Object measure = portion.get("measureUnit");
                    if (measure instanceof Map<?, ?> unitMap) {
                        label = str(unitMap.get("name"));
                    }
                }
                if (label.isBlank()) {
                    label = grams.stripTrailingZeros().toPlainString() + " g";
                }
                extra.add(new RecipeDtos.ServingOption(label, grams, "g"));
            }
        }
        return withDefaultServings(extra);
    }

    private List<RecipeDtos.ServingOption> servingsFromOff(Map<String, Object> product) {
        List<RecipeDtos.ServingOption> extra = new ArrayList<>();
        String servingSize = str(product.get("serving_size"));
        RecipeDtos.ServingOption parsed = parseServing(servingSize);
        if (parsed != null) {
            extra.add(parsed);
        }
        return withDefaultServings(extra);
    }

    static RecipeDtos.ServingOption parseServing(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        java.util.regex.Matcher match = java.util.regex.Pattern
                .compile("([0-9]+(?:[.,][0-9]+)?)\\s*(ml|g|gr|gram|grams|l)\\b", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(raw);
        if (!match.find()) {
            return null;
        }
        BigDecimal amount = decimal(match.group(1).replace(',', '.'));
        if (amount.signum() <= 0) {
            return null;
        }
        String rawUnit = match.group(2);
        if ("l".equalsIgnoreCase(rawUnit)) {
            return new RecipeDtos.ServingOption(raw.trim(), amount.multiply(BigDecimal.valueOf(1000)), "ml");
        }
        String unit = normalizeUnit(rawUnit);
        if (unit == null) {
            return null;
        }
        return new RecipeDtos.ServingOption(raw.trim(), amount, unit);
    }

    private static String normalizeUnit(String unit) {
        String key = unit == null ? "" : unit.trim().toLowerCase(Locale.ROOT);
        if (key.equals("g") || key.equals("gr") || key.equals("gram") || key.equals("grams") || key.equals("grm")) {
            return "g";
        }
        if (key.equals("ml") || key.equals("milliliter") || key.equals("millilitre")) {
            return "ml";
        }
        return null;
    }

    private static List<RecipeDtos.ServingOption> withDefaultServings(List<RecipeDtos.ServingOption> extra) {
        List<RecipeDtos.ServingOption> defaults = List.of(
                new RecipeDtos.ServingOption("100 g", BigDecimal.valueOf(100), "g"),
                new RecipeDtos.ServingOption("1 g", BigDecimal.ONE, "g"),
                new RecipeDtos.ServingOption("100 ml", BigDecimal.valueOf(100), "ml"),
                new RecipeDtos.ServingOption("250 ml", BigDecimal.valueOf(250), "ml")
        );
        LinkedHashMap<String, RecipeDtos.ServingOption> unique = new LinkedHashMap<>();
        for (RecipeDtos.ServingOption option : extra) {
            unique.put(option.amount() + option.unit(), option);
        }
        for (RecipeDtos.ServingOption option : defaults) {
            unique.putIfAbsent(option.amount() + option.unit(), option);
        }
        return unique.values().stream().limit(8).toList();
    }

    public static RecipeDtos.Macros scale(RecipeDtos.FoodHit per100, BigDecimal grams) {
        BigDecimal g = grams == null || grams.signum() <= 0 ? BigDecimal.valueOf(100) : grams;
        BigDecimal factor = g.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        return RecipeDtos.Macros.of(
                n(per100.kcal()).multiply(factor).setScale(1, RoundingMode.HALF_UP),
                n(per100.protein()).multiply(factor).setScale(1, RoundingMode.HALF_UP),
                n(per100.carbs()).multiply(factor).setScale(1, RoundingMode.HALF_UP),
                n(per100.fat()).multiply(factor).setScale(1, RoundingMode.HALF_UP)
        );
    }

    private static BigDecimal n(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static String enc(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String first(String a, String b) {
        return a == null || a.isBlank() ? (b == null ? "" : b) : a;
    }

    private static Object first(Object a, Object b) {
        return a != null ? a : b;
    }

    private static BigDecimal decimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue()).setScale(2, RoundingMode.HALF_UP);
        }
        try {
            return new BigDecimal(String.valueOf(value)).setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            return BigDecimal.ZERO;
        }
    }
}
