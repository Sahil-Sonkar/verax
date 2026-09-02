package com.verax.calendar;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class GoogleCalendarDtos {

    private GoogleCalendarDtos() {
    }

    public record Status(
            boolean configured,
            boolean connected,
            String email,
            Instant lastSyncedAt,
            String lastError
    ) {
    }

    public record AuthUrl(String url, String redirectUri) {
    }

    public record CallbackRequest(String code, String state, String redirectUri) {
    }

    public record ExternalEvent(
            String id,
            String title,
            LocalDate date,
            int weekday,
            int startMin,
            int endMin
    ) {
    }

    public record EventList(List<ExternalEvent> events) {
    }
}
