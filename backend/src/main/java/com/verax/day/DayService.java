package com.verax.day;

import com.verax.completion.CompletionStatus;
import com.verax.completion.HabitCompletion;
import com.verax.completion.HabitCompletionRepository;
import com.verax.consistency.ConsistencyCalculator;
import com.verax.habit.FrequencyType;
import com.verax.habit.Habit;
import com.verax.habit.HabitDtos;
import com.verax.habit.HabitRepository;
import com.verax.habit.HabitScheduler;
import com.verax.habit.HabitService;
import com.verax.metric.MetricDtos;
import com.verax.metric.MetricService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DayService {

    private final UserRepository users;
    private final HabitRepository habits;
    private final HabitService habitService;
    private final HabitCompletionRepository completions;
    private final DayLogRepository dayLogs;
    private final MetricService metrics;

    public DayService(
            UserRepository users,
            HabitRepository habits,
            HabitService habitService,
            HabitCompletionRepository completions,
            DayLogRepository dayLogs,
            MetricService metrics
    ) {
        this.users = users;
        this.habits = habits;
        this.habitService = habitService;
        this.completions = completions;
        this.dayLogs = dayLogs;
        this.metrics = metrics;
    }

    public LocalDate today(UUID userId) {
        User user = users.findById(userId).orElseThrow();
        return LocalDate.now(ZoneId.of(user.getTimezone()));
    }

    public DayDtos.Snapshot snapshot(UUID userId, LocalDate date) {
        LocalDate today = today(userId);
        LocalDate rangeStart = HabitScheduler.weekStart(date.minusDays(7));
        LocalDate rangeEnd = date.with(TemporalAdjusters.lastDayOfMonth());
        List<Habit> relevant = habits.findRelevant(userId, rangeStart, rangeEnd);
        List<HabitCompletion> all = completions.findInRange(userId, rangeStart, rangeEnd);
        Map<UUID, List<HabitCompletion>> byHabit = all.stream()
                .collect(Collectors.groupingBy(c -> c.getHabit().getId()));
        java.util.Set<UUID> groupIds = relevant.stream()
                .map(Habit::getParent)
                .filter(java.util.Objects::nonNull)
                .map(Habit::getId)
                .collect(Collectors.toSet());
        List<Habit> leaves = relevant.stream().filter(h -> !groupIds.contains(h.getId())).toList();
        ConsistencyCalculator.DailyScore score = ConsistencyCalculator.scoreDay(date, today, leaves, all);

        List<DayDtos.HabitItem> items = new ArrayList<>();
        for (Habit habit : relevant) {
            if (!HabitScheduler.appearsOn(habit, date)) {
                continue;
            }
            if (!habit.isActive() && all.stream().noneMatch(c -> c.getHabit().getId().equals(habit.getId()) && c.getDate().equals(date))) {
                continue;
            }
            HabitCompletion logged = all.stream()
                    .filter(c -> c.getHabit().getId().equals(habit.getId()) && c.getDate().equals(date))
                    .findFirst()
                    .orElse(null);
            boolean due = HabitScheduler.isDue(habit, date, byHabit);
            items.add(new DayDtos.HabitItem(
                    HabitDtos.Response.from(habit),
                    logged == null ? null : logged.getStatus(),
                    logged == null ? null : logged.getValue(),
                    logged == null ? null : logged.getNote(),
                    due,
                    periodProgress(habit, date, byHabit)
            ));
        }

        String note = dayLogs.findByUserIdAndDate(userId, date).map(DayLog::getNote).orElse(null);
        return DayDtos.Snapshot.from(score, date.equals(today), note, items);
    }

    public DayDetail detail(UUID userId, LocalDate date) {
        DayDtos.Snapshot snap = snapshot(userId, date);
        List<MetricDtos.EntryView> metricEntries = metrics.entriesOn(userId, date);
        return new DayDetail(snap, metricEntries);
    }

    @Transactional
    public DayDtos.Snapshot upsertCompletion(UUID userId, LocalDate date, UUID habitId, DayDtos.UpsertCompletion request) {
        Habit habit = habitService.require(userId, habitId);
        User user = users.getReferenceById(userId);
        HabitCompletion completion = completions.findByHabitIdAndDate(habitId, date).orElseGet(() -> {
            HabitCompletion created = new HabitCompletion();
            created.setUser(user);
            created.setHabit(habit);
            created.setDate(date);
            return created;
        });
        completion.setStatus(request.status());
        completion.setValue(request.value());
        completion.setNote(request.note());
        completions.save(completion);
        return snapshot(userId, date);
    }

    @Transactional
    public DayDtos.Snapshot saveNote(UUID userId, LocalDate date, String note) {
        User user = users.getReferenceById(userId);
        DayLog log = dayLogs.findByUserIdAndDate(userId, date).orElseGet(() -> {
            DayLog created = new DayLog();
            created.setUser(user);
            created.setDate(date);
            return created;
        });
        log.setNote(note);
        dayLogs.save(log);
        return snapshot(userId, date);
    }

    private String periodProgress(Habit habit, LocalDate date, Map<UUID, List<HabitCompletion>> byHabit) {
        if (habit.getFrequencyType() != FrequencyType.WEEKLY && habit.getFrequencyType() != FrequencyType.MONTHLY) {
            return null;
        }
        LocalDate start;
        LocalDate end;
        int needed = habit.getFrequencyConfig().getTimesPerPeriod() == null ? 1 : habit.getFrequencyConfig().getTimesPerPeriod();
        if (habit.getFrequencyType() == FrequencyType.WEEKLY) {
            start = HabitScheduler.weekStart(date);
            end = start.plusDays(6);
        } else {
            start = date.withDayOfMonth(1);
            end = date.with(TemporalAdjusters.lastDayOfMonth());
        }
        long done = byHabit.getOrDefault(habit.getId(), List.of()).stream()
                .filter(c -> !c.getDate().isBefore(start) && !c.getDate().isAfter(end) && !c.getDate().isAfter(date))
                .filter(c -> c.getStatus() == CompletionStatus.COMPLETED || c.getStatus() == CompletionStatus.PARTIAL)
                .count();
        String label = habit.getFrequencyType() == FrequencyType.WEEKLY ? "this week" : "this month";
        return done + "/" + needed + " " + label;
    }

    public record DayDetail(DayDtos.Snapshot day, List<MetricDtos.EntryView> metrics) {
    }
}
