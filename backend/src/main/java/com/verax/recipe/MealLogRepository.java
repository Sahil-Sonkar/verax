package com.verax.recipe;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MealLogRepository extends JpaRepository<MealLog, UUID> {

    @Query("select distinct m from MealLog m left join fetch m.items where m.user.id = :userId and m.logDate = :date order by m.createdAt")
    List<MealLog> findDay(@Param("userId") UUID userId, @Param("date") LocalDate date);

    @Query("select distinct m from MealLog m left join fetch m.items where m.user.id = :userId and m.logDate between :from and :to order by m.logDate, m.createdAt")
    List<MealLog> findRange(@Param("userId") UUID userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    Optional<MealLog> findByIdAndUserId(UUID id, UUID userId);

    @Query("select distinct m from MealLog m left join fetch m.items where m.id = :id and m.user.id = :userId")
    Optional<MealLog> findWithItems(@Param("id") UUID id, @Param("userId") UUID userId);
}
