package com.verax.day;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface DayLogRepository extends JpaRepository<DayLog, UUID> {

    Optional<DayLog> findByUserIdAndDate(UUID userId, LocalDate date);
}
