package com.verax.analytics;

import com.verax.completion.CompletionStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AnalyticsServiceTest {

    @Test
    void quarterStartIsFirstMonthOfQuarter() {
        assertEquals(LocalDate.of(2026, 7, 1), AnalyticsService.quarterStart(LocalDate.of(2026, 9, 3)));
        assertEquals(LocalDate.of(2026, 1, 1), AnalyticsService.quarterStart(LocalDate.of(2026, 2, 14)));
        assertEquals(4, AnalyticsService.quarterNumber(LocalDate.of(2026, 12, 1)));
    }

    @Test
    void trackerScoresDoneHalfAndSkip() {
        assertEquals(1.0, AnalyticsService.trackerEarned(CompletionStatus.COMPLETED));
        assertEquals(0.5, AnalyticsService.trackerEarned(CompletionStatus.PARTIAL));
        assertEquals(0.0, AnalyticsService.trackerEarned(CompletionStatus.SKIPPED));
        assertEquals(0.0, AnalyticsService.trackerEarned(CompletionStatus.MISSED));
        assertEquals(0.0, AnalyticsService.trackerEarned(null));
    }

    @Test
    void trackerLevelIsDarkestOnlyWhenEveryHabitIsDone() {
        assertEquals(5, AnalyticsService.trackerLevel(7, 7));
        assertEquals(4, AnalyticsService.trackerLevel(6.5, 7));
        assertEquals(2, AnalyticsService.trackerLevel(3.5, 7));
        assertEquals(0, AnalyticsService.trackerLevel(0, 7));
        assertEquals(0, AnalyticsService.trackerLevel(3, 0));
    }
}
