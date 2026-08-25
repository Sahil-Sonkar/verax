package com.verax.transformation;

import com.verax.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transformations")
public class TransformationController {

    private final TransformationService transformations;
    private final CurrentUser currentUser;

    public TransformationController(TransformationService transformations, CurrentUser currentUser) {
        this.transformations = transformations;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<TransformationDtos.Summary> list() {
        return transformations.list(currentUser.id());
    }

    @GetMapping("/{id}")
    public TransformationDtos.Summary get(@PathVariable UUID id) {
        return transformations.get(currentUser.id(), id);
    }

    @PostMapping
    public TransformationDtos.Summary create(@RequestBody TransformationDtos.Upsert request) {
        return transformations.create(currentUser.id(), request);
    }

    @PostMapping("/{id}/goals")
    public TransformationDtos.Summary attach(
            @PathVariable UUID id,
            @RequestBody TransformationDtos.AttachGoal request
    ) {
        return transformations.attachGoal(currentUser.id(), id, request.goalId());
    }
}
