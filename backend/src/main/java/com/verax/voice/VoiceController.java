package com.verax.voice;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/voice")
public class VoiceController {

    private final VoiceService voice;
    private final CurrentUser currentUser;

    public VoiceController(VoiceService voice, CurrentUser currentUser) {
        this.voice = voice;
        this.currentUser = currentUser;
    }

    @GetMapping("/stats")
    public List<VoiceDtos.PlatformStats> stats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return voice.stats(currentUser.id(), from, to);
    }

    @PostMapping("/stats")
    public List<VoiceDtos.PlatformStats> importSnapshot(@Valid @RequestBody VoiceDtos.Snapshot request) {
        return voice.importSnapshot(currentUser.id(), request);
    }

    @GetMapping("/ideas")
    public List<VoiceDtos.IdeaView> ideas(@RequestParam(required = false) ContentIdea.Platform platform) {
        return voice.ideas(currentUser.id(), platform);
    }

    @PostMapping("/ideas")
    public VoiceDtos.IdeaView create(@RequestBody VoiceDtos.IdeaUpsert request) {
        return voice.createIdea(currentUser.id(), request);
    }

    @PatchMapping("/ideas/{id}")
    public VoiceDtos.IdeaView update(@PathVariable UUID id, @RequestBody VoiceDtos.IdeaUpsert request) {
        return voice.updateIdea(currentUser.id(), id, request);
    }

    @DeleteMapping("/ideas/{id}")
    public void delete(@PathVariable UUID id) {
        voice.deleteIdea(currentUser.id(), id);
    }
}
