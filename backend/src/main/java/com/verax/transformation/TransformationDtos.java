package com.verax.transformation;

import com.verax.goal.GoalDtos;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class TransformationDtos {

    private TransformationDtos() {
    }

    public record Upsert(
            String name,
            LocalDate startDate,
            LocalDate endDate,
            String notes,
            List<UUID> goalIds
    ) {
    }

    public record AttachGoal(UUID goalId) {
    }

    public record Summary(
            UUID id,
            String name,
            LocalDate startDate,
            LocalDate endDate,
            String notes,
            long daysElapsed,
            long daysTotal,
            Double consistency,
            List<GoalDtos.Response> goals
    ) {
    }
}
