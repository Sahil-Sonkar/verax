package com.verax.session;

import com.verax.common.ApiException;
import com.verax.habit.AutoCompleteService;
import com.verax.habit.Habit;
import com.verax.habit.HabitService;
import com.verax.metric.Metric;
import com.verax.metric.MetricDtos;
import com.verax.metric.MetricEntry;
import com.verax.metric.MetricEntryRepository;
import com.verax.metric.MetricRepository;
import com.verax.metric.MetricService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
public class SessionService {

    private final FocusSessionRepository sessions;
    private final UserRepository users;
    private final MetricRepository metrics;
    private final MetricEntryRepository metricEntries;
    private final MetricService metricService;
    private final HabitService habits;
    private final AutoCompleteService autoComplete;

    public SessionService(
            FocusSessionRepository sessions,
            UserRepository users,
            MetricRepository metrics,
            MetricEntryRepository metricEntries,
            MetricService metricService,
            HabitService habits,
            AutoCompleteService autoComplete
    ) {
        this.sessions = sessions;
        this.users = users;
        this.metrics = metrics;
        this.metricEntries = metricEntries;
        this.metricService = metricService;
        this.habits = habits;
        this.autoComplete = autoComplete;
    }

    @Transactional(readOnly = true)
    public SessionDtos.DaySummary forDate(UUID userId, LocalDate date) {
        LocalDate resolved = date == null ? today(userId) : date;
        List<FocusSession> rows = sessions.findByUserIdAndDateOrderByCreatedAtAsc(userId, resolved);
        int meditation = 0;
        int reading = 0;
        for (FocusSession row : rows) {
            if (row.getKind() == SessionKind.MEDITATION) {
                meditation += row.getSeconds();
            } else {
                reading += row.getSeconds();
            }
        }
        return new SessionDtos.DaySummary(
                resolved,
                meditation,
                reading,
                rows.stream().map(SessionDtos.View::from).toList()
        );
    }

    @Transactional
    public SessionDtos.View complete(UUID userId, SessionDtos.Create request) {
        LocalDate date = request.date() == null ? today(userId) : request.date();
        User user = users.getReferenceById(userId);
        Habit habit = request.habitId() == null ? null : habits.require(userId, request.habitId());

        FocusSession session = new FocusSession();
        session.setUser(user);
        session.setKind(request.kind());
        session.setHabit(habit);
        session.setSeconds(request.seconds());
        session.setDate(date);
        sessions.save(session);

        Metric metric = metricFor(user, request.kind());
        BigDecimal minutes = BigDecimal.valueOf(request.seconds())
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        BigDecimal total = metricEntries.findByMetricIdAndDate(metric.getId(), date)
                .map(MetricEntry::getValue)
                .orElse(BigDecimal.ZERO)
                .add(minutes);
        metricService.addEntry(userId, metric.getId(), new MetricDtos.EntryUpsert(
                date,
                total,
                request.kind() == SessionKind.MEDITATION ? "Meditation timer" : "Reading timer"
        ));
        if (habit != null) {
            autoComplete.completeHabit(userId, habit, date, minutes, "Focus timer");
        }
        return SessionDtos.View.from(session);
    }

    private Metric metricFor(User user, SessionKind kind) {
        String name = kind == SessionKind.MEDITATION ? "Meditation minutes" : "Reading minutes";
        return metrics.findByUserIdAndNameIgnoreCase(user.getId(), name).orElseGet(() -> {
            Metric created = new Metric();
            created.setUser(user);
            created.setName(name);
            created.setUnit("min");
            created.setSource("TIMER");
            return metrics.save(created);
        });
    }

    private LocalDate today(UUID userId) {
        User user = users.findById(userId).orElseThrow();
        return LocalDate.now(ZoneId.of(user.getTimezone()));
    }
}
