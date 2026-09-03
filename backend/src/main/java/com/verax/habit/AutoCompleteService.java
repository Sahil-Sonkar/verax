package com.verax.habit;

import com.verax.completion.CompletionStatus;
import com.verax.completion.HabitCompletion;
import com.verax.completion.HabitCompletionRepository;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class AutoCompleteService {

    private final HabitRepository habits;
    private final HabitCompletionRepository completions;
    private final UserRepository users;

    public AutoCompleteService(
            HabitRepository habits,
            HabitCompletionRepository completions,
            UserRepository users
    ) {
        this.habits = habits;
        this.completions = completions;
        this.users = users;
    }

    @Transactional
    public void fromMetric(UUID userId, UUID metricId, LocalDate date, BigDecimal value, String note) {
        List<Habit> linked = habits.findByUserIdAndAutoCompleteMetricIdAndActiveTrue(userId, metricId);
        for (Habit habit : linked) {
            if (habit.getAutoCompleteThreshold() == null) {
                continue;
            }
            CompletionStatus next = statusFor(value, habit.getAutoCompleteThreshold());
            if (next == null) {
                continue;
            }
            upsert(userId, habit, date, next, value, note);
        }
    }

    @Transactional
    public void completeHabit(UUID userId, Habit habit, LocalDate date, BigDecimal value, String note) {
        upsert(userId, habit, date, CompletionStatus.COMPLETED, value, note);
    }

    /**
     * Marks every active habit whose name contains one of {@code needles} (pipe-separated).
     * Threshold is autoCompleteThreshold, else targetValue, else {@code fallback}.
     * Unit {@code session} always uses {@code fallback} so a 45-minute workout is not compared to "1 session".
     */
    @Transactional
    public boolean applyNamed(
            UUID userId,
            LocalDate date,
            String needles,
            BigDecimal value,
            BigDecimal fallback,
            String note
    ) {
        if (date == null || value == null || needles == null || needles.isBlank()) {
            return false;
        }
        boolean updated = false;
        for (Habit habit : habits.findByUserIdAndActiveTrueOrderBySectionAscNameAsc(userId)) {
            if (!habit.isInWindow(date) || !nameMatches(habit.getName(), needles)) {
                continue;
            }
            BigDecimal threshold = thresholdFor(habit, fallback);
            if (threshold == null) {
                continue;
            }
            CompletionStatus next = statusFor(value, threshold);
            if (next == null) {
                continue;
            }
            upsert(userId, habit, date, next, value, note);
            updated = true;
        }
        return updated;
    }

    static boolean nameMatches(String name, String needles) {
        if (name == null || needles == null) {
            return false;
        }
        String hay = name.toLowerCase(Locale.ROOT);
        for (String part : needles.toLowerCase(Locale.ROOT).split("\\|")) {
            if (!part.isBlank() && hay.contains(part.trim())) {
                return true;
            }
        }
        return false;
    }

    static BigDecimal thresholdFor(Habit habit, BigDecimal fallback) {
        String unit = habit.getUnit() == null ? "" : habit.getUnit().toLowerCase(Locale.ROOT);
        if ("session".equals(unit) || "sessions".equals(unit)) {
            return fallback;
        }
        if (habit.getAutoCompleteThreshold() != null) {
            return habit.getAutoCompleteThreshold();
        }
        if (habit.getTargetValue() != null) {
            return habit.getTargetValue();
        }
        return fallback;
    }

    private void upsert(
            UUID userId,
            Habit habit,
            LocalDate date,
            CompletionStatus next,
            BigDecimal value,
            String note
    ) {
        HabitCompletion existing = completions.findByHabitIdAndDate(habit.getId(), date).orElse(null);
        if (existing != null && existing.getStatus() == CompletionStatus.COMPLETED) {
            existing.setValue(value);
            if (note != null) {
                existing.setNote(note);
            }
            return;
        }
        User user = users.getReferenceById(userId);
        HabitCompletion row = existing == null ? new HabitCompletion() : existing;
        row.setUser(user);
        row.setHabit(habit);
        row.setDate(date);
        row.setStatus(next);
        row.setValue(value);
        row.setNote(note);
        completions.save(row);
    }

    static CompletionStatus statusFor(BigDecimal value, BigDecimal threshold) {
        if (value.compareTo(threshold) >= 0) {
            return CompletionStatus.COMPLETED;
        }
        if (value.compareTo(threshold.multiply(new BigDecimal("0.5"))) >= 0) {
            return CompletionStatus.PARTIAL;
        }
        return null;
    }
}
