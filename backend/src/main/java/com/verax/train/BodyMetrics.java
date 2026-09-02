package com.verax.train;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class BodyMetrics {

    private static final BigDecimal MALE_INDIAN = new BigDecimal("0.90");
    private static final BigDecimal FEMALE_INDIAN = new BigDecimal("0.91");

    private BodyMetrics() {
    }

    public static BigDecimal bmi(BigDecimal kg, BigDecimal heightCm) {
        if (kg == null || heightCm == null || heightCm.signum() <= 0) {
            return null;
        }
        BigDecimal meters = heightCm.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        return kg.divide(meters.multiply(meters), 1, RoundingMode.HALF_UP);
    }

    /**
     * ICMR-NIN 2020: FAO/WHO/UNU 2004 (Schofield) BMR, then −10% men / −9% women for Indian adults.
     * Height is unused; kept so existing call sites stay the same.
     */
    public static BigDecimal bmr(BigDecimal kg, BigDecimal heightCm, Integer age, String sex) {
        if (kg == null || kg.signum() <= 0 || age == null || age <= 0) {
            return null;
        }
        boolean female = sex != null && sex.toUpperCase().startsWith("F");
        BigDecimal fao = faoBmr(kg, age, female);
        if (age >= 18) {
            fao = fao.multiply(female ? FEMALE_INDIAN : MALE_INDIAN);
        }
        return fao.setScale(0, RoundingMode.HALF_UP);
    }

    public static BigDecimal tdee(BigDecimal bmr, String activity) {
        if (bmr == null) {
            return null;
        }
        return bmr.multiply(factor(activity)).setScale(0, RoundingMode.HALF_UP);
    }

    public static BigDecimal workoutKcal(BigDecimal kg, Integer durationSec, String kind) {
        if (kg == null || kg.signum() <= 0 || durationSec == null || durationSec <= 0) {
            return null;
        }
        BigDecimal hours = BigDecimal.valueOf(durationSec).divide(BigDecimal.valueOf(3600), 6, RoundingMode.HALF_UP);
        return kg.multiply(met(kind)).multiply(hours).setScale(0, RoundingMode.HALF_UP);
    }

    static BigDecimal met(String kind) {
        String key = kind == null ? "" : kind.trim().toUpperCase();
        if (key.contains("RUN") || key.contains("CYCLE") || key.contains("BIKE") || key.contains("SWIM")
                || key.contains("HIIT") || key.contains("ROW") || key.contains("CARDIO")) {
            return new BigDecimal("8");
        }
        if (key.contains("WALK") || key.contains("HIKE") || key.contains("YOGA")) {
            return new BigDecimal("4");
        }
        return new BigDecimal("6");
    }

    /**
     * ICMR-NIN 2020 uses the lower end of FAO/WHO/UNU 2004 PAL bands.
     */
    public static BigDecimal factor(String activity) {
        String key = activity == null ? "MODERATE" : activity.trim().toUpperCase();
        return switch (key) {
            case "SEDENTARY" -> new BigDecimal("1.40");
            case "LIGHT" -> new BigDecimal("1.53");
            case "ACTIVE" -> new BigDecimal("1.85");
            case "VERY_ACTIVE" -> new BigDecimal("2.00");
            default -> new BigDecimal("1.70");
        };
    }

    private static BigDecimal faoBmr(BigDecimal kg, int age, boolean female) {
        BigDecimal slope;
        BigDecimal intercept;
        if (age < 10) {
            slope = female ? new BigDecimal("20.315") : new BigDecimal("22.706");
            intercept = female ? new BigDecimal("485.9") : new BigDecimal("504.3");
        } else if (age < 18) {
            slope = female ? new BigDecimal("13.384") : new BigDecimal("17.686");
            intercept = female ? new BigDecimal("692.6") : new BigDecimal("658.2");
        } else if (age < 30) {
            slope = female ? new BigDecimal("14.818") : new BigDecimal("15.057");
            intercept = female ? new BigDecimal("486.6") : new BigDecimal("692.2");
        } else if (age < 60) {
            slope = female ? new BigDecimal("8.126") : new BigDecimal("11.472");
            intercept = female ? new BigDecimal("845.6") : new BigDecimal("873.1");
        } else {
            slope = female ? new BigDecimal("9.082") : new BigDecimal("11.711");
            intercept = female ? new BigDecimal("658.5") : new BigDecimal("587.7");
        }
        return kg.multiply(slope).add(intercept);
    }
}
