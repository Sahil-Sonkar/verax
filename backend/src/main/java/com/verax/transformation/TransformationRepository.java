package com.verax.transformation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransformationRepository extends JpaRepository<TransformationPeriod, UUID> {

    List<TransformationPeriod> findByUserIdOrderByStartDateDesc(UUID userId);

    Optional<TransformationPeriod> findByIdAndUserId(UUID id, UUID userId);
}
