package com.verax.integration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class IntegrationDtos {

    private IntegrationDtos() {
    }

    public record Provider(
            String key,
            String name,
            String tracks,
            String status,
            String detail
    ) {
    }

    public record IngestRequest(
            @NotBlank String provider,
            @NotBlank String metricName,
            String unit,
            @NotNull LocalDate date,
            @NotNull BigDecimal value,
            String note,
            UUID habitId
    ) {
    }

    public record IngestResult(
            UUID metricId,
            String metricName,
            BigDecimal value,
            LocalDate date,
            boolean habitUpdated
    ) {
    }

    public record Catalog(List<Provider> providers) {
    }
}
