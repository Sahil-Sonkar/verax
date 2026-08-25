package com.verax.medication;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

public final class MedicationDtos {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private MedicationDtos() {
    }

    public record Upsert(
            @Size(max = 160) String name,
            String dosage,
            String instructions,
            List<String> times,
            List<Integer> weekdays,
            LocalDate startDate,
            LocalDate endDate,
            Boolean active
    ) {
    }

    public record Response(
            UUID id,
            String name,
            String dosage,
            String instructions,
            List<String> times,
            List<Integer> weekdays,
            LocalDate startDate,
            LocalDate endDate,
            boolean active
    ) {
        public static Response from(Medication medication) {
            return new Response(
                    medication.getId(),
                    medication.getName(),
                    medication.getDosage(),
                    medication.getInstructions(),
                    medication.getTimes(),
                    medication.getWeekdays(),
                    medication.getStartDate(),
                    medication.getEndDate(),
                    medication.isActive()
            );
        }
    }

    public record DoseView(
            UUID id,
            UUID medicationId,
            String name,
            String dosage,
            String scheduledTime,
            DoseStatus status,
            Instant takenAt
    ) {
        public static DoseView from(MedicationDose dose) {
            return new DoseView(
                    dose.getId(),
                    dose.getMedication().getId(),
                    dose.getMedication().getName(),
                    dose.getMedication().getDosage(),
                    dose.getScheduledTime().format(TIME),
                    dose.getStatus(),
                    dose.getTakenAt()
            );
        }
    }

    public record Today(LocalDate date, List<DoseView> doses) {
    }

    public record DoseUpdate(@NotBlank String status) {
    }
}
