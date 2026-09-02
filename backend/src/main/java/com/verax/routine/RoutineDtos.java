package com.verax.routine;

import java.util.List;
import java.util.UUID;

public final class RoutineDtos {

    private RoutineDtos() {
    }

    public record TaskUpsert(String name, List<Integer> weekdays) {
    }

    public record BlockUpsert(
            String title,
            Integer startMin,
            Integer endMin,
            List<Integer> weekdays,
            Boolean allWeek,
            String color
    ) {
    }

    public record TaskView(UUID id, String name, List<Integer> weekdays) {
        public static TaskView from(RoutineTask task) {
            return new TaskView(task.getId(), task.getName(), com.verax.common.Weekdays.parse(task.getWeekdays()));
        }
    }

    public record BlockView(
            UUID id,
            String title,
            int startMin,
            int endMin,
            String color,
            List<Integer> weekdays,
            List<TaskView> tasks
    ) {
        public static BlockView from(RoutineBlock block, Integer weekday) {
            List<TaskView> tasks = block.getTasks().stream()
                    .filter(task -> weekday == null || com.verax.common.Weekdays.taskVisible(block.getWeekdays(), task.getWeekdays(), weekday))
                    .map(TaskView::from)
                    .toList();
            return new BlockView(
                    block.getId(),
                    block.getTitle(),
                    block.getStartMin(),
                    block.getEndMin(),
                    block.getColor() == null || block.getColor().isBlank() ? "#0095f6" : block.getColor(),
                    com.verax.common.Weekdays.parse(block.getWeekdays()),
                    tasks
            );
        }
    }

    public record DayView(int weekday, List<BlockView> blocks) {
    }

    public record WeekView(List<DayView> days) {
    }
}
