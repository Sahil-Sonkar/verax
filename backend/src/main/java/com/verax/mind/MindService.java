package com.verax.mind;

import com.verax.common.ApiException;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class MindService {

    private static final String[] TAG_COLORS = {"#7a5ea8", "#3d7ec9", "#c45b72", "#3d8b5c", "#c4923a", "#6f6e6a"};

    private final SleepNightRepository nights;
    private final MindTagRepository tags;
    private final MindNoteRepository notes;
    private final UserRepository users;

    public MindService(
            SleepNightRepository nights,
            MindTagRepository tags,
            MindNoteRepository notes,
            UserRepository users
    ) {
        this.nights = nights;
        this.tags = tags;
        this.notes = notes;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public MindDtos.SleepSummary list(UUID userId, LocalDate from, LocalDate to, String period) {
        List<SleepNight> rows = nights.findByUserIdAndNightDateBetweenOrderByNightDateAsc(userId, from, to);
        List<MindDtos.SleepView> views = rows.stream().map(MindDtos.SleepView::from).toList();
        String grain = period == null ? "day" : period.toLowerCase(Locale.ROOT);
        Map<String, List<SleepNight>> buckets = new LinkedHashMap<>();
        for (SleepNight night : rows) {
            buckets.computeIfAbsent(key(night.getNightDate(), grain), ignored -> new ArrayList<>()).add(night);
        }
        List<MindDtos.SleepPoint> points = new ArrayList<>();
        for (Map.Entry<String, List<SleepNight>> entry : buckets.entrySet()) {
            List<SleepNight> group = entry.getValue();
            points.add(new MindDtos.SleepPoint(
                    entry.getKey(),
                    avg(group.stream().filter(n -> n.getScore() != null).mapToInt(SleepNight::getScore).average().orElse(0)),
                    avg(group.stream().mapToInt(SleepNight::totalMin).average().orElse(0)),
                    avg(group.stream().mapToInt(SleepNight::getAwakeMin).average().orElse(0)),
                    avg(group.stream().mapToInt(SleepNight::getRemMin).average().orElse(0)),
                    avg(group.stream().mapToInt(SleepNight::getCoreMin).average().orElse(0)),
                    avg(group.stream().mapToInt(SleepNight::getDeepMin).average().orElse(0))
            ));
        }
        return new MindDtos.SleepSummary(views, points);
    }

    @Transactional
    public MindDtos.SleepView upsert(UUID userId, MindDtos.SleepUpsert request) {
        if (request.date() == null) {
            throw ApiException.badRequest("Date is required");
        }
        SleepNight night = nights.findByUserIdAndNightDate(userId, request.date()).orElseGet(() -> {
            SleepNight created = new SleepNight();
            created.setUser(users.getReferenceById(userId));
            created.setNightDate(request.date());
            return created;
        });
        if (request.startTime() != null) {
            night.setStartTime(request.startTime());
        }
        if (request.endTime() != null) {
            night.setEndTime(request.endTime());
        }
        if (request.score() != null) {
            night.setScore(Math.max(0, Math.min(100, request.score())));
        }
        if (request.awakeMin() != null) {
            night.setAwakeMin(Math.max(0, request.awakeMin()));
        }
        if (request.remMin() != null) {
            night.setRemMin(Math.max(0, request.remMin()));
        }
        if (request.coreMin() != null) {
            night.setCoreMin(Math.max(0, request.coreMin()));
        }
        if (request.deepMin() != null) {
            night.setDeepMin(Math.max(0, request.deepMin()));
        }
        if (request.source() != null && !request.source().isBlank()) {
            night.setSource(request.source().trim().toUpperCase(Locale.ROOT));
        }
        nights.save(night);
        return MindDtos.SleepView.from(night);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        SleepNight night = nights.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Sleep night not found"));
        nights.delete(night);
    }

    @Transactional
    public MindDtos.JournalBoard journal(UUID userId) {
        return board(userId);
    }

    @Transactional
    public MindDtos.TagView createTag(UUID userId, MindDtos.TagUpsert request) {
        String name = requireTagName(request == null ? null : request.name());
        MindTag existing = tags.findByUserIdAndNameIgnoreCase(userId, name).orElse(null);
        if (existing != null) {
            return MindDtos.TagView.from(existing, notes.findByUserIdAndTagId(userId, existing.getId()).size());
        }
        MindTag tag = new MindTag();
        tag.setUser(users.getReferenceById(userId));
        tag.setName(name);
        tag.setColor(colorFor(name, request == null ? null : request.color()));
        tags.save(tag);
        return MindDtos.TagView.from(tag, 0);
    }

    @Transactional
    public void deleteTag(UUID userId, UUID id) {
        MindTag tag = tags.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Tag not found"));
        for (MindNote note : notes.findByUserIdAndTagId(userId, id)) {
            note.getTags().removeIf(row -> row.getId().equals(id));
        }
        tags.delete(tag);
    }

    @Transactional
    public MindDtos.NoteView createNote(UUID userId, MindDtos.NoteUpsert request) {
        if (request == null) {
            throw ApiException.badRequest("Note is required");
        }
        String body = requireBody(request.body());
        MindNote note = new MindNote();
        note.setUser(users.getReferenceById(userId));
        note.setBody(body);
        note.getTags().addAll(resolveTags(userId, request.tagIds(), request.tagNames()));
        notes.save(note);
        return MindDtos.NoteView.from(note);
    }

    @Transactional
    public MindDtos.NoteView updateNote(UUID userId, UUID id, MindDtos.NoteUpsert request) {
        if (request == null) {
            throw ApiException.badRequest("Note is required");
        }
        MindNote note = notes.findByIdAndUserIdWithTags(id, userId).orElseThrow(() -> ApiException.notFound("Note not found"));
        if (request.body() != null) {
            note.setBody(requireBody(request.body()));
        }
        if (request.tagIds() != null || request.tagNames() != null) {
            note.getTags().clear();
            note.getTags().addAll(resolveTags(userId, request.tagIds(), request.tagNames()));
        }
        notes.save(note);
        return MindDtos.NoteView.from(note);
    }

    @Transactional
    public void deleteNote(UUID userId, UUID id) {
        MindNote note = notes.findByIdAndUserIdWithTags(id, userId).orElseThrow(() -> ApiException.notFound("Note not found"));
        note.getTags().clear();
        notes.delete(note);
    }

    private MindDtos.JournalBoard board(UUID userId) {
        List<MindNote> rows = notes.findByUserIdWithTags(userId).stream()
                .sorted(Comparator.comparing(MindNote::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();
        Map<UUID, Integer> counts = new LinkedHashMap<>();
        for (MindNote note : rows) {
            for (MindTag tag : note.getTags()) {
                counts.merge(tag.getId(), 1, Integer::sum);
            }
        }
        List<MindDtos.TagView> tagViews = tags.findByUserIdOrderByNameAsc(userId).stream()
                .map(tag -> MindDtos.TagView.from(tag, counts.getOrDefault(tag.getId(), 0)))
                .toList();
        List<MindDtos.NoteView> noteViews = rows.stream().map(MindDtos.NoteView::from).toList();
        return new MindDtos.JournalBoard(tagViews, noteViews);
    }

    private Set<MindTag> resolveTags(UUID userId, List<UUID> ids, List<String> names) {
        LinkedHashSet<MindTag> out = new LinkedHashSet<>();
        if (ids != null) {
            for (UUID id : ids) {
                if (id == null) {
                    continue;
                }
                out.add(tags.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Tag not found")));
            }
        }
        if (names != null) {
            for (String raw : names) {
                if (raw == null || raw.isBlank()) {
                    continue;
                }
                out.add(findOrCreateTag(userId, raw.trim(), null));
            }
        }
        return out;
    }

    private MindTag findOrCreateTag(UUID userId, String name, String color) {
        return tags.findByUserIdAndNameIgnoreCase(userId, name).orElseGet(() -> {
            MindTag tag = new MindTag();
            tag.setUser(users.getReferenceById(userId));
            tag.setName(name);
            tag.setColor(colorFor(name, color));
            return tags.save(tag);
        });
    }

    private static String requireBody(String body) {
        if (body == null || body.isBlank()) {
            throw ApiException.badRequest("Note is required");
        }
        String trimmed = body.trim();
        if (trimmed.length() > 8000) {
            throw ApiException.badRequest("Note is too long");
        }
        return trimmed;
    }

    private static String requireTagName(String name) {
        if (name == null || name.isBlank()) {
            throw ApiException.badRequest("Tag name is required");
        }
        String trimmed = name.trim();
        if (trimmed.length() > 48) {
            throw ApiException.badRequest("Tag name is too long");
        }
        return trimmed;
    }

    private static String colorFor(String name, String color) {
        if (color != null && color.matches("#[0-9a-fA-F]{6}")) {
            return color.toLowerCase(Locale.ROOT);
        }
        int index = Math.floorMod(name.toLowerCase(Locale.ROOT).hashCode(), TAG_COLORS.length);
        return TAG_COLORS[index];
    }

    private static String key(LocalDate date, String grain) {
        if ("month".equals(grain)) {
            return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
        }
        if ("quarter".equals(grain)) {
            return date.getYear() + "-Q" + date.get(IsoFields.QUARTER_OF_YEAR);
        }
        if ("year".equals(grain)) {
            return String.valueOf(date.getYear());
        }
        return date.toString();
    }

    private static double avg(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
