package com.verax.routine;

import com.verax.calendar.GoogleCalendarService;
import com.verax.common.ApiException;
import com.verax.common.Weekdays;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RoutineService {

    private final RoutineBlockRepository blocks;
    private final RoutineTaskRepository tasks;
    private final UserRepository users;
    private final GoogleCalendarService googleCalendar;

    public RoutineService(
            RoutineBlockRepository blocks,
            RoutineTaskRepository tasks,
            UserRepository users,
            GoogleCalendarService googleCalendar
    ) {
        this.blocks = blocks;
        this.tasks = tasks;
        this.users = users;
        this.googleCalendar = googleCalendar;
    }

    @Transactional
    public RoutineDtos.WeekView week(UUID userId) {
        List<RoutineBlock> rows = blocks.findWithTasks(userId);
        List<RoutineDtos.DayView> days = new ArrayList<>();
        for (int day = 1; day <= 7; day++) {
            int weekday = day;
            List<RoutineDtos.BlockView> visible = rows.stream()
                    .filter(block -> Weekdays.blockVisible(block.getWeekdays(), weekday))
                    .map(block -> RoutineDtos.BlockView.from(block, weekday))
                    .toList();
            days.add(new RoutineDtos.DayView(day, visible));
        }
        return new RoutineDtos.WeekView(days);
    }

    @Transactional
    public RoutineDtos.DayView day(UUID userId, int weekday) {
        if (weekday < 1 || weekday > 7) {
            throw ApiException.badRequest("Weekday must be 1 (Mon) to 7 (Sun)");
        }
        List<RoutineDtos.BlockView> visible = blocks.findWithTasks(userId).stream()
                .filter(block -> Weekdays.blockVisible(block.getWeekdays(), weekday))
                .map(block -> RoutineDtos.BlockView.from(block, weekday))
                .toList();
        return new RoutineDtos.DayView(weekday, visible);
    }

    @Transactional
    public RoutineDtos.BlockView createBlock(UUID userId, RoutineDtos.BlockUpsert request) {
        if (request.title() == null || request.title().isBlank()) {
            throw ApiException.badRequest("Title is required");
        }
        if (request.startMin() == null || request.endMin() == null) {
            throw ApiException.badRequest("Start and end times are required");
        }
        User user = users.getReferenceById(userId);
        RoutineBlock block = new RoutineBlock();
        block.setUser(user);
        apply(block, request);
        block.setSortOrder(request.startMin());
        assertNoOverlap(userId, block);
        blocks.save(block);
        schedulePush(userId, block.getId());
        return RoutineDtos.BlockView.from(block, null);
    }

    @Transactional
    public RoutineDtos.BlockView updateBlock(UUID userId, UUID id, RoutineDtos.BlockUpsert request) {
        RoutineBlock block = blocks.findWithTasks(id, userId).orElseThrow(() -> ApiException.notFound("Block not found"));
        apply(block, request);
        assertNoOverlap(userId, block);
        schedulePush(userId, block.getId());
        return RoutineDtos.BlockView.from(block, null);
    }

    @Transactional
    public void deleteBlock(UUID userId, UUID id) {
        RoutineBlock block = blocks.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Block not found"));
        String eventId = block.getGoogleEventId();
        blocks.delete(block);
        scheduleDelete(userId, eventId);
    }

    @Transactional
    public RoutineDtos.TaskView addTask(UUID userId, UUID blockId, RoutineDtos.TaskUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Subtask name is required");
        }
        RoutineBlock block = blocks.findByIdAndUserId(blockId, userId).orElseThrow(() -> ApiException.notFound("Block not found"));
        RoutineTask task = new RoutineTask();
        task.setBlock(block);
        task.setName(request.name().trim());
        task.setWeekdays(Weekdays.format(request.weekdays()));
        task.setSortOrder(block.getTasks().size());
        tasks.save(task);
        return RoutineDtos.TaskView.from(task);
    }

    @Transactional
    public RoutineDtos.TaskView updateTask(UUID userId, UUID id, RoutineDtos.TaskUpsert request) {
        RoutineTask task = tasks.findByIdAndBlockUserId(id, userId).orElseThrow(() -> ApiException.notFound("Subtask not found"));
        if (request.name() != null && !request.name().isBlank()) {
            task.setName(request.name().trim());
        }
        if (request.weekdays() != null) {
            task.setWeekdays(Weekdays.format(request.weekdays()));
        }
        return RoutineDtos.TaskView.from(task);
    }

    @Transactional
    public void deleteTask(UUID userId, UUID id) {
        RoutineTask task = tasks.findByIdAndBlockUserId(id, userId).orElseThrow(() -> ApiException.notFound("Subtask not found"));
        tasks.delete(task);
    }

    private void assertNoOverlap(UUID userId, RoutineBlock candidate) {
        UUID ignore = candidate.getId();
        for (RoutineBlock other : blocks.findWithTasks(userId)) {
            if (ignore != null && ignore.equals(other.getId())) {
                continue;
            }
            if (!Weekdays.shareAny(candidate.getWeekdays(), other.getWeekdays())) {
                continue;
            }
            if (BlockSpan.overlaps(candidate.getStartMin(), candidate.getEndMin(), other.getStartMin(), other.getEndMin())) {
                throw ApiException.conflict("That time overlaps \"" + other.getTitle() + "\"");
            }
        }
    }

    private void apply(RoutineBlock block, RoutineDtos.BlockUpsert request) {
        if (request.title() != null && !request.title().isBlank()) {
            block.setTitle(request.title().trim());
        }
        if (request.startMin() != null) {
            block.setStartMin(clampMin(request.startMin()));
            block.setSortOrder(block.getStartMin());
        }
        if (request.endMin() != null) {
            block.setEndMin(clampMin(request.endMin()));
        }
        if (Boolean.TRUE.equals(request.allWeek())) {
            block.setWeekdays(Weekdays.ALL);
        } else if (request.weekdays() != null) {
            block.setWeekdays(Weekdays.formatOrAll(request.weekdays()));
        }
        if (request.color() != null && !request.color().isBlank()) {
            block.setColor(normalizeColor(request.color()));
        }
    }

    private static String normalizeColor(String raw) {
        String value = raw.trim();
        if (value.matches("#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}")) {
            return value.toLowerCase();
        }
        throw ApiException.badRequest("Color must be a hex value like #0095f6");
    }

    private static int clampMin(int value) {
        if (value < 0) {
            return 0;
        }
        return Math.min(value, 24 * 60);
    }

    private void schedulePush(UUID userId, UUID blockId) {
        afterCommit(() -> googleCalendar.pushBlock(userId, blockId));
    }

    private void scheduleDelete(UUID userId, String eventId) {
        afterCommit(() -> googleCalendar.deleteRemote(userId, eventId));
    }

    private static void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }
}
