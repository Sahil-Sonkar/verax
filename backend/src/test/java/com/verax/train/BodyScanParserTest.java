package com.verax.train;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class BodyScanParserTest {

    private static final String SCALE = """
            August 27, 2026
            Weight 70.10kg High
            BMI 25.1 High
            Body Fat 18.3% Standard
            Fat-free Body Weight 57.20kg Standard Met
            Subcutaneous Fat 15.9% Standard
            Visceral Fat 7 Standard
            Body Water 58.9% Standard
            Skeletal Muscle 52.7% Standard
            Muscle Mass 54.40kg Adequate
            Muscle storage ability level 5 Good
            Bone Mass 2.86kg Standard
            Protein 18.7% Adequate
            BMR (Basal Metabolic Rate) 1607Kcal Standard Met
            Metabolic Age 29 Standard Met
            """;

    @Test
    void readsScaleScreenshot() {
        BodyScanParser.Result result = BodyScanParser.parse(SCALE);
        assertEquals("2026-08-27", result.date().toString());
        assertEquals(new BigDecimal("70.10"), result.get("weightKg"));
        assertEquals(new BigDecimal("25.1"), result.get("bmi"));
        assertEquals(new BigDecimal("18.3"), result.get("bodyFatPct"));
        assertEquals(new BigDecimal("57.20"), result.get("fatFreeKg"));
        assertEquals(new BigDecimal("15.9"), result.get("subcutaneousFatPct"));
        assertEquals(new BigDecimal("7"), result.get("visceralFat"));
        assertEquals(new BigDecimal("58.9"), result.get("bodyWaterPct"));
        assertEquals(new BigDecimal("52.7"), result.get("skeletalMusclePct"));
        assertEquals(new BigDecimal("54.40"), result.get("muscleMassKg"));
        assertEquals(new BigDecimal("5"), result.get("muscleStorage"));
        assertEquals(new BigDecimal("2.86"), result.get("boneMassKg"));
        assertEquals(new BigDecimal("18.7"), result.get("proteinPct"));
        assertEquals(new BigDecimal("1607"), result.get("bmrKcal"));
        assertEquals(new BigDecimal("29"), result.get("metabolicAge"));
    }

    @Test
    void recoversGarbledScaleOcr() {
        String noisy = """
                Weight 70.10kg
                BMI 25.1
                Body Fat 18.3%
                ay Waihi Rrekg
                Subcutaneous Fat 15.9%
                Visceral Fat 7
                Body Water 58.9%
                Skeletal Muscle 52.7%
                Muscle Mass 54.40kg
                Bone Mass 2.86kg
                Protein 187%
                BMR 1607Kcal
                Metabolic Age 29
                57.20kg Standard Met
                """;
        BodyScanParser.Result result = BodyScanParser.parse(noisy);
        assertEquals(new BigDecimal("70.10"), result.get("weightKg"));
        assertEquals(new BigDecimal("57.20"), result.get("fatFreeKg"));
        assertEquals(new BigDecimal("18.7"), result.get("proteinPct"));
        assertEquals(new BigDecimal("1607"), result.get("bmrKcal"));
        assertEquals(new BigDecimal("29"), result.get("metabolicAge"));
    }

    @Test
    void bmiAndTdee() {
        assertEquals(new BigDecimal("25.1"), BodyMetrics.bmi(new BigDecimal("70.10"), new BigDecimal("167.2")));
        assertEquals(new BigDecimal("1573"), BodyMetrics.bmr(new BigDecimal("70.10"), new BigDecimal("167"), 29, "MALE"));
        assertEquals(new BigDecimal("2674"), BodyMetrics.tdee(new BigDecimal("1573"), "MODERATE"));
        assertNull(BodyMetrics.bmi(new BigDecimal("70"), null));
        assertEquals(new BigDecimal("421"), BodyMetrics.workoutKcal(new BigDecimal("70.1"), 3600, "STRENGTH"));
        assertEquals(new BigDecimal("374"), BodyMetrics.workoutKcal(new BigDecimal("70.1"), 2400, "RUNNING"));
        assertNull(BodyMetrics.workoutKcal(new BigDecimal("70"), 0, "STRENGTH"));
    }
}
