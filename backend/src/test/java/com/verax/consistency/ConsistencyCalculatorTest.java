package com.verax.consistency;

import com.verax.completion.CompletionStatus;
import com.verax.completion.HabitCompletion;
import com.verax.habit.FrequencyConfig;
import com.verax.habit.FrequencyType;
import com.verax.habit.Habit;
import com.verax.habit.HabitSection;
import com.verax.habit.Importance;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConsistencyCalculatorTest {

    private final LocalDate today = LocalDate.of(2026, 8, 24);

    @Test
    void weightedScoreTreatsCriticalHabitsAsHeavier() {
        Habit sleep = habit("Sleep", Importance.CRITICAL);
        Habit reading = habit("Reading", Importance.OPTIONAL);
        HabitCompletion missedReading = completion(reading, today, CompletionStatus.MISSED);
        HabitCompletion didSleep = completion(sleep, today, CompletionStatus.COMPLETED);

        ConsistencyCalculator.DailyScore score = ConsistencyCalculator.scoreDay(
                today, today, List.of(sleep, reading), List.of(didSleep, missedReading)
        );

        assertEquals(0.75, score.score());
    }

    @Test
    void skippedHabitsAreExcludedFromDenominator() {
        Habit sleep = habit("Sleep", Importance.CRITICAL);
        Habit reading = habit("Reading", Importance.OPTIONAL);
        List<HabitCompletion> completions = List.of(
                completion(sleep, today, CompletionStatus.COMPLETED),
                completion(reading, today, CompletionStatus.SKIPPED)
        );

        ConsistencyCalculator.DailyScore score = ConsistencyCalculator.scoreDay(
                today, today, List.of(sleep, reading), completions
        );

        assertEquals(1.0, score.score());
        assertEquals(1, score.skipped());
    }

    @Test
    void partialCountsAsHalf() {
        Habit exercise = habit("Exercise", Importance.IMPORTANT);
        ConsistencyCalculator.DailyScore score = ConsistencyCalculator.scoreDay(
                today, today, List.of(exercise), List.of(completion(exercise, today, CompletionStatus.PARTIAL))
        );
        assertEquals(0.5, score.score());
    }

    @Test
    void oneMissedDayDoesNotEraseAStreakWhenTodayIsInProgress() {
        Habit sleep = habit("Sleep", Importance.CRITICAL);
        LocalDate start = today.minusDays(4);
        List<ConsistencyCalculator.DailyScore> days = new java.util.ArrayList<>();
        for (LocalDate date = start; !date.isAfter(today); date = date.plusDays(1)) {
            CompletionStatus status = date.equals(today) ? CompletionStatus.MISSED : CompletionStatus.COMPLETED;
            days.add(ConsistencyCalculator.scoreDay(
                    date, today, List.of(sleep), List.of(completion(sleep, date, status))
            ));
        }
        int streak = ConsistencyCalculator.currentStreak(days, today, 0.5);
        assertEquals(4, streak);
    }

    @Test
    void bestStreakFindsLongestRun() {
        Habit sleep = habit("Sleep", Importance.CRITICAL);
        LocalDate start = LocalDate.of(2026, 8, 1);
        List<ConsistencyCalculator.DailyScore> days = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            LocalDate date = start.plusDays(i);
            CompletionStatus status = (i == 4) ? CompletionStatus.MISSED : CompletionStatus.COMPLETED;
            days.add(ConsistencyCalculator.scoreDay(
                    date, today, List.of(sleep), List.of(completion(sleep, date, status))
            ));
        }
        assertEquals(5, ConsistencyCalculator.bestStreak(days, 0.5));
    }

    @Test
    void pastUnloggedHabitsCountAsMissed() {
        Habit sleep = habit("Sleep", Importance.CRITICAL);
        LocalDate yesterday = today.minusDays(1);
        ConsistencyCalculator.DailyScore score = ConsistencyCalculator.scoreDay(
                yesterday, today, List.of(sleep), List.of()
        );
        assertEquals(0.0, score.score());
        assertEquals(1, score.missed());
    }

    private Habit habit(String name, Importance importance) {
        Habit habit = new Habit();
        habit.setId(UUID.randomUUID());
        habit.setName(name);
        habit.setImportance(importance);
        habit.setWeight(importance.defaultWeight());
        habit.setSection(HabitSection.GROWTH);
        habit.setFrequencyType(FrequencyType.DAILY);
        habit.setFrequencyConfig(FrequencyConfig.daily());
        habit.setStartDate(LocalDate.of(2026, 1, 1));
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
