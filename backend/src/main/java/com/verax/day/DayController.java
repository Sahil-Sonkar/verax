package com.verax.day;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/days")
public class DayController {

    private final DayService days;
    private final CurrentUser currentUser;

    public DayController(DayService days, CurrentUser currentUser) {
        this.days = days;
        this.currentUser = currentUser;
    }

    @GetMapping("/today")
    public DayDtos.Snapshot today() {
        UUID userId = currentUser.id();
        return days.snapshot(userId, days.today(userId));
    }

    @GetMapping("/{date}")
    public DayService.DayDetail get(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return days.detail(currentUser.id(), date);
    }

    @PutMapping("/{date}/habits/{habitId}")
    public DayDtos.Snapshot complete(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @PathVariable UUID habitId,
            @Valid @RequestBody DayDtos.UpsertCompletion request
    ) {
        return days.upsertCompletion(currentUser.id(), date, habitId, request);
    }

    @PutMapping("/{date}/note")
    public DayDtos.Snapshot note(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody DayDtos.NoteRequest request
    ) {
        return days.saveNote(currentUser.id(), date, request.note());
    }
}
