package com.verax.routine;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoutineBlockRepository extends JpaRepository<RoutineBlock, UUID> {

    @Query("select distinct b from RoutineBlock b left join fetch b.tasks where b.user.id = :userId order by b.startMin, b.sortOrder")
    List<RoutineBlock> findWithTasks(@Param("userId") UUID userId);

    Optional<RoutineBlock> findByIdAndUserId(UUID id, UUID userId);

    Optional<RoutineBlock> findByUserIdAndGoogleEventId(UUID userId, String googleEventId);

    @Query("select distinct b from RoutineBlock b left join fetch b.tasks where b.id = :id and b.user.id = :userId")
    Optional<RoutineBlock> findWithTasks(@Param("id") UUID id, @Param("userId") UUID userId);

    long countByUserId(UUID userId);
}
