package com.verax.recipe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface WaterLogRepository extends JpaRepository<WaterLog, UUID> {

    Optional<WaterLog> findByUserIdAndLogDate(UUID userId, LocalDate logDate);
}
