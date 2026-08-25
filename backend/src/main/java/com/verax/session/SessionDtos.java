package com.verax.session;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class SessionDtos {

    private SessionDtos() {
    }

    public record Create(
            @NotNull SessionKind kind,
            UUID habitId,
            @Min(1) int seconds,
            LocalDate date
    ) {
    }

    public record View(
            UUID id,
            SessionKind kind,
            UUID habitId,
            String habitName,
            int seconds,
            LocalDate date,
            Instant createdAt
    ) {
        public static View from(FocusSession session) {
            return new View(
                    session.getId(),
                    session.getKind(),
                    session.getHabit() == null ? null : session.getHabit().getId(),
                    session.getHabit() == null ? null : session.getHabit().getName(),
                    session.getSeconds(),
                    session.getDate(),
                    session.getCreatedAt()
            );
        }
    }

    public record DaySummary(
            LocalDate date,
            int meditationSeconds,
            int readingSeconds,
            List<View> sessions
    ) {
    }
}
