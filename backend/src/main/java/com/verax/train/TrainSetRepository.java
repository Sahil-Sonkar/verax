package com.verax.train;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TrainSetRepository extends JpaRepository<TrainSet, UUID> {

    Optional<TrainSet> findByIdAndSessionUserId(UUID id, UUID userId);
}
