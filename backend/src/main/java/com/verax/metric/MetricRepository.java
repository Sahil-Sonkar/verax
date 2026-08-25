package com.verax.metric;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MetricRepository extends JpaRepository<Metric, UUID> {

    List<Metric> findByUserIdOrderByNameAsc(UUID userId);

    Optional<Metric> findByIdAndUserId(UUID id, UUID userId);

    Optional<Metric> findByUserIdAndNameIgnoreCase(UUID userId, String name);

    @Query("""
            select e from MetricEntry e
            join fetch e.metric m
            where m.user.id = :userId and e.date = :date
            """)
    List<MetricEntry> findEntriesOn(@Param("userId") UUID userId, @Param("date") LocalDate date);
}
