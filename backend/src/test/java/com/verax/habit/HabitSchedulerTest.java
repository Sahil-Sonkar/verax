package com.verax.habit;

import com.verax.completion.CompletionStatus;
import com.verax.completion.HabitCompletion;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HabitSchedulerTest {

    @Test
    void weekdayHabitIsDueOnlyOnConfiguredDays() {
        Habit toastmasters = habit(FrequencyType.WEEKDAYS, FrequencyConfig.weekdays(6));
        toastmasters.setStartDate(LocalDate.of(2026, 8, 1));
        LocalDate saturday = LocalDate.of(2026, 8, 22);
        LocalDate sunday = LocalDate.of(2026, 8, 23);
        assertTrue(HabitScheduler.isDue(toastmasters, saturday, Map.of()));
        assertFalse(HabitScheduler.isDue(toastmasters, sunday, Map.of()));
    }

    @Test
    void weeklyHabitIsNotDueAfterTargetIsMet() {
        Habit boxing = habit(FrequencyType.WEEKLY, FrequencyConfig.timesPerPeriod(3));
        boxing.setStartDate(LocalDate.of(2026, 8, 1));
        LocalDate thursday = LocalDate.of(2026, 8, 20);
        List<HabitCompletion> done = List.of(
                completion(boxing, LocalDate.of(2026, 8, 17), CompletionStatus.COMPLETED),
                completion(boxing, LocalDate.of(2026, 8, 19), CompletionStatus.COMPLETED),
                completion(boxing, LocalDate.of(2026, 8, 18), CompletionStatus.COMPLETED)
        );
        assertFalse(HabitScheduler.isDue(boxing, thursday, Map.of(boxing.getId(), done)));
    }

    @Test
    void weeklyHabitBecomesDueWhenRemainingDaysEqualRemainingSessions() {
        Habit youtube = habit(FrequencyType.WEEKLY, FrequencyConfig.timesPerPeriod(1));
        youtube.setStartDate(LocalDate.of(2026, 8, 1));
        LocalDate sunday = LocalDate.of(2026, 8, 23);
        assertTrue(HabitScheduler.isDue(youtube, sunday, Map.of()));
    }

    private Habit habit(FrequencyType type, FrequencyConfig config) {
        Habit habit = new Habit();
        habit.setId(UUID.randomUUID());
        habit.setFrequencyType(type);
        habit.setFrequencyConfig(config);
        habit.setActive(true);
        return habit;
    }

    private HabitCompletion completion(Habit habit, LocalDate date, CompletionStatus status) {
        HabitCompletion completion = new HabitCompletion();
        completion.setHabit(habit);
        completion.setDate(date);
        completion.setStatus(status);
        return completion;
    }
}
