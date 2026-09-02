package com.verax.routine;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoutineTaskRepository extends JpaRepository<RoutineTask, UUID> {

    Optional<RoutineTask> findByIdAndBlockUserId(UUID id, UUID userId);
}
