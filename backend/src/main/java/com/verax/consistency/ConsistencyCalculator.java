package com.verax.consistency;

import com.verax.completion.CompletionStatus;
import com.verax.completion.HabitCompletion;
import com.verax.habit.Habit;
import com.verax.habit.HabitScheduler;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ConsistencyCalculator {

    private ConsistencyCalculator() {
    }

    public static DailyScore scoreDay(
            LocalDate date,
            LocalDate today,
            List<Habit> habits,
            List<HabitCompletion> completions
    ) {
        Map<UUID, List<HabitCompletion>> byHabit = index(completions);
        Map<UUID, HabitCompletion> todayByHabit = new HashMap<>();
        for (HabitCompletion completion : completions) {
            if (completion.getDate().equals(date)) {
                todayByHabit.put(completion.getHabit().getId(), completion);
            }
        }

        double earned = 0;
        double possible = 0;
        int scheduled = 0;
        int completed = 0;
        int partial = 0;
        int missed = 0;
        int skipped = 0;
        int pending = 0;
        List<HabitContribution> contributions = new ArrayList<>();

        for (Habit habit : habits) {
            if (!habit.isActive() && !todayByHabit.containsKey(habit.getId())) {
                continue;
            }
            boolean due = HabitScheduler.isDue(habit, date, byHabit);
            HabitCompletion logged = todayByHabit.get(habit.getId());
            if (!due && logged == null) {
                continue;
            }
            if (logged != null && logged.getStatus() == CompletionStatus.SKIPPED) {
                skipped++;
                scheduled++;
                contributions.add(new HabitContribution(habit, logged.getStatus(), 0, 0));
                continue;
            }
            scheduled++;
            possible += habit.getWeight();
            CompletionStatus status;
            if (logged == null) {
                status = date.isAfter(today) ? null : CompletionStatus.MISSED;
                if (date.equals(today)) {
                    pending++;
                } else if (date.isBefore(today)) {
                    missed++;
                }
                contributions.add(new HabitContribution(habit, status, 0, habit.getWeight()));
                continue;
            }
            status = logged.getStatus();
            double earnedWeight = habit.getWeight() * status.multiplier();
            earned += earnedWeight;
            switch (status) {
                case COMPLETED -> completed++;
                case PARTIAL -> partial++;
                case MISSED -> missed++;
                case SKIPPED -> {
                }
            }
            contributions.add(new HabitContribution(habit, status, earnedWeight, habit.getWeight()));
        }

        Double score = possible <= 0 ? null : round(earned / possible);
        return new DailyScore(date, score, earned, possible, scheduled, completed, partial, missed, skipped, pending, contributions);
    }

    public static Double average(List<DailyScore> days) {
        List<Double> values = days.stream().map(DailyScore::score).filter(v -> v != null).toList();
        if (values.isEmpty()) {
            return null;
        }
        return round(values.stream().mapToDouble(Double::doubleValue).average().orElse(0));
    }

    public static int currentStreak(List<DailyScore> chronological, LocalDate today, double threshold) {
        int streak = 0;
        for (int i = chronological.size() - 1; i >= 0; i--) {
            DailyScore day = chronological.get(i);
            if (day.date().isAfter(today)) {
                continue;
            }
            if (day.date().equals(today) && (day.score() == null || day.score() < threshold)) {
                continue;
            }
            if (day.score() != null && day.score() >= threshold) {
                streak++;
            } else if (day.date().isBefore(today)) {
                break;
            }
        }
        return streak;
    }

    public static int bestStreak(List<DailyScore> chronological, double threshold) {
        int best = 0;
        int current = 0;
        for (DailyScore day : chronological) {
            if (day.score() != null && day.score() >= threshold) {
                current++;
                best = Math.max(best, current);
            } else {
                current = 0;
            }
        }
        return best;
    }

    public static double round(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }

    private static Map<UUID, List<HabitCompletion>> index(List<HabitCompletion> completions) {
        Map<UUID, List<HabitCompletion>> map = new HashMap<>();
        for (HabitCompletion completion : completions) {
            map.computeIfAbsent(completion.getHabit().getId(), key -> new ArrayList<>()).add(completion);
        }
        return map;
    }

    public record HabitContribution(
            Habit habit,
            CompletionStatus status,
            double earnedWeight,
            double possibleWeight
    ) {
    }

    public record DailyScore(
            LocalDate date,
            Double score,
            double earned,
            double possible,
            int scheduled,
            int completed,
            int partial,
            int missed,
            int skipped,
            int pending,
            List<HabitContribution> contributions
    ) {
        public int percent() {
            return score == null ? 0 : (int) Math.round(score * 100);
        }
    }
}
