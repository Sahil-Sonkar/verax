package com.verax.calendar;

import com.verax.security.CurrentUser;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/calendar/google")
public class GoogleCalendarController {

    private final GoogleCalendarService calendar;
    private final CurrentUser currentUser;

    public GoogleCalendarController(GoogleCalendarService calendar, CurrentUser currentUser) {
        this.calendar = calendar;
        this.currentUser = currentUser;
    }

    @GetMapping
    public GoogleCalendarDtos.Status status() {
        return calendar.status(currentUser.id());
    }

    @GetMapping("/auth-url")
    public GoogleCalendarDtos.AuthUrl authUrl(@RequestParam String redirectUri) {
        return calendar.authUrl(currentUser.id(), redirectUri);
    }

    @PostMapping("/callback")
    public GoogleCalendarDtos.Status callback(@RequestBody GoogleCalendarDtos.CallbackRequest request) {
        return calendar.connect(currentUser.id(), request);
    }

    @PostMapping("/sync")
    public GoogleCalendarDtos.Status sync() {
        return calendar.sync(currentUser.id());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disconnect() {
        calendar.disconnect(currentUser.id());
    }

    @GetMapping("/events")
    public GoogleCalendarDtos.EventList events(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return calendar.events(currentUser.id(), from, to);
    }
}
