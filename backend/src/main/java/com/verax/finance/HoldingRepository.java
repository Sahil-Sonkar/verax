package com.verax.finance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HoldingRepository extends JpaRepository<Holding, UUID> {

    List<Holding> findByUserIdOrderByNameAsc(UUID userId);

    Optional<Holding> findByIdAndUserId(UUID id, UUID userId);
}
