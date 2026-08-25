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
