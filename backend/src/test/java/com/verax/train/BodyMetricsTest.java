package com.verax.train;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class BodyMetricsTest {

    @Test
    void icmrNin2020MaleAdult() {
        assertEquals(new BigDecimal("1573"), BodyMetrics.bmr(new BigDecimal("70.10"), new BigDecimal("167"), 29, "MALE"));
        assertEquals(new BigDecimal("2674"), BodyMetrics.tdee(new BigDecimal("1573"), "MODERATE"));
        assertEquals(new BigDecimal("1.40"), BodyMetrics.factor("SEDENTARY"));
        assertEquals(new BigDecimal("1.70"), BodyMetrics.factor("MODERATE"));
        assertEquals(new BigDecimal("2.00"), BodyMetrics.factor("VERY_ACTIVE"));
    }

    @Test
    void icmrNin2020FemaleAdult() {
        assertEquals(new BigDecimal("1184"), BodyMetrics.bmr(new BigDecimal("55"), null, 25, "FEMALE"));
        assertEquals(new BigDecimal("2013"), BodyMetrics.tdee(new BigDecimal("1184"), "MODERATE"));
    }

    @Test
    void olderMaleUsesThirtyToSixtyBand() {
        assertEquals(new BigDecimal("1509"), BodyMetrics.bmr(new BigDecimal("70"), null, 45, "MALE"));
    }

    @Test
    void bmiStillNeedsHeight() {
        assertEquals(new BigDecimal("25.1"), BodyMetrics.bmi(new BigDecimal("70.10"), new BigDecimal("167.2")));
        assertNull(BodyMetrics.bmi(new BigDecimal("70"), null));
        assertNull(BodyMetrics.bmr(null, new BigDecimal("167"), 29, "MALE"));
    }
}
