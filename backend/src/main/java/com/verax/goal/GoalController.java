package com.verax.goal;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService goals;
    private final CurrentUser currentUser;

    public GoalController(GoalService goals, CurrentUser currentUser) {
        this.goals = goals;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<GoalDtos.Response> list() {
        return goals.list(currentUser.id());
    }

    @PostMapping
    public GoalDtos.Response create(@Valid @RequestBody GoalDtos.Upsert request) {
        return goals.create(currentUser.id(), request);
    }

    @PatchMapping("/{id}")
    public GoalDtos.Response update(@PathVariable UUID id, @RequestBody GoalDtos.Upsert request) {
        return goals.update(currentUser.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public void archive(@PathVariable UUID id) {
        goals.archive(currentUser.id(), id);
    }

    @PostMapping("/{id}/milestones")
    public GoalDtos.Response addMilestone(@PathVariable UUID id, @Valid @RequestBody GoalDtos.MilestoneUpsert request) {
        return goals.addMilestone(currentUser.id(), id, request);
    }
}
