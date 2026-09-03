package com.verax.voice;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class VoiceDtos {

    private VoiceDtos() {
    }

    public record Snapshot(
            @NotBlank String platform,
            @NotNull LocalDate date,
            Map<String, BigDecimal> values
    ) {
    }

    public record MetricPoint(LocalDate date, BigDecimal value) {
    }

    public record SocialMetric(
            String key,
            String name,
            String unit,
            BigDecimal latest,
            LocalDate latestDate,
            List<MetricPoint> series
    ) {
    }

    public record PlatformStats(String platform, String label, List<SocialMetric> metrics) {
    }

    public record IdeaUpsert(
            ContentIdea.Platform platform,
            ContentIdea.Phase phase,
            String idea,
            String happened,
            String learned,
            String potentialPlatform,
            String hook
    ) {
    }

    public record IdeaView(
            UUID id,
            ContentIdea.Platform platform,
            ContentIdea.Phase phase,
            String idea,
            String happened,
            String learned,
            String potentialPlatform,
            String hook,
            Instant updatedAt
    ) {
        public static IdeaView from(ContentIdea row) {
            return new IdeaView(
                    row.getId(),
                    row.getPlatform(),
                    row.getPhase(),
                    row.getIdea(),
                    row.getHappened(),
                    row.getLearned(),
                    row.getPotentialPlatform(),
                    row.getHook(),
                    row.getUpdatedAt()
            );
        }
    }
}
