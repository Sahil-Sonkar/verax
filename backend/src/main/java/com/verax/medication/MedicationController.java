package com.verax.medication;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medications")
public class MedicationController {

    private final MedicationService medications;
    private final CurrentUser currentUser;

    public MedicationController(MedicationService medications, CurrentUser currentUser) {
        this.medications = medications;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<MedicationDtos.Response> list() {
        return medications.list(currentUser.id());
    }

    @GetMapping("/today")
    public MedicationDtos.Today today() {
        return medications.today(currentUser.id());
    }

    @PostMapping
    public MedicationDtos.Response create(@Valid @RequestBody MedicationDtos.Upsert request) {
        return medications.create(currentUser.id(), request);
    }

    @PatchMapping("/{id}")
    public MedicationDtos.Response update(@PathVariable UUID id, @RequestBody MedicationDtos.Upsert request) {
        return medications.update(currentUser.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public void archive(@PathVariable UUID id) {
        medications.archive(currentUser.id(), id);
    }

    @PutMapping("/doses/{doseId}")
    public MedicationDtos.DoseView updateDose(@PathVariable UUID doseId, @Valid @RequestBody MedicationDtos.DoseUpdate request) {
        return medications.updateDose(currentUser.id(), doseId, request);
    }
}
