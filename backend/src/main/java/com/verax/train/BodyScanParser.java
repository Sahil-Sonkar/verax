package com.verax.train;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class BodyScanParser {

    private static final Pattern NUMBER = Pattern.compile("(\\d+(?:\\.\\d+)?)");
    private static final List<DateTimeFormatter> DATES = List.of(
            DateTimeFormatter.ofPattern("MMMM d, uuuu", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("d MMMM uuuu", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("MMM d, uuuu", Locale.ENGLISH),
            DateTimeFormatter.ISO_LOCAL_DATE
    );

    private static final List<Field> FIELDS = List.of(
            new Field("weightKg", List.of("weight"), "kg"),
            new Field("bmi", List.of("bmi"), null),
            new Field("bodyFatPct", List.of("body fat"), "%"),
            new Field("fatFreeKg", List.of("fat-free body weight", "fat free body weight", "fat-free weight", "fat free weight"), "kg"),
            new Field("subcutaneousFatPct", List.of("subcutaneous fat"), "%"),
            new Field("visceralFat", List.of("visceral fat"), null),
            new Field("bodyWaterPct", List.of("body water"), "%"),
            new Field("skeletalMusclePct", List.of("skeletal muscle"), "%"),
            new Field("muscleMassKg", List.of("muscle mass"), "kg"),
            new Field("muscleStorage", List.of("muscle storage ability level", "muscle storage", "ability level"), null),
            new Field("boneMassKg", List.of("bone mass"), "kg"),
            new Field("proteinPct", List.of("protein"), "%"),
            new Field("bmrKcal", List.of("bmr (basal metabolic rate)", "basal metabolic rate", "bmr"), "kcal"),
            new Field("metabolicAge", List.of("metabolic age"), null),
            new Field("waistCm", List.of("waist"), "cm"),
            new Field("chestCm", List.of("chest"), "cm"),
            new Field("leftBicepCm", List.of("left bicep"), "cm"),
            new Field("rightBicepCm", List.of("right bicep"), "cm"),
            new Field("hipsCm", List.of("hips", "hip"), "cm"),
            new Field("leftThighCm", List.of("left thigh"), "cm"),
            new Field("rightThighCm", List.of("right thigh"), "cm"),
            new Field("neckCm", List.of("neck"), "cm"),
            new Field("shouldersCm", List.of("shoulders", "shoulder"), "cm"),
            new Field("leftCalfCm", List.of("left calf"), "cm"),
            new Field("rightCalfCm", List.of("right calf"), "cm"),
            new Field("leftForearmCm", List.of("left forearm"), "cm"),
            new Field("rightForearmCm", List.of("right forearm"), "cm"),
            new Field("heightCm", List.of("height"), "cm")
    );

    private BodyScanParser() {
    }

    public static Result parse(String raw) {
        String text = raw == null ? "" : raw.replace('\u00a0', ' ');
        String compact = text.replaceAll("(?i)(standard met|standard|adequate|good|high|low|normal)", " ");
        String folded = compact.toLowerCase(Locale.ENGLISH).replaceAll("\\s+", " ").trim();
        Map<String, BigDecimal> values = new LinkedHashMap<>();
        for (Field field : FIELDS) {
            BigDecimal value = find(folded, field);
            if (value != null) {
                values.put(field.key(), value);
            }
        }
        fillMissing(values, folded);
        return new Result(parseDate(text), values);
    }

    private static BigDecimal find(String folded, Field field) {
        for (String label : field.labels()) {
            int from = 0;
            while (true) {
                int index = folded.indexOf(label, from);
                if (index < 0) {
                    break;
                }
                if ("weight".equals(label) && index > 0) {
                    String before = folded.substring(Math.max(0, index - 12), index);
                    if (before.contains("free") || before.contains("body")) {
                        from = index + label.length();
                        continue;
                    }
                }
                String rest = folded.substring(index + label.length());
                Matcher matcher = NUMBER.matcher(rest);
                if (matcher.find()) {
                    try {
                        return new BigDecimal(matcher.group(1));
                    } catch (NumberFormatException ignored) {
                        return null;
                    }
                }
                from = index + label.length();
            }
        }
        return null;
    }

    static void fillMissing(Map<String, BigDecimal> values, String folded) {
        BigDecimal protein = values.get("proteinPct");
        if (protein != null && protein.compareTo(new BigDecimal("40")) > 0 && protein.compareTo(new BigDecimal("400")) < 0) {
            values.put("proteinPct", protein.divide(BigDecimal.TEN, 1, RoundingMode.HALF_UP));
        }
        if (values.get("fatFreeKg") == null) {
            BigDecimal weight = values.get("weightKg");
            BigDecimal fat = values.get("bodyFatPct");
            if (weight != null && fat != null) {
                BigDecimal expected = weight.multiply(BigDecimal.ONE.subtract(fat.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)));
                for (BigDecimal kg : numbersNear(folded, "kg")) {
                    if (same(kg, weight) || same(kg, values.get("muscleMassKg")) || same(kg, values.get("boneMassKg"))) {
                        continue;
                    }
                    if (kg.subtract(expected).abs().compareTo(new BigDecimal("2.5")) <= 0) {
                        values.put("fatFreeKg", kg);
                        break;
                    }
                }
            }
        }
    }

    private static List<BigDecimal> numbersNear(String folded, String unit) {
        List<BigDecimal> found = new ArrayList<>();
        Matcher matcher = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*" + Pattern.quote(unit)).matcher(folded);
        while (matcher.find()) {
            found.add(new BigDecimal(matcher.group(1)));
        }
        return found;
    }

    private static boolean same(BigDecimal left, BigDecimal right) {
        return left != null && right != null && left.compareTo(right) == 0;
    }

    static LocalDate parseDate(String text) {
        Matcher iso = Pattern.compile("(20\\d{2}-\\d{2}-\\d{2})").matcher(text);
        if (iso.find()) {
            return LocalDate.parse(iso.group(1));
        }
        Matcher words = Pattern.compile(
                "(January|February|March|April|May|June|July|August|September|October|November|December)\\s+(\\d{1,2}),?\\s+(20\\d{2})",
                Pattern.CASE_INSENSITIVE
        ).matcher(text);
        if (words.find()) {
            String stamp = words.group(1) + " " + words.group(2) + ", " + words.group(3);
            for (DateTimeFormatter formatter : DATES) {
                try {
                    return LocalDate.parse(stamp, formatter);
                } catch (DateTimeParseException ignored) {
                    // try next
                }
            }
        }
        return null;
    }

    public record Result(LocalDate date, Map<String, BigDecimal> values) {
        public BigDecimal get(String key) {
            return values.get(key);
        }
    }

    private record Field(String key, List<String> labels, String unit) {
    }
}
