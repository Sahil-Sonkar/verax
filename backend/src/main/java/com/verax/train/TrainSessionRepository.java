package com.verax.train;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrainSessionRepository extends JpaRepository<TrainSession, UUID> {

    @Query("select distinct s from TrainSession s left join fetch s.sets left join fetch s.photoAsset where s.user.id = :userId and s.startedAt >= :from and s.startedAt < :to order by s.startedAt desc")
    List<TrainSession> findRange(@Param("userId") UUID userId, @Param("from") Instant from, @Param("to") Instant to);

    @Query("select distinct s from TrainSession s left join fetch s.sets left join fetch s.photoAsset where s.id = :id and s.user.id = :userId")
    Optional<TrainSession> findWithSets(@Param("id") UUID id, @Param("userId") UUID userId);

    Optional<TrainSession> findByIdAndUserId(UUID id, UUID userId);

    Optional<TrainSession> findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(UUID userId);

    Optional<TrainSession> findFirstByUserIdAndTemplate_IdAndEndedAtNotNullAndStartedAtLessThanOrderByStartedAtDesc(
            UUID userId, UUID templateId, Instant before);

    Optional<TrainSession> findFirstByUserIdAndNameIgnoreCaseAndEndedAtNotNullAndStartedAtLessThanOrderByStartedAtDesc(
            UUID userId, String name, Instant before);
}
