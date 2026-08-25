package com.verax.medication;

import com.verax.common.ApiException;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class MedicationService {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("H:mm");

    private final MedicationRepository medications;
    private final MedicationDoseRepository doses;
    private final UserRepository users;

    public MedicationService(
            MedicationRepository medications,
            MedicationDoseRepository doses,
            UserRepository users
    ) {
        this.medications = medications;
        this.doses = doses;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<MedicationDtos.Response> list(UUID userId) {
        return medications.findByUserIdAndActiveTrueOrderByNameAsc(userId).stream()
                .map(MedicationDtos.Response::from)
                .toList();
    }

    @Transactional
    public MedicationDtos.Response create(UUID userId, MedicationDtos.Upsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        User user = users.getReferenceById(userId);
        Medication medication = new Medication();
        medication.setUser(user);
        apply(medication, request, true);
        medications.save(medication);
        return MedicationDtos.Response.from(medication);
    }

    @Transactional
    public MedicationDtos.Response update(UUID userId, UUID id, MedicationDtos.Upsert request) {
        Medication medication = require(userId, id);
        apply(medication, request, false);
        return MedicationDtos.Response.from(medication);
    }

    @Transactional
    public void archive(UUID userId, UUID id) {
        Medication medication = require(userId, id);
        medication.setActive(false);
        medication.setArchivedAt(Instant.now());
    }

    @Transactional
    public MedicationDtos.Today today(UUID userId) {
        LocalDate date = todayDate(userId);
        markMissed(userId, date.minusDays(1));
        ensureDoses(userId, date);
        List<MedicationDtos.DoseView> rows = doses.findToday(userId, date).stream()
                .map(MedicationDtos.DoseView::from)
                .toList();
        return new MedicationDtos.Today(date, rows);
    }

    @Transactional
    public MedicationDtos.DoseView updateDose(UUID userId, UUID doseId, MedicationDtos.DoseUpdate request) {
        MedicationDose dose = doses.findByIdAndUserId(doseId, userId)
                .orElseThrow(() -> ApiException.notFound("Dose not found"));
        DoseStatus next;
        try {
            next = DoseStatus.valueOf(request.status().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Status must be TAKEN or SKIPPED");
        }
        if (next != DoseStatus.TAKEN && next != DoseStatus.SKIPPED && next != DoseStatus.PENDING) {
            throw ApiException.badRequest("Status must be TAKEN or SKIPPED");
        }
        dose.setStatus(next);
        dose.setTakenAt(next == DoseStatus.TAKEN ? Instant.now() : null);
        return MedicationDtos.DoseView.from(dose);
    }

    private void ensureDoses(UUID userId, LocalDate date) {
        User user = users.getReferenceById(userId);
        int weekday = date.getDayOfWeek().getValue();
        for (Medication medication : medications.findByUserIdAndActiveTrueOrderByNameAsc(userId)) {
            if (date.isBefore(medication.getStartDate())) {
                continue;
            }
            if (medication.getEndDate() != null && date.isAfter(medication.getEndDate())) {
                continue;
            }
            if (!medication.getWeekdays().contains(weekday)) {
                continue;
            }
            for (String raw : medication.getTimes()) {
                LocalTime time = parseTime(raw);
                if (doses.findByMedicationIdAndDateAndScheduledTime(medication.getId(), date, time).isPresent()) {
                    continue;
                }
                MedicationDose dose = new MedicationDose();
                dose.setUser(user);
                dose.setMedication(medication);
                dose.setDate(date);
                dose.setScheduledTime(time);
                dose.setStatus(DoseStatus.PENDING);
                doses.save(dose);
            }
        }
    }

    private void markMissed(UUID userId, LocalDate date) {
        for (MedicationDose dose : doses.findByUserIdAndDateAndStatus(userId, date, DoseStatus.PENDING)) {
            dose.setStatus(DoseStatus.MISSED);
        }
    }

    private void apply(Medication medication, MedicationDtos.Upsert request, boolean creating) {
        if (request.name() != null) {
            medication.setName(request.name().trim());
        }
        if (request.dosage() != null) {
            medication.setDosage(request.dosage().trim());
        }
        if (request.instructions() != null) {
            medication.setInstructions(request.instructions());
        }
        if (request.times() != null) {
            List<String> times = new ArrayList<>();
            for (String raw : request.times()) {
                times.add(parseTime(raw).format(DateTimeFormatter.ofPattern("HH:mm")));
            }
            medication.setTimes(times);
        } else if (creating) {
            medication.setTimes(List.of("08:00"));
        }
        if (request.weekdays() != null) {
            for (Integer day : request.weekdays()) {
                if (day == null || day < 1 || day > 7) {
                    throw ApiException.badRequest("Weekdays must be 1 (Mon) through 7 (Sun)");
                }
            }
            medication.setWeekdays(request.weekdays());
        }
        if (request.startDate() != null) {
            medication.setStartDate(request.startDate());
        } else if (creating) {
            medication.setStartDate(LocalDate.now());
        }
        if (request.endDate() != null) {
            medication.setEndDate(request.endDate());
        }
        if (request.active() != null) {
            medication.setActive(request.active());
            if (request.active()) {
                medication.setArchivedAt(null);
            }
        }
    }

    private Medication require(UUID userId, UUID id) {
        return medications.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Medication not found"));
    }

    private LocalDate todayDate(UUID userId) {
        User user = users.findById(userId).orElseThrow();
        return LocalDate.now(ZoneId.of(user.getTimezone()));
    }

    static LocalTime parseTime(String raw) {
        if (raw == null || raw.isBlank()) {
            throw ApiException.badRequest("Time is required");
        }
        String value = raw.trim();
        try {
            return LocalTime.parse(value, TIME);
        } catch (DateTimeParseException ignored) {
            try {
                return LocalTime.parse(value);
            } catch (DateTimeParseException ex) {
                throw ApiException.badRequest("Times must look like 08:00");
            }
        }
    }
}
