package com.verax.habit;

import com.verax.category.Category;
import com.verax.category.CategoryDtos;
import com.verax.category.CategoryService;
import com.verax.common.ApiException;
import com.verax.metric.Metric;
import com.verax.metric.MetricRepository;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class HabitService {

    private final HabitRepository habits;
    private final UserRepository users;
    private final CategoryService categories;
    private final MetricRepository metrics;

    public HabitService(HabitRepository habits, UserRepository users, CategoryService categories, MetricRepository metrics) {
        this.habits = habits;
        this.users = users;
        this.categories = categories;
        this.metrics = metrics;
    }

    @Transactional(readOnly = true)
    public List<HabitDtos.Response> list(UUID userId, boolean includeArchived) {
        List<Habit> rows = includeArchived
                ? habits.findByUserIdOrderByActiveDescSectionAscNameAsc(userId)
                : habits.findByUserIdAndActiveTrueOrderBySectionAscNameAsc(userId);
        return rows.stream().map(HabitDtos.Response::from).toList();
    }

    @Transactional(readOnly = true)
    public HabitDtos.Response get(UUID userId, UUID id) {
        return HabitDtos.Response.from(require(userId, id));
    }

    @Transactional
    public HabitDtos.Response create(UUID userId, HabitDtos.Upsert request) {
        User user = users.getReferenceById(userId);
        Habit habit = new Habit();
        habit.setUser(user);
        apply(userId, habit, request, true);
        habits.save(habit);
        return HabitDtos.Response.from(habit);
    }

    @Transactional
    public HabitDtos.Response update(UUID userId, UUID id, HabitDtos.Upsert request) {
        Habit habit = require(userId, id);
        apply(userId, habit, request, false);
        return HabitDtos.Response.from(habit);
    }

    @Transactional
    public void archive(UUID userId, UUID id) {
        Habit habit = require(userId, id);
        habit.setActive(false);
        habit.setArchivedAt(java.time.Instant.now());
    }

    public Habit require(UUID userId, UUID id) {
        return habits.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Habit not found"));
    }

    private void apply(UUID userId, Habit habit, HabitDtos.Upsert request, boolean creating) {
        if (request.name() != null) {
            habit.setName(request.name().trim());
        } else if (creating) {
            throw ApiException.badRequest("Name is required");
        }
        if (request.description() != null) {
            habit.setDescription(request.description());
        }
        if (request.icon() != null) {
            habit.setIcon(request.icon());
        }
        if (request.tracked() != null) {
            habit.setTracked(request.tracked());
        }
        if (request.section() != null) {
            habit.setSection(request.section());
        }
        if (request.frequencyType() != null) {
            habit.setFrequencyType(request.frequencyType());
        }
        if (request.frequencyConfig() != null) {
            habit.setFrequencyConfig(request.frequencyConfig());
        }
        if (request.targetValue() != null) {
            habit.setTargetValue(request.targetValue());
        }
        if (request.unit() != null) {
            habit.setUnit(request.unit());
        }
        if (request.importance() != null) {
            habit.setImportance(request.importance());
            if (request.weight() == null) {
                habit.setWeight(request.importance().defaultWeight());
            }
        } else if (creating) {
            habit.setWeight(habit.getImportance().defaultWeight());
        }
        if (request.weight() != null) {
            if (request.weight() < 1 || request.weight() > 5) {
                throw ApiException.badRequest("Weight must be between 1 and 5");
            }
            habit.setWeight(request.weight());
        }
        if (request.startDate() != null) {
            habit.setStartDate(request.startDate());
        } else if (creating) {
            habit.setStartDate(LocalDate.now());
        }
        if (request.endDate() != null) {
            habit.setEndDate(request.endDate());
        }
        if (request.categoryId() != null) {
            Category category = categories.require(userId, request.categoryId());
            habit.setCategory(category);
        }
        if (creating && request.active() != null) {
            habit.setActive(request.active());
        } else if (!creating && request.active() != null) {
            habit.setActive(request.active());
            if (request.active()) {
                habit.setArchivedAt(null);
            }
        }
        if (request.autoCompleteMetricId() != null) {
            Metric metric = metrics.findByIdAndUserId(request.autoCompleteMetricId(), userId)
                    .orElseThrow(() -> ApiException.notFound("Metric not found"));
            habit.setAutoCompleteMetric(metric);
        }
        if (request.autoCompleteThreshold() != null) {
            habit.setAutoCompleteThreshold(request.autoCompleteThreshold());
        }
        if (request.parentId() != null) {
            Habit parent = require(userId, request.parentId());
            if (parent.getId().equals(habit.getId())) {
                throw ApiException.badRequest("A habit cannot be its own parent");
            }
            habit.setParent(parent);
        }
    }
}
