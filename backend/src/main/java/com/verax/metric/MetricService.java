package com.verax.metric;

import com.verax.category.CategoryDtos;
import com.verax.category.CategoryService;
import com.verax.common.ApiException;
import com.verax.habit.AutoCompleteService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class MetricService {

    private final MetricRepository metrics;
    private final MetricEntryRepository entries;
    private final UserRepository users;
    private final CategoryService categories;
    private final AutoCompleteService autoComplete;

    public MetricService(
            MetricRepository metrics,
            MetricEntryRepository entries,
            UserRepository users,
            CategoryService categories,
            AutoCompleteService autoComplete
    ) {
        this.metrics = metrics;
        this.entries = entries;
        this.users = users;
        this.categories = categories;
        this.autoComplete = autoComplete;
    }

    @Transactional(readOnly = true)
    public List<MetricDtos.Response> list(UUID userId) {
        return metrics.findByUserIdOrderByNameAsc(userId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public MetricDtos.Response create(UUID userId, MetricDtos.Upsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        User user = users.getReferenceById(userId);
        Metric metric = new Metric();
        metric.setUser(user);
        metric.setName(request.name().trim());
        metric.setUnit(request.unit());
        metric.setDescription(request.description());
        if (request.categoryId() != null) {
            metric.setCategory(categories.require(userId, request.categoryId()));
        }
        metrics.save(metric);
        return toResponse(metric);
    }

    @Transactional
    public MetricDtos.Response update(UUID userId, UUID id, MetricDtos.Upsert request) {
        Metric metric = require(userId, id);
        if (request.name() != null) {
            metric.setName(request.name().trim());
        }
        if (request.unit() != null) {
            metric.setUnit(request.unit());
        }
        if (request.description() != null) {
            metric.setDescription(request.description());
        }
        if (request.categoryId() != null) {
            metric.setCategory(categories.require(userId, request.categoryId()));
        }
        return toResponse(metric);
    }

    @Transactional
    public MetricDtos.EntryView addEntry(UUID userId, UUID metricId, MetricDtos.EntryUpsert request) {
        Metric metric = require(userId, metricId);
        MetricEntry entry = entries.findByMetricIdAndDate(metricId, request.date()).orElseGet(() -> {
            MetricEntry created = new MetricEntry();
            created.setMetric(metric);
            created.setDate(request.date());
            return created;
        });
        entry.setValue(request.value());
        entry.setNote(request.note());
        entries.save(entry);
        autoComplete.fromMetric(userId, metricId, request.date(), request.value(), request.note());
        return MetricDtos.EntryView.from(entry);
    }

    @Transactional(readOnly = true)
    public MetricDtos.Series series(UUID userId, UUID metricId, LocalDate start, LocalDate end) {
        Metric metric = require(userId, metricId);
        List<MetricDtos.EntryView> points = entries
                .findByMetricIdAndDateBetweenOrderByDateAsc(metricId, start, end)
                .stream()
                .map(MetricDtos.EntryView::from)
                .toList();
        return new MetricDtos.Series(toResponse(metric), points);
    }

    @Transactional(readOnly = true)
    public List<MetricDtos.EntryView> entriesOn(UUID userId, LocalDate date) {
        return metrics.findEntriesOn(userId, date).stream().map(MetricDtos.EntryView::from).toList();
    }

    public Metric require(UUID userId, UUID id) {
        return metrics.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Metric not found"));
    }

    private MetricDtos.Response toResponse(Metric metric) {
        return entries.findTopByMetricIdOrderByDateDesc(metric.getId())
                .map(latest -> new MetricDtos.Response(
                        metric.getId(),
                        metric.getName(),
                        metric.getUnit(),
                        metric.getDescription(),
                        metric.getSource(),
                        metric.getCategory() == null ? null : CategoryDtos.Response.from(metric.getCategory()),
                        latest.getValue(),
                        latest.getDate()
                ))
                .orElseGet(() -> new MetricDtos.Response(
                        metric.getId(),
                        metric.getName(),
                        metric.getUnit(),
                        metric.getDescription(),
                        metric.getSource(),
                        metric.getCategory() == null ? null : CategoryDtos.Response.from(metric.getCategory()),
                        null,
                        null
                ));
    }
}
