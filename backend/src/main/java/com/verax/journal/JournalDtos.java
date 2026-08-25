package com.verax.journal;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class JournalDtos {

    private JournalDtos() {
    }

    public record Upsert(
            String content,
            String mood,
            String reflection,
            String wins,
            String problems,
            String lessons
    ) {
    }

    public record Response(
            UUID id,
            LocalDate date,
            String content,
            String mood,
            String reflection,
            String wins,
            String problems,
            String lessons,
            Instant updatedAt
    ) {
        public static Response from(JournalEntry entry) {
            return new Response(
                    entry.getId(),
                    entry.getDate(),
                    entry.getContent(),
                    entry.getMood(),
                    entry.getReflection(),
                    entry.getWins(),
                    entry.getProblems(),
                    entry.getLessons(),
                    entry.getUpdatedAt()
            );
        }
    }
}
