package com.verax.insight;

import com.verax.analytics.AnalyticsDtos;
import com.verax.analytics.AnalyticsService;
import com.verax.habit.HabitScheduler;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Heuristic stand-in for the future AI coach.
 * All methods already consume historical aggregates so an LLM can replace
 * the copy later without changing the API.
 */
@Service
public class InsightService {

    private final AnalyticsService analytics;

    public InsightService(AnalyticsService analytics) {
        this.analytics = analytics;
    }

    public InsightDtos.Preview preview(UUID userId) {
        LocalDate today = analytics.today(userId);
        LocalDate from = today.minusDays(27);
        List<AnalyticsDtos.NamedScore> habits = analytics.habits(userId, from, today);
        List<AnalyticsDtos.NamedScore> categories = analytics.categories(userId, from, today);
        AnalyticsDtos.Compare week = analytics.compare(userId, "week");
        List<String> insights = new ArrayList<>();

        habits.stream()
                .max(Comparator.comparingDouble(AnalyticsDtos.NamedScore::score))
                .ifPresent(h -> insights.add(h.name() + " is your most reliable commitment over the last 4 weeks."));
        habits.stream()
                .min(Comparator.comparingDouble(AnalyticsDtos.NamedScore::score))
                .filter(h -> h.score() < 0.7)
                .ifPresent(h -> insights.add(h.name() + " is where most missed days concentrate. Protect a smaller version of it."));
        if (week.delta() != null && week.delta() > 0.02) {
            insights.add("This week is stronger than last week. The system is compounding.");
        } else if (week.delta() != null && week.delta() < -0.05) {
            insights.add("Consistency dipped this week. That is information, not a verdict.");
        }
        categories.stream()
                .max(Comparator.comparingDouble(AnalyticsDtos.NamedScore::score))
                .ifPresent(c -> insights.add(c.name() + " is carrying the stretch right now."));
        if (insights.isEmpty()) {
            insights.add("Keep logging. Insights get sharper as the history fills in.");
        }

        String focus = habits.stream()
                .filter(h -> h.score() < 0.7)
                .min(Comparator.comparingDouble(AnalyticsDtos.NamedScore::score))
                .map(h -> "Focus next week on " + h.name() + " — one clean repetition, not a perfect week.")
                .orElse("Keep the current stack. Consistency is already the strategy.");

        return new InsightDtos.Preview(
                insights,
                focus,
                "heuristic",
                HabitScheduler.weekStart(today)
        );
    }
}
