package com.verax.metric;

import com.verax.category.CategoryDtos;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class MetricDtos {

    private MetricDtos() {
    }

    public record Upsert(String name, String unit, String description, UUID categoryId) {
    }

    public record EntryUpsert(@NotNull LocalDate date, @NotNull BigDecimal value, String note) {
    }

    public record EntryView(
            UUID id,
            UUID metricId,
            String metricName,
            String unit,
            LocalDate date,
            BigDecimal value,
            String note
    ) {
        public static EntryView from(MetricEntry entry) {
            return new EntryView(
                    entry.getId(),
                    entry.getMetric().getId(),
                    entry.getMetric().getName(),
                    entry.getMetric().getUnit(),
                    entry.getDate(),
                    entry.getValue(),
                    entry.getNote()
            );
        }
    }

    public record Response(
            UUID id,
            String name,
            String unit,
            String description,
            String source,
            CategoryDtos.Response category,
            BigDecimal latestValue,
            LocalDate latestDate
    ) {
    }

    public record Series(Response metric, List<EntryView> entries) {
    }
}
