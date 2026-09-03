package com.verax.habit;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AutoCompleteServiceTest {

    @Test
    void meetsThresholdCountsAsCompleted() {
        assertEquals(
                com.verax.completion.CompletionStatus.COMPLETED,
                AutoCompleteService.statusFor(new BigDecimal("8000"), new BigDecimal("8000"))
        );
    }

    @Test
    void halfThresholdCountsAsPartial() {
        assertEquals(
                com.verax.completion.CompletionStatus.PARTIAL,
                AutoCompleteService.statusFor(new BigDecimal("4000"), new BigDecimal("8000"))
        );
    }

    @Test
    void belowHalfDoesNotAutoComplete() {
        assertNull(AutoCompleteService.statusFor(new BigDecimal("1000"), new BigDecimal("8000")));
    }

    @Test
    void nameMatchesPipeNeedles() {
        assertTrue(AutoCompleteService.nameMatches("Sleep 7.5–8 hours", "sleep"));
        assertTrue(AutoCompleteService.nameMatches("Exercise", "exercise|workout"));
        assertTrue(AutoCompleteService.nameMatches("Workout 45 mins", "exercise|workout"));
        assertFalse(AutoCompleteService.nameMatches("Boxing", "exercise|workout"));
        assertTrue(AutoCompleteService.nameMatches("Meditation", "meditat"));
    }

    @Test
    void sessionUnitUsesFallbackThreshold() {
        Habit habit = new Habit();
        habit.setUnit("session");
        habit.setTargetValue(BigDecimal.ONE);
        assertEquals(0, AutoCompleteService.thresholdFor(habit, BigDecimal.valueOf(45)).compareTo(BigDecimal.valueOf(45)));
    }

    @Test
    void targetValueUsedWhenNotSession() {
        Habit habit = new Habit();
        habit.setUnit("hours");
        habit.setTargetValue(BigDecimal.valueOf(8));
        assertEquals(0, AutoCompleteService.thresholdFor(habit, BigDecimal.valueOf(7)).compareTo(BigDecimal.valueOf(8)));
    }
}
