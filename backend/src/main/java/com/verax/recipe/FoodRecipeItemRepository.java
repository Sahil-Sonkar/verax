package com.verax.recipe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FoodRecipeItemRepository extends JpaRepository<FoodRecipeItem, UUID> {

    Optional<FoodRecipeItem> findByIdAndRecipeUserId(UUID id, UUID userId);
}
