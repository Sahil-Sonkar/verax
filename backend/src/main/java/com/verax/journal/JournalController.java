package com.verax.journal;

import com.verax.security.CurrentUser;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/journal")
public class JournalController {

    private final JournalService journal;
    private final CurrentUser currentUser;

    public JournalController(JournalService journal, CurrentUser currentUser) {
        this.journal = journal;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<JournalDtos.Response> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return journal.list(currentUser.id(), from, to);
    }

    @GetMapping("/{date}")
    public JournalDtos.Response get(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return journal.get(currentUser.id(), date);
    }

    @PutMapping("/{date}")
    public JournalDtos.Response upsert(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody JournalDtos.Upsert request
    ) {
        return journal.upsert(currentUser.id(), date, request);
    }
}
