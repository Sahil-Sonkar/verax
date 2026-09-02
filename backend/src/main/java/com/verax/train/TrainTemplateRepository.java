package com.verax.train;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrainTemplateRepository extends JpaRepository<TrainTemplate, UUID> {

    @Query("select distinct t from TrainTemplate t left join fetch t.exercises where t.user.id = :userId order by t.sortOrder, t.name")
    List<TrainTemplate> findWithExercises(@Param("userId") UUID userId);

    Optional<TrainTemplate> findByIdAndUserId(UUID id, UUID userId);

    @Query("select distinct t from TrainTemplate t left join fetch t.exercises where t.id = :id and t.user.id = :userId")
    Optional<TrainTemplate> findWithExercises(@Param("id") UUID id, @Param("userId") UUID userId);

    long countByUserId(UUID userId);
}
