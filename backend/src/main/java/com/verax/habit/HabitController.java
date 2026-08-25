package com.verax.habit;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/habits")
public class HabitController {

    private final HabitService habits;
    private final CurrentUser currentUser;

    public HabitController(HabitService habits, CurrentUser currentUser) {
        this.habits = habits;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<HabitDtos.Response> list(@RequestParam(defaultValue = "false") boolean includeArchived) {
        return habits.list(currentUser.id(), includeArchived);
    }

    @GetMapping("/{id}")
    public HabitDtos.Response get(@PathVariable UUID id) {
        return habits.get(currentUser.id(), id);
    }

    @PostMapping
    public HabitDtos.Response create(@Valid @RequestBody HabitDtos.Upsert request) {
        return habits.create(currentUser.id(), request);
    }

    @PatchMapping("/{id}")
    public HabitDtos.Response update(@PathVariable UUID id, @RequestBody HabitDtos.Upsert request) {
        return habits.update(currentUser.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public void archive(@PathVariable UUID id) {
        habits.archive(currentUser.id(), id);
    }
}
