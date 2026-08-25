package com.verax.day;

import com.verax.completion.CompletionStatus;
import com.verax.consistency.ConsistencyCalculator;
import com.verax.habit.HabitDtos;
import com.verax.habit.HabitSection;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class DayDtos {

    private DayDtos() {
    }

    public record UpsertCompletion(
            CompletionStatus status,
            BigDecimal value,
            String note
    ) {
    }

    public record NoteRequest(String note) {
    }

    public record HabitItem(
            HabitDtos.Response habit,
            CompletionStatus status,
            BigDecimal value,
            String note,
            boolean due,
            String periodProgress,
            List<HabitItem> children
    ) {
        public HabitItem {
            if (children == null) {
                children = List.of();
            }
        }

        public HabitItem(
                HabitDtos.Response habit,
                CompletionStatus status,
                BigDecimal value,
                String note,
                boolean due,
                String periodProgress
        ) {
            this(habit, status, value, note, due, periodProgress, List.of());
        }
    }

    public record Snapshot(
            LocalDate date,
            boolean today,
            Double score,
            int percent,
            int scheduled,
            int completed,
            int partial,
            int missed,
            int skipped,
            int pending,
            String message,
            String note,
            List<HabitItem> nonNegotiables,
            List<HabitItem> growth,
            List<HabitItem> other
    ) {
        public static Snapshot from(
                ConsistencyCalculator.DailyScore score,
                boolean isToday,
                String note,
                List<HabitItem> items
        ) {
            java.util.Map<UUID, java.util.ArrayList<HabitItem>> nested = new java.util.HashMap<>();
            for (HabitItem item : items) {
                UUID parentId = item.habit().parentId();
                if (parentId != null) {
                    nested.computeIfAbsent(parentId, key -> new java.util.ArrayList<>()).add(item);
                }
            }
            List<HabitItem> roots = new java.util.ArrayList<>();
            for (HabitItem item : items) {
                if (item.habit().parentId() != null) {
                    continue;
                }
                List<HabitItem> kids = nested.getOrDefault(item.habit().id(), new java.util.ArrayList<>());
                CompletionStatus status = item.status();
                boolean due = item.due();
                if (!kids.isEmpty()) {
                    long done = kids.stream().filter(k -> k.status() == CompletionStatus.COMPLETED).count();
                    long half = kids.stream().filter(k -> k.status() == CompletionStatus.PARTIAL).count();
                    if (done == kids.size()) {
                        status = CompletionStatus.COMPLETED;
                    } else if (done + half > 0) {
                        status = CompletionStatus.PARTIAL;
                    }
                    due = kids.stream().anyMatch(HabitItem::due);
                }
                roots.add(new HabitItem(
                        item.habit(),
                        status,
                        item.value(),
                        item.note(),
                        due,
                        item.periodProgress(),
                        List.copyOf(kids)
                ));
            }
            List<HabitItem> nn = roots.stream().filter(i -> i.habit().section() == HabitSection.NON_NEGOTIABLE).toList();
            List<HabitItem> growth = roots.stream().filter(i -> i.habit().section() == HabitSection.GROWTH).toList();
            List<HabitItem> other = roots.stream().filter(i -> i.habit().section() == HabitSection.OTHER).toList();
            return new Snapshot(
                    score.date(),
                    isToday,
                    score.score(),
                    score.percent(),
                    score.scheduled(),
                    score.completed(),
                    score.partial(),
                    score.missed(),
                    score.skipped(),
                    score.pending(),
                    Encouragement.message(score, isToday),
                    note,
                    nn,
                    growth,
                    other
            );
        }
    }
}
