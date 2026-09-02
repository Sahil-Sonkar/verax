package com.verax.mind;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public final class MindDtos {

    private MindDtos() {
    }

    public record SleepUpsert(
            LocalDate date,
            String startTime,
            String endTime,
            Integer score,
            Integer awakeMin,
            Integer remMin,
            Integer coreMin,
            Integer deepMin,
            String source
    ) {
    }

    public record SleepView(
            UUID id,
            LocalDate date,
            String startTime,
            String endTime,
            Integer score,
            int awakeMin,
            int remMin,
            int coreMin,
            int deepMin,
            int totalMin,
            String source
    ) {
        public static SleepView from(SleepNight night) {
            return new SleepView(
                    night.getId(),
                    night.getNightDate(),
                    night.getStartTime(),
                    night.getEndTime(),
                    night.getScore(),
                    night.getAwakeMin(),
                    night.getRemMin(),
                    night.getCoreMin(),
                    night.getDeepMin(),
                    night.totalMin(),
                    night.getSource()
            );
        }
    }

    public record SleepPoint(
            String period,
            double avgScore,
            double avgTotal,
            double avgAwake,
            double avgRem,
            double avgCore,
            double avgDeep
    ) {
    }

    public record SleepSummary(List<SleepView> nights, List<SleepPoint> points) {
    }

    public record TagUpsert(String name, String color) {
    }

    public record NoteUpsert(String body, List<UUID> tagIds, List<String> tagNames) {
    }

    public record TagView(UUID id, String name, String color, int noteCount) {
        public static TagView from(MindTag tag, int noteCount) {
            return new TagView(tag.getId(), tag.getName(), tag.getColor(), noteCount);
        }
    }

    public record NoteView(UUID id, String body, Instant createdAt, Instant updatedAt, List<TagView> tags) {
        public static NoteView from(MindNote note) {
            List<TagView> tags = note.getTags().stream()
                    .sorted(Comparator.comparing(MindTag::getName, String.CASE_INSENSITIVE_ORDER))
                    .map(tag -> TagView.from(tag, 0))
                    .toList();
            return new NoteView(note.getId(), note.getBody(), note.getCreatedAt(), note.getUpdatedAt(), tags);
        }
    }

    public record JournalBoard(List<TagView> tags, List<NoteView> notes) {
    }
}
