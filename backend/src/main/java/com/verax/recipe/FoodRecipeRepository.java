package com.verax.recipe;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FoodRecipeRepository extends JpaRepository<FoodRecipe, UUID> {

    @Query("select distinct r from FoodRecipe r left join fetch r.items where r.user.id = :userId order by r.name")
    List<FoodRecipe> findWithItems(@Param("userId") UUID userId);

    @Query("select distinct r from FoodRecipe r left join fetch r.items where r.id = :id and r.user.id = :userId")
    Optional<FoodRecipe> findWithItems(@Param("id") UUID id, @Param("userId") UUID userId);

    Optional<FoodRecipe> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);
}
