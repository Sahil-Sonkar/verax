package com.verax.habit;

import com.verax.category.CategoryDtos;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class HabitDtos {

    private HabitDtos() {
    }

    public record Upsert(
            @Size(max = 160) String name,
            String description,
            String icon,
            UUID categoryId,
            HabitSection section,
            FrequencyType frequencyType,
            FrequencyConfig frequencyConfig,
            BigDecimal targetValue,
            String unit,
            Importance importance,
            Integer weight,
            LocalDate startDate,
            LocalDate endDate,
            Boolean active,
            UUID autoCompleteMetricId,
            BigDecimal autoCompleteThreshold,
            UUID parentId
    ) {
    }

    public record Response(
            UUID id,
            String name,
            String description,
            String icon,
            CategoryDtos.Response category,
            HabitSection section,
            FrequencyType frequencyType,
            FrequencyConfig frequencyConfig,
            BigDecimal targetValue,
            String unit,
            Importance importance,
            int weight,
            LocalDate startDate,
            LocalDate endDate,
            boolean active,
            UUID autoCompleteMetricId,
            BigDecimal autoCompleteThreshold,
            UUID parentId,
            Instant createdAt
    ) {
        public static Response from(Habit habit) {
            return new Response(
                    habit.getId(),
                    habit.getName(),
                    habit.getDescription(),
                    habit.getIcon(),
                    habit.getCategory() == null ? null : CategoryDtos.Response.from(habit.getCategory()),
                    habit.getSection(),
                    habit.getFrequencyType(),
                    habit.getFrequencyConfig(),
                    habit.getTargetValue(),
                    habit.getUnit(),
                    habit.getImportance(),
                    habit.getWeight(),
                    habit.getStartDate(),
                    habit.getEndDate(),
                    habit.isActive(),
                    habit.getAutoCompleteMetric() == null ? null : habit.getAutoCompleteMetric().getId(),
                    habit.getAutoCompleteThreshold(),
                    habit.getParent() == null ? null : habit.getParent().getId(),
                    habit.getCreatedAt()
            );
        }
    }
}
