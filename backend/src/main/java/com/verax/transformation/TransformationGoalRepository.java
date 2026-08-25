package com.verax.transformation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TransformationGoalRepository extends JpaRepository<TransformationGoal, UUID> {

    @Query("""
            select distinct tg from TransformationGoal tg
            join fetch tg.goal g
            left join fetch g.category
            left join fetch g.milestones
            where tg.transformation.id = :id
            """)
    List<TransformationGoal> findByTransformation(@Param("id") UUID transformationId);

    void deleteByTransformationIdAndGoalId(UUID transformationId, UUID goalId);
}
