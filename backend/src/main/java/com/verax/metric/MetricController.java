package com.verax.metric;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/metrics")
public class MetricController {

    private final MetricService metrics;
    private final CurrentUser currentUser;

    public MetricController(MetricService metrics, CurrentUser currentUser) {
        this.metrics = metrics;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<MetricDtos.Response> list() {
        return metrics.list(currentUser.id());
    }

    @PostMapping
    public MetricDtos.Response create(@RequestBody MetricDtos.Upsert request) {
        return metrics.create(currentUser.id(), request);
    }

    @PatchMapping("/{id}")
    public MetricDtos.Response update(@PathVariable UUID id, @RequestBody MetricDtos.Upsert request) {
        return metrics.update(currentUser.id(), id, request);
    }

    @GetMapping("/{id}/entries")
    public MetricDtos.Series series(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return metrics.series(currentUser.id(), id, from, to);
    }

    @PostMapping("/{id}/entries")
    public MetricDtos.EntryView addEntry(@PathVariable UUID id, @Valid @RequestBody MetricDtos.EntryUpsert request) {
        return metrics.addEntry(currentUser.id(), id, request);
    }
}
