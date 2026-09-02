package com.verax.mind;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MindNoteRepository extends JpaRepository<MindNote, UUID> {

    @Query("""
            select distinct n from MindNote n
            left join fetch n.tags
            where n.user.id = :userId
            """)
    List<MindNote> findByUserIdWithTags(@Param("userId") UUID userId);

    @Query("""
            select distinct n from MindNote n
            left join fetch n.tags
            where n.id = :id and n.user.id = :userId
            """)
    Optional<MindNote> findByIdAndUserIdWithTags(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("select n from MindNote n join n.tags t where t.id = :tagId and n.user.id = :userId")
    List<MindNote> findByUserIdAndTagId(@Param("userId") UUID userId, @Param("tagId") UUID tagId);

    long countByUserId(UUID userId);
}
