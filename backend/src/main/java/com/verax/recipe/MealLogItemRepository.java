package com.verax.recipe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MealLogItemRepository extends JpaRepository<MealLogItem, UUID> {

    Optional<MealLogItem> findByIdAndMealUserId(UUID id, UUID userId);
}
