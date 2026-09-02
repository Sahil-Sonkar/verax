package com.verax.train;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrainActivityRepository extends JpaRepository<TrainActivity, UUID> {

    List<TrainActivity> findByUserIdAndActivityDateBetweenOrderByActivityDateDesc(UUID userId, LocalDate from, LocalDate to);

    Optional<TrainActivity> findByIdAndUserId(UUID id, UUID userId);
}
