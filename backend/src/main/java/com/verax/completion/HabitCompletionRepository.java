package com.verax.completion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HabitCompletionRepository extends JpaRepository<HabitCompletion, UUID> {

    Optional<HabitCompletion> findByHabitIdAndDate(UUID habitId, LocalDate date);

    List<HabitCompletion> findByUserIdAndDate(UUID userId, LocalDate date);

    @Query("""
            select c from HabitCompletion c
            join fetch c.habit
            where c.user.id = :userId
              and c.date between :start and :end
            """)
    List<HabitCompletion> findInRange(@Param("userId") UUID userId,
                                      @Param("start") LocalDate start,
                                      @Param("end") LocalDate end);

    long countByHabitIdAndDateBetweenAndStatusIn(
            UUID habitId,
            LocalDate start,
            LocalDate end,
            List<CompletionStatus> statuses
    );
}
