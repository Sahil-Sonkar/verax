package com.verax.session;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final SessionService sessions;
    private final CurrentUser currentUser;

    public SessionController(SessionService sessions, CurrentUser currentUser) {
        this.sessions = sessions;
        this.currentUser = currentUser;
    }

    @GetMapping
    public SessionDtos.DaySummary list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return sessions.forDate(currentUser.id(), date);
    }

    @PostMapping
    public SessionDtos.View complete(@Valid @RequestBody SessionDtos.Create request) {
        return sessions.complete(currentUser.id(), request);
    }
}
