package com.verax.metric;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MetricEntryRepository extends JpaRepository<MetricEntry, UUID> {

    List<MetricEntry> findByMetricIdAndDateBetweenOrderByDateAsc(UUID metricId, LocalDate start, LocalDate end);

    Optional<MetricEntry> findByMetricIdAndDate(UUID metricId, LocalDate date);

    Optional<MetricEntry> findTopByMetricIdOrderByDateDesc(UUID metricId);
}
