package com.verax.asset;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssetRepository extends JpaRepository<Asset, UUID> {

    List<Asset> findByUserIdAndKindOrderByTakenAtDescCreatedAtDesc(UUID userId, String kind);

    Optional<Asset> findByIdAndUserId(UUID id, UUID userId);
}
