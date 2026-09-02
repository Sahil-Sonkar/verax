package com.verax.mind;

import com.verax.security.CurrentUser;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/mind")
public class MindController {

    private final MindService mind;
    private final CurrentUser currentUser;

    public MindController(MindService mind, CurrentUser currentUser) {
        this.mind = mind;
        this.currentUser = currentUser;
    }

    @GetMapping("/sleep")
    public MindDtos.SleepSummary sleep(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "day") String period
    ) {
        return mind.list(currentUser.id(), from, to, period);
    }

    @PutMapping("/sleep")
    public MindDtos.SleepView upsert(@RequestBody MindDtos.SleepUpsert request) {
        return mind.upsert(currentUser.id(), request);
    }

    @DeleteMapping("/sleep/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        mind.delete(currentUser.id(), id);
    }

    @GetMapping("/journal")
    public MindDtos.JournalBoard journal() {
        return mind.journal(currentUser.id());
    }

    @PostMapping("/journal/tags")
    public MindDtos.TagView createTag(@RequestBody MindDtos.TagUpsert request) {
        return mind.createTag(currentUser.id(), request);
    }

    @DeleteMapping("/journal/tags/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTag(@PathVariable UUID id) {
        mind.deleteTag(currentUser.id(), id);
    }

    @PostMapping("/journal/notes")
    public MindDtos.NoteView createNote(@RequestBody MindDtos.NoteUpsert request) {
        return mind.createNote(currentUser.id(), request);
    }

    @PatchMapping("/journal/notes/{id}")
    public MindDtos.NoteView updateNote(@PathVariable UUID id, @RequestBody MindDtos.NoteUpsert request) {
        return mind.updateNote(currentUser.id(), id, request);
    }

    @DeleteMapping("/journal/notes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNote(@PathVariable UUID id) {
        mind.deleteNote(currentUser.id(), id);
    }
}
