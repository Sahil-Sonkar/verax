package com.verax.voice;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContentIdeaRepository extends JpaRepository<ContentIdea, UUID> {

    List<ContentIdea> findByUserIdOrderByUpdatedAtDesc(UUID userId);

    List<ContentIdea> findByUserIdAndPlatformOrderByUpdatedAtDesc(UUID userId, ContentIdea.Platform platform);

    Optional<ContentIdea> findByIdAndUserId(UUID id, UUID userId);
}
