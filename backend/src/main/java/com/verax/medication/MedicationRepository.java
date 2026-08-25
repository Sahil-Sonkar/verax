package com.verax.medication;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicationRepository extends JpaRepository<Medication, UUID> {

    List<Medication> findByUserIdAndActiveTrueOrderByNameAsc(UUID userId);

    List<Medication> findByUserIdOrderByActiveDescNameAsc(UUID userId);

    Optional<Medication> findByIdAndUserId(UUID id, UUID userId);
}
