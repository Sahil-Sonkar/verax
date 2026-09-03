package com.verax.voice;

import com.verax.common.ApiException;
import com.verax.metric.Metric;
import com.verax.metric.MetricDtos;
import com.verax.metric.MetricEntryRepository;
import com.verax.metric.MetricRepository;
import com.verax.metric.MetricService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class VoiceService {

    public record MetricSpec(String key, String name, String unit) {
    }

    public record PlatformSpec(String key, String label, String provider, List<MetricSpec> metrics) {
    }

    static final List<PlatformSpec> PLATFORMS = List.of(
            new PlatformSpec("YOUTUBE", "YouTube", "YOUTUBE", List.of(
                    new MetricSpec("subscribers", "YouTube subscribers", "subs"),
                    new MetricSpec("views", "YouTube views", "views"),
                    new MetricSpec("watchHours", "YouTube watch hours", "hours"),
                    new MetricSpec("retention", "YouTube retention", "%")
            )),
            new PlatformSpec("INSTAGRAM", "Instagram", "INSTAGRAM", List.of(
                    new MetricSpec("followers", "Instagram followers", "followers"),
                    new MetricSpec("reach", "Instagram reach", "accounts"),
                    new MetricSpec("saves", "Instagram saves", "saves"),
                    new MetricSpec("shares", "Instagram shares", "shares")
            )),
            new PlatformSpec("LINKEDIN", "LinkedIn", "LINKEDIN", List.of(
                    new MetricSpec("followers", "LinkedIn followers", "followers"),
                    new MetricSpec("impressions", "LinkedIn impressions", "impressions"),
                    new MetricSpec("engagement", "LinkedIn engagement", "%"),
                    new MetricSpec("profileViews", "LinkedIn profile views", "views")
            ))
    );

    private final MetricRepository metrics;
    private final MetricEntryRepository entries;
    private final MetricService metricService;
    private final UserRepository users;
    private final ContentIdeaRepository ideas;

    public VoiceService(
            MetricRepository metrics,
            MetricEntryRepository entries,
            MetricService metricService,
            UserRepository users,
            ContentIdeaRepository ideas
    ) {
        this.metrics = metrics;
        this.entries = entries;
        this.metricService = metricService;
        this.users = users;
        this.ideas = ideas;
    }

    @Transactional(readOnly = true)
    public List<VoiceDtos.PlatformStats> stats(UUID userId, LocalDate from, LocalDate to) {
        List<VoiceDtos.PlatformStats> result = new ArrayList<>();
        for (PlatformSpec platform : PLATFORMS) {
            List<VoiceDtos.SocialMetric> rows = new ArrayList<>();
            for (MetricSpec spec : platform.metrics()) {
                Metric metric = metrics.findByUserIdAndNameIgnoreCase(userId, spec.name()).orElse(null);
                if (metric == null) {
                    rows.add(new VoiceDtos.SocialMetric(spec.key(), spec.name(), spec.unit(), null, null, List.of()));
                    continue;
                }
                var latest = entries.findTopByMetricIdOrderByDateDesc(metric.getId());
                List<VoiceDtos.MetricPoint> series = entries
                        .findByMetricIdAndDateBetweenOrderByDateAsc(metric.getId(), from, to)
                        .stream()
                        .map(row -> new VoiceDtos.MetricPoint(row.getDate(), row.getValue()))
                        .toList();
                rows.add(new VoiceDtos.SocialMetric(
                        spec.key(),
                        spec.name(),
                        metric.getUnit() == null ? spec.unit() : metric.getUnit(),
                        latest.map(row -> row.getValue()).orElse(null),
                        latest.map(row -> row.getDate()).orElse(null),
                        series
                ));
            }
            result.add(new VoiceDtos.PlatformStats(platform.key(), platform.label(), rows));
        }
        return result;
    }

    @Transactional
    public List<VoiceDtos.PlatformStats> importSnapshot(UUID userId, VoiceDtos.Snapshot request) {
        PlatformSpec platform = platform(request.platform());
        if (request.values() == null || request.values().isEmpty()) {
            throw ApiException.badRequest("Add at least one number");
        }
        for (MetricSpec spec : platform.metrics()) {
            BigDecimal value = request.values().get(spec.key());
            if (value == null) {
                continue;
            }
            Metric metric = metrics.findByUserIdAndNameIgnoreCase(userId, spec.name()).orElseGet(() -> {
                User user = users.getReferenceById(userId);
                Metric created = new Metric();
                created.setUser(user);
                created.setName(spec.name());
                created.setUnit(spec.unit());
                created.setSource(platform.provider());
                created.setDescription("Imported from " + platform.label());
                return metrics.save(created);
            });
            metric.setSource(platform.provider());
            metricService.addEntry(userId, metric.getId(), new MetricDtos.EntryUpsert(
                    request.date(),
                    value,
                    "Imported from " + platform.label()
            ));
        }
        LocalDate from = request.date().minusMonths(6);
        return stats(userId, from, request.date());
    }

    @Transactional(readOnly = true)
    public List<VoiceDtos.IdeaView> ideas(UUID userId, ContentIdea.Platform platform) {
        List<ContentIdea> rows = platform == null
                ? ideas.findByUserIdOrderByUpdatedAtDesc(userId)
                : ideas.findByUserIdAndPlatformOrderByUpdatedAtDesc(userId, platform);
        return rows.stream().map(VoiceDtos.IdeaView::from).toList();
    }

    @Transactional
    public VoiceDtos.IdeaView createIdea(UUID userId, VoiceDtos.IdeaUpsert request) {
        if (request.idea() == null || request.idea().isBlank()) {
            throw ApiException.badRequest("Idea is required");
        }
        ContentIdea row = new ContentIdea();
        row.setUser(users.getReferenceById(userId));
        apply(row, request, true);
        ideas.save(row);
        return VoiceDtos.IdeaView.from(row);
    }

    @Transactional
    public VoiceDtos.IdeaView updateIdea(UUID userId, UUID id, VoiceDtos.IdeaUpsert request) {
        ContentIdea row = ideas.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Idea not found"));
        apply(row, request, false);
        return VoiceDtos.IdeaView.from(row);
    }

    @Transactional
    public void deleteIdea(UUID userId, UUID id) {
        ContentIdea row = ideas.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Idea not found"));
        ideas.delete(row);
    }

    private void apply(ContentIdea row, VoiceDtos.IdeaUpsert request, boolean creating) {
        if (request.platform() != null) {
            row.setPlatform(request.platform());
        } else if (creating) {
            row.setPlatform(ContentIdea.Platform.YOUTUBE);
        }
        if (request.phase() != null) {
            row.setPhase(request.phase());
        } else if (creating) {
            row.setPhase(ContentIdea.Phase.IDEA);
        }
        if (request.idea() != null) {
            row.setIdea(request.idea().trim());
        }
        if (request.happened() != null) {
            row.setHappened(blankToNull(request.happened()));
        }
        if (request.learned() != null) {
            row.setLearned(blankToNull(request.learned()));
        }
        if (request.potentialPlatform() != null) {
            row.setPotentialPlatform(blankToNull(request.potentialPlatform()));
        }
        if (request.hook() != null) {
            row.setHook(blankToNull(request.hook()));
        }
    }

    private static String blankToNull(String value) {
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    static PlatformSpec platform(String key) {
        String normalized = key == null ? "" : key.trim().toUpperCase(Locale.ROOT);
        return PLATFORMS.stream()
                .filter(row -> row.key().equals(normalized))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("Unknown platform"));
    }
}
