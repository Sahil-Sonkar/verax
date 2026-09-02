package com.verax.routine;

import com.verax.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/routine")
public class RoutineController {

    private final RoutineService routine;
    private final CurrentUser currentUser;

    public RoutineController(RoutineService routine, CurrentUser currentUser) {
        this.routine = routine;
        this.currentUser = currentUser;
    }

    @GetMapping("/week")
    public RoutineDtos.WeekView week() {
        return routine.week(currentUser.id());
    }

    @GetMapping
    public RoutineDtos.DayView day(@RequestParam int weekday) {
        return routine.day(currentUser.id(), weekday);
    }

    @PostMapping("/blocks")
    public RoutineDtos.BlockView create(@RequestBody RoutineDtos.BlockUpsert request) {
        return routine.createBlock(currentUser.id(), request);
    }

    @PatchMapping("/blocks/{id}")
    public RoutineDtos.BlockView update(@PathVariable UUID id, @RequestBody RoutineDtos.BlockUpsert request) {
        return routine.updateBlock(currentUser.id(), id, request);
    }

    @DeleteMapping("/blocks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        routine.deleteBlock(currentUser.id(), id);
    }

    @PostMapping("/blocks/{id}/tasks")
    public RoutineDtos.TaskView addTask(@PathVariable UUID id, @RequestBody RoutineDtos.TaskUpsert request) {
        return routine.addTask(currentUser.id(), id, request);
    }

    @PatchMapping("/tasks/{id}")
    public RoutineDtos.TaskView updateTask(@PathVariable UUID id, @RequestBody RoutineDtos.TaskUpsert request) {
        return routine.updateTask(currentUser.id(), id, request);
    }

    @DeleteMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable UUID id) {
        routine.deleteTask(currentUser.id(), id);
    }
}
