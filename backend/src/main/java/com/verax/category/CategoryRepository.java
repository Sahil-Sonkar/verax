package com.verax.category;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    List<Category> findByUserIdOrderBySortOrderAscNameAsc(UUID userId);

    Optional<Category> findByIdAndUserId(UUID id, UUID userId);

    Optional<Category> findByUserIdAndSystemKey(UUID userId, String systemKey);

    boolean existsByUserIdAndSlug(UUID userId, String slug);
}
