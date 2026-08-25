package com.verax.habit;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HabitRepository extends JpaRepository<Habit, UUID> {

    @EntityGraph(attributePaths = {"category", "autoCompleteMetric", "parent"})
    List<Habit> findByUserIdAndActiveTrueOrderBySectionAscNameAsc(UUID userId);

    @EntityGraph(attributePaths = {"category", "autoCompleteMetric", "parent"})
    List<Habit> findByUserIdOrderByActiveDescSectionAscNameAsc(UUID userId);

    @EntityGraph(attributePaths = {"category", "autoCompleteMetric", "parent"})
    Optional<Habit> findByIdAndUserId(UUID id, UUID userId);

    @Query("""
            select h from Habit h
            left join fetch h.category
            left join fetch h.autoCompleteMetric
            left join fetch h.parent
            where h.user.id = :userId
              and h.startDate <= :end
              and (h.endDate is null or h.endDate >= :start)
            """)
    List<Habit> findRelevant(@Param("userId") UUID userId,
                             @Param("start") LocalDate start,
                             @Param("end") LocalDate end);

    List<Habit> findByUserIdAndAutoCompleteMetricIdAndActiveTrue(UUID userId, UUID autoCompleteMetricId);

    Optional<Habit> findByUserIdAndNameIgnoreCase(UUID userId, String name);

    List<Habit> findByParentId(UUID parentId);
}
