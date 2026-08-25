package com.verax.goal;

import com.verax.category.CategoryDtos;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class GoalDtos {

    private GoalDtos() {
    }

    public record Upsert(
            @Size(max = 160) String name,
            String description,
            UUID categoryId,
            BigDecimal targetValue,
            BigDecimal currentValue,
            BigDecimal baselineValue,
            String unit,
            LocalDate startDate,
            LocalDate targetDate,
            GoalStatus status,
            String notes
    ) {
    }

    public record MilestoneUpsert(
            @Size(max = 160) String name,
            BigDecimal targetValue,
            LocalDate reachedAt,
            String notes,
            Integer sortOrder
    ) {
    }

    public record MilestoneResponse(
            UUID id,
            String name,
            BigDecimal targetValue,
            LocalDate reachedAt,
            String notes,
            int sortOrder
    ) {
        public static MilestoneResponse from(GoalMilestone milestone) {
            return new MilestoneResponse(
                    milestone.getId(),
                    milestone.getName(),
                    milestone.getTargetValue(),
                    milestone.getReachedAt(),
                    milestone.getNotes(),
                    milestone.getSortOrder()
            );
        }
    }

    public record Response(
            UUID id,
            String name,
            String description,
            CategoryDtos.Response category,
            BigDecimal targetValue,
            BigDecimal currentValue,
            BigDecimal baselineValue,
            String unit,
            LocalDate startDate,
            LocalDate targetDate,
            GoalStatus status,
            String notes,
            Double progressPercent,
            List<MilestoneResponse> milestones
    ) {
        public static Response from(Goal goal) {
            return new Response(
                    goal.getId(),
                    goal.getName(),
                    goal.getDescription(),
                    goal.getCategory() == null ? null : CategoryDtos.Response.from(goal.getCategory()),
                    goal.getTargetValue(),
                    goal.getCurrentValue(),
                    goal.getBaselineValue(),
                    goal.getUnit(),
                    goal.getStartDate(),
                    goal.getTargetDate(),
                    goal.getStatus(),
                    goal.getNotes(),
                    goal.progressPercent(),
                    goal.getMilestones().stream().map(MilestoneResponse::from).toList()
            );
        }
    }
}
