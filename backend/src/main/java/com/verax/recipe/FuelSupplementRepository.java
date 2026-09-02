package com.verax.recipe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FuelSupplementRepository extends JpaRepository<FuelSupplement, UUID> {

    List<FuelSupplement> findByUserIdOrderBySortOrderAscNameAsc(UUID userId);

    Optional<FuelSupplement> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);
}
