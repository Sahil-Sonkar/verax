package com.verax.mind;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MindTagRepository extends JpaRepository<MindTag, UUID> {

    List<MindTag> findByUserIdOrderByNameAsc(UUID userId);

    Optional<MindTag> findByIdAndUserId(UUID id, UUID userId);

    Optional<MindTag> findByUserIdAndNameIgnoreCase(UUID userId, String name);

    long countByUserId(UUID userId);
}
