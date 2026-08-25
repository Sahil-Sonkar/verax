package com.verax.analytics;

import com.verax.security.CurrentUser;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analytics;
    private final CurrentUser currentUser;

    public AnalyticsController(AnalyticsService analytics, CurrentUser currentUser) {
        this.analytics = analytics;
        this.currentUser = currentUser;
    }

    @GetMapping("/dashboard")
    public AnalyticsDtos.Dashboard dashboard() {
        return analytics.dashboard(currentUser.id());
    }

    @GetMapping("/heatmap")
    public List<AnalyticsDtos.HeatCell> heatmap(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return analytics.heatmapRange(currentUser.id(), from, to);
    }

    @GetMapping("/trends")
    public AnalyticsDtos.Trends trends(
            @RequestParam(defaultValue = "daily") String granularity,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return analytics.trends(currentUser.id(), granularity, from, to);
    }

    @GetMapping("/categories")
    public List<AnalyticsDtos.NamedScore> categories(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return analytics.categories(currentUser.id(), from, to);
    }

    @GetMapping("/habits")
    public List<AnalyticsDtos.NamedScore> habits(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return analytics.habits(currentUser.id(), from, to);
    }

    @GetMapping("/compare")
    public AnalyticsDtos.Compare compare(@RequestParam(defaultValue = "week") String period) {
        return analytics.compare(currentUser.id(), period);
    }

    @GetMapping("/weekly-review")
    public AnalyticsDtos.WeeklyReview weeklyReview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart
    ) {
        return analytics.weeklyReview(currentUser.id(), weekStart);
    }
}
