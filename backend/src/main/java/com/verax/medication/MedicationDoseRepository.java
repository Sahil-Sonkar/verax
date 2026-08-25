package com.verax.medication;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicationDoseRepository extends JpaRepository<MedicationDose, UUID> {

    @Query("""
            select d from MedicationDose d
            join fetch d.medication
            where d.user.id = :userId and d.date = :date
            order by d.scheduledTime, d.medication.name
            """)
    List<MedicationDose> findToday(@Param("userId") UUID userId, @Param("date") LocalDate date);

    Optional<MedicationDose> findByMedicationIdAndDateAndScheduledTime(UUID medicationId, LocalDate date, LocalTime scheduledTime);

    Optional<MedicationDose> findByIdAndUserId(UUID id, UUID userId);

    List<MedicationDose> findByUserIdAndDateAndStatus(UUID userId, LocalDate date, DoseStatus status);
}
