package com.verax.integration;

import com.verax.common.ApiException;
import com.verax.habit.AutoCompleteService;
import com.verax.habit.Habit;
import com.verax.habit.HabitService;
import com.verax.metric.Metric;
import com.verax.metric.MetricDtos;
import com.verax.metric.MetricRepository;
import com.verax.metric.MetricService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class IntegrationService {

    private static final Set<String> PROVIDERS = Set.of(
            "GOOGLE_HEALTH",
            "GARMIN",
            "ZERODHA",
            "ACCOUNT_AGGREGATOR",
            "LYFTA",
            "CULT_FIT",
            "YOUTUBE",
            "INSTAGRAM",
            "LINKEDIN",
            "MANUAL"
    );

    private final MetricRepository metrics;
    private final MetricService metricService;
    private final UserRepository users;
    private final AutoCompleteService autoComplete;
    private final HabitService habits;

    public IntegrationService(
            MetricRepository metrics,
            MetricService metricService,
            UserRepository users,
            AutoCompleteService autoComplete,
            HabitService habits
    ) {
        this.metrics = metrics;
        this.metricService = metricService;
        this.users = users;
        this.autoComplete = autoComplete;
        this.habits = habits;
    }

    public IntegrationDtos.Catalog catalog() {
        return new IntegrationDtos.Catalog(List.of(
                new IntegrationDtos.Provider(
                        "GOOGLE_HEALTH",
                        "Google Health / Fitbit",
                        "Steps, activity, sleep from Google or Fitbit accounts",
                        "INGEST",
                        "Paste today's steps here or on Home. A reading named Steps marks the steps habit when it clears the target. Live Google Fit OAuth needs a Google Cloud Fitness project and review — Fit REST is shutting down."
                ),
                new IntegrationDtos.Provider(
                        "GARMIN",
                        "Garmin",
                        "Sleep, HRV, workouts from a Garmin watch",
                        "NEEDS_PARTNER",
                        "Garmin Health API is partner-only. Until that access exists, export sleep hours and log them here, or wait for a partner key."
                ),
                new IntegrationDtos.Provider(
                        "ZERODHA",
                        "Zerodha Kite",
                        "Holdings and invested capital",
                        "NEEDS_CREDENTIALS",
                        "Kite Connect is official, but you register your own app. Verax will not take your Zerodha password. Paste daily invested value here until Kite keys are configured."
                ),
                new IntegrationDtos.Provider(
                        "ACCOUNT_AGGREGATOR",
                        "Banks (India Account Aggregator)",
                        "Bank balances and net worth",
                        "NEEDS_PARTNER",
                        "Indian banks do not allow a personal app to scrape net banking. The legal path is RBI Account Aggregator. Until Verax is an FIU, log net worth as a metric."
                ),
                new IntegrationDtos.Provider(
                        "LYFTA",
                        "Lyfta",
                        "Strength sessions and lifts",
                        "MANUAL",
                        "Lyfta has no public API. Log workout minutes or a session count after training, or paste an export."
                ),
                new IntegrationDtos.Provider(
                        "CULT_FIT",
                        "Cult Fit",
                        "Gym check-ins and classes",
                        "MANUAL",
                        "Cult Fit has no public third-party API. Log class minutes or mark the linked habit after you train."
                ),
                new IntegrationDtos.Provider(
                        "YOUTUBE",
                        "YouTube",
                        "Subscribers, views, watch time, retention",
                        "INGEST",
                        "YouTube Analytics has no personal-app OAuth path here. Paste a snapshot on Voice → Social."
                ),
                new IntegrationDtos.Provider(
                        "INSTAGRAM",
                        "Instagram",
                        "Followers, reach, saves, shares",
                        "INGEST",
                        "Instagram Graph is business-account only. Paste Insights numbers on Voice → Social."
                ),
                new IntegrationDtos.Provider(
                        "LINKEDIN",
                        "LinkedIn",
                        "Followers, impressions, engagement, profile views",
                        "INGEST",
                        "LinkedIn does not give a personal analytics API. Paste Creator or Page numbers on Voice → Social."
                ),
                new IntegrationDtos.Provider(
                        "MANUAL",
                        "Paste a reading",
                        "Any number another app already measured",
                        "READY",
                        "Use this when the other app has no API. One field. If a habit is linked to that metric, Today marks itself."
                )
        ));
    }

    @Transactional
    public IntegrationDtos.IngestResult ingest(UUID userId, IntegrationDtos.IngestRequest request) {
        String provider = request.provider().trim().toUpperCase(Locale.ROOT);
        if (!PROVIDERS.contains(provider)) {
            throw ApiException.badRequest("Unknown provider");
        }
        Metric metric = metrics.findByUserIdAndNameIgnoreCase(userId, request.metricName().trim())
                .orElseGet(() -> {
                    User user = users.getReferenceById(userId);
                    Metric created = new Metric();
                    created.setUser(user);
                    created.setName(request.metricName().trim());
                    created.setUnit(request.unit());
                    created.setSource(provider);
                    return metrics.save(created);
                });
        if (request.unit() != null && !request.unit().isBlank()) {
            metric.setUnit(request.unit());
        }
        metric.setSource(provider);
        String loggedNote = request.note() == null || request.note().isBlank() ? note(provider) : request.note();
        metricService.addEntry(userId, metric.getId(), new MetricDtos.EntryUpsert(request.date(), request.value(), loggedNote));
        boolean habitUpdated = false;
        if (request.habitId() != null) {
            Habit habit = habits.require(userId, request.habitId());
            autoComplete.completeHabit(userId, habit, request.date(), request.value(), loggedNote);
            habitUpdated = true;
        } else if (metric.getName().toLowerCase(Locale.ROOT).contains("step")) {
            habitUpdated = autoComplete.applyNamed(
                    userId,
                    request.date(),
                    "step",
                    request.value(),
                    BigDecimal.valueOf(7500),
                    loggedNote
            );
        }
        return new IntegrationDtos.IngestResult(metric.getId(), metric.getName(), request.value(), request.date(), habitUpdated);
    }

    private static String note(String provider) {
        return "Logged from " + provider.toLowerCase(Locale.ROOT).replace('_', ' ');
    }
}
