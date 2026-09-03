package com.verax.analytics;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    public record NamedScore(UUID id, String name, String color, double score, int percent) {
    }

    public record HeatCell(LocalDate date, Double score, int percent, int level, Double completed) {
        public HeatCell(LocalDate date, Double score, int percent, int level) {
            this(date, score, percent, level, null);
        }
    }

    public record TrailDay(LocalDate date, String status) {
    }

    public record HabitTrail(UUID habitId, List<TrailDay> days) {
    }

    public record Tracker(List<HeatCell> heatmap, List<HabitTrail> trails) {
    }

    public record Point(String label, LocalDate start, Double score, int percent) {
    }

    public record Dashboard(
            double overall,
            int overallPercent,
            Double vsPreviousMonth,
            String previousMonthName,
            int currentStreak,
            int bestStreak,
            Double thisWeek,
            Double thisMonth,
            List<NamedScore> categories,
            List<HeatCell> heatmap
    ) {
    }

    public record Trends(String granularity, List<Point> points) {
    }

    public record Compare(
            String period,
            Double current,
            Double previous,
            Double delta,
            String currentLabel,
            String previousLabel
    ) {
    }

    public record HabitPoint(LocalDate date, Double value, int percent, String status) {
    }

    public record HabitSeries(UUID habitId, String name, String unit, List<HabitPoint> points) {
    }

    public record WeeklyReview(
            LocalDate weekStart,
            LocalDate weekEnd,
            Double consistency,
            Double vsPreviousWeek,
            NamedScore bestArea,
            NamedScore needsAttention,
            int habitsCompleted,
            int habitsScheduled,
            int streak,
            List<String> wentWell,
            List<String> needsWork
    ) {
    }
}
