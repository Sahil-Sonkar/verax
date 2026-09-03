package com.verax.train;

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
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/play", "/api/train"})
public class TrainController {

    private final TrainService train;
    private final ExerciseSearchService search;
    private final CurrentUser currentUser;

    public TrainController(TrainService train, ExerciseSearchService search, CurrentUser currentUser) {
        this.train = train;
        this.search = search;
        this.currentUser = currentUser;
    }

    @GetMapping("/exercises")
    public List<TrainDtos.ExerciseHit> exercises(@RequestParam String q) {
        return search.search(q);
    }

    @GetMapping("/templates")
    public List<TrainDtos.TemplateView> templates() {
        return train.listTemplates(currentUser.id());
    }

    @PostMapping("/templates")
    public TrainDtos.TemplateView createTemplate(@RequestBody TrainDtos.TemplateUpsert request) {
        return train.createTemplate(currentUser.id(), request);
    }

    @PutMapping("/templates/{id}")
    public TrainDtos.TemplateView updateTemplate(@PathVariable UUID id, @RequestBody TrainDtos.TemplateUpsert request) {
        return train.updateTemplate(currentUser.id(), id, request);
    }

    @DeleteMapping("/templates/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTemplate(@PathVariable UUID id) {
        train.deleteTemplate(currentUser.id(), id);
    }

    @PostMapping("/sessions")
    public TrainDtos.SessionView start(@RequestBody TrainDtos.SessionStart request) {
        return train.start(currentUser.id(), request);
    }

    @GetMapping("/sessions/{id}")
    public TrainDtos.SessionView session(@PathVariable UUID id) {
        return train.getSession(currentUser.id(), id);
    }

    @PostMapping("/sessions/{id}/end")
    public TrainDtos.SessionView end(@PathVariable UUID id) {
        return train.end(currentUser.id(), id);
    }

    @DeleteMapping("/sessions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSession(@PathVariable UUID id) {
        train.deleteSession(currentUser.id(), id);
    }

    @GetMapping("/sessions/{id}/report")
    public TrainDtos.SessionReport report(@PathVariable UUID id) {
        return train.report(currentUser.id(), id);
    }

    @PostMapping("/sessions/{id}/photo")
    public TrainDtos.SessionView photo(@PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        return train.attachPhoto(currentUser.id(), id, file);
    }

    @PostMapping("/sessions/{id}/sets")
    public TrainDtos.SetView addSet(@PathVariable UUID id, @RequestBody TrainDtos.SetUpsert request) {
        return train.addSet(currentUser.id(), id, request);
    }

    @PatchMapping("/sets/{id}")
    public TrainDtos.SetView updateSet(@PathVariable UUID id, @RequestBody TrainDtos.SetUpsert request) {
        return train.updateSet(currentUser.id(), id, request);
    }

    @DeleteMapping("/sets/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSet(@PathVariable UUID id) {
        train.deleteSet(currentUser.id(), id);
    }

    @GetMapping("/sessions")
    public List<TrainDtos.SessionView> sessions(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return train.listSessions(currentUser.id(), from, to);
    }

    @GetMapping("/summary")
    public TrainDtos.Summary summary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String granularity
    ) {
        return train.summary(currentUser.id(), from, to, granularity);
    }

    @GetMapping("/activities")
    public List<TrainDtos.ActivityView> activities(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return train.listActivities(currentUser.id(), from, to);
    }

    @PostMapping("/activities")
    public TrainDtos.ActivityView addActivity(@RequestBody TrainDtos.ActivityUpsert request) {
        return train.addActivity(currentUser.id(), request);
    }

    @DeleteMapping("/activities/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteActivity(@PathVariable UUID id) {
        train.deleteActivity(currentUser.id(), id);
    }

    @GetMapping("/body/profile")
    public TrainDtos.ProfileView bodyProfile() {
        return train.profile(currentUser.id());
    }

    @PutMapping("/body/profile")
    public TrainDtos.ProfileView saveBodyProfile(@RequestBody TrainDtos.ProfileUpsert request) {
        return train.saveProfile(currentUser.id(), request);
    }

    @GetMapping("/body/logs")
    public List<TrainDtos.BodyView> bodyLogs() {
        return train.listBody(currentUser.id());
    }

    @PostMapping("/body/logs")
    public TrainDtos.BodyView saveBody(@RequestBody TrainDtos.BodyUpsert request) {
        return train.saveBody(currentUser.id(), request);
    }

    @DeleteMapping("/body/logs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBody(@PathVariable UUID id) {
        train.deleteBody(currentUser.id(), id);
    }

    @PostMapping("/body/scan")
    public TrainDtos.BodyView scan(@RequestBody TrainDtos.ScanRequest request) {
        return train.scan(currentUser.id(), request == null ? "" : request.text());
    }
}
