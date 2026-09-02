package com.verax.mind;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SleepNightRepository extends JpaRepository<SleepNight, UUID> {

    List<SleepNight> findByUserIdAndNightDateBetweenOrderByNightDateAsc(UUID userId, LocalDate from, LocalDate to);

    Optional<SleepNight> findByUserIdAndNightDate(UUID userId, LocalDate nightDate);

    Optional<SleepNight> findByIdAndUserId(UUID id, UUID userId);
}
