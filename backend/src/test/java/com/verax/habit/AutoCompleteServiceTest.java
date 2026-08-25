package com.verax.habit;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

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
}
