package com.verax.train;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BodyLogRepository extends JpaRepository<BodyLog, UUID> {

    List<BodyLog> findByUserIdOrderByLogDateDescCreatedAtDesc(UUID userId);

    Optional<BodyLog> findByIdAndUserId(UUID id, UUID userId);

    Optional<BodyLog> findFirstByUserIdOrderByLogDateDescCreatedAtDesc(UUID userId);

    Optional<BodyLog> findFirstByUserIdAndKindOrderByLogDateDescCreatedAtDesc(UUID userId, String kind);
}
