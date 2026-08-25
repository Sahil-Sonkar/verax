package com.verax.goal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GoalRepository extends JpaRepository<Goal, UUID> {

    @Query("""
            select distinct g from Goal g
            left join fetch g.category
            left join fetch g.milestones
            where g.user.id = :userId
            order by g.createdAt desc
            """)
    List<Goal> findAllForUser(@Param("userId") UUID userId);

    Optional<Goal> findByIdAndUserId(UUID id, UUID userId);
}
