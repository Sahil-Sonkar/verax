package com.verax.recipe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserFoodRepository extends JpaRepository<UserFood, UUID> {

    List<UserFood> findByUserIdOrderByNameAsc(UUID userId);

    List<UserFood> findByUserIdAndNameContainingIgnoreCase(UUID userId, String name);

    Optional<UserFood> findByIdAndUserId(UUID id, UUID userId);
}
