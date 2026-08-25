package com.verax.habit;

import com.verax.completion.CompletionStatus;
import com.verax.completion.HabitCompletion;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class HabitScheduler {

    private HabitScheduler() {
    }

    public static boolean appearsOn(Habit habit, LocalDate date) {
        if (!habit.isInWindow(date)) {
            return false;
        }
        return switch (habit.getFrequencyType()) {
            case DAILY, WEEKLY, MONTHLY -> true;
            case WEEKDAYS -> isWeekdayMatch(habit, date);
            case CUSTOM -> isCustomMatch(habit, date);
        };
    }

    /**
     * Whether this habit counts toward the day's consistency denominator.
     */
    public static boolean isDue(
            Habit habit,
            LocalDate date,
            Map<UUID, List<HabitCompletion>> completionsByHabit
    ) {
        if (!habit.isInWindow(date) || !habit.isActive()) {
            return false;
        }
        FrequencyConfig config = habit.getFrequencyConfig();
        return switch (habit.getFrequencyType()) {
            case DAILY -> true;
            case WEEKDAYS -> isWeekdayMatch(habit, date);
            case CUSTOM -> isCustomMatch(habit, date);
            case WEEKLY -> isPeriodDue(habit, date, completionsByHabit, weekStart(date), weekStart(date).plusDays(6),
                    config.getTimesPerPeriod() == null ? 1 : config.getTimesPerPeriod());
            case MONTHLY -> isPeriodDue(habit, date, completionsByHabit, date.withDayOfMonth(1),
                    date.with(TemporalAdjusters.lastDayOfMonth()),
                    config.getTimesPerPeriod() == null ? 1 : config.getTimesPerPeriod());
        };
    }

    public static LocalDate weekStart(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    private static boolean isWeekdayMatch(Habit habit, LocalDate date) {
        List<Integer> days = habit.getFrequencyConfig().getWeekdays();
        if (days == null || days.isEmpty()) {
            return true;
        }
        return days.contains(date.getDayOfWeek().getValue());
    }

    private static boolean isCustomMatch(Habit habit, LocalDate date) {
        Integer interval = habit.getFrequencyConfig().getIntervalDays();
        if (interval == null || interval <= 1) {
            return true;
        }
        long delta = java.time.temporal.ChronoUnit.DAYS.between(habit.getStartDate(), date);
        return delta >= 0 && delta % interval == 0;
    }

    private static boolean isPeriodDue(
            Habit habit,
            LocalDate date,
            Map<UUID, List<HabitCompletion>> completionsByHabit,
            LocalDate periodStart,
            LocalDate periodEnd,
            int timesNeeded
    ) {
        List<HabitCompletion> completions = completionsByHabit.getOrDefault(habit.getId(), List.of());
        boolean loggedToday = completions.stream().anyMatch(c -> c.getDate().equals(date));
        if (loggedToday) {
            return true;
        }
        long done = completions.stream()
                .filter(c -> !c.getDate().isAfter(date.minusDays(1)))
                .filter(c -> !c.getDate().isBefore(periodStart) && !c.getDate().isAfter(periodEnd))
                .filter(c -> c.getStatus() == CompletionStatus.COMPLETED || c.getStatus() == CompletionStatus.PARTIAL)
                .count();
        if (done >= timesNeeded) {
            return false;
        }
        long remainingNeeded = timesNeeded - done;
        long remainingDays = java.time.temporal.ChronoUnit.DAYS.between(date, periodEnd) + 1;
        return remainingNeeded >= remainingDays;
    }
}
