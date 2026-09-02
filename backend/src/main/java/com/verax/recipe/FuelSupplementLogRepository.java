package com.verax.recipe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FuelSupplementLogRepository extends JpaRepository<FuelSupplementLog, UUID> {

    List<FuelSupplementLog> findByUserIdAndLogDate(UUID userId, LocalDate logDate);

    Optional<FuelSupplementLog> findBySupplementIdAndLogDate(UUID supplementId, LocalDate logDate);

    void deleteBySupplementId(UUID supplementId);
}
