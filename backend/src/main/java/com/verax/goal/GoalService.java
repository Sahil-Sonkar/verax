package com.verax.goal;

import com.verax.category.CategoryService;
import com.verax.common.ApiException;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class GoalService {

    private final GoalRepository goals;
    private final UserRepository users;
    private final CategoryService categories;

    public GoalService(GoalRepository goals, UserRepository users, CategoryService categories) {
        this.goals = goals;
        this.users = users;
        this.categories = categories;
    }

    @Transactional(readOnly = true)
    public List<GoalDtos.Response> list(UUID userId) {
        return goals.findAllForUser(userId).stream()
                .filter(g -> g.getStatus() != GoalStatus.ARCHIVED)
                .map(GoalDtos.Response::from)
                .toList();
    }

    @Transactional
    public GoalDtos.Response create(UUID userId, GoalDtos.Upsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        User user = users.getReferenceById(userId);
        Goal goal = new Goal();
        goal.setUser(user);
        apply(userId, goal, request, true);
        goals.save(goal);
        return GoalDtos.Response.from(goal);
    }

    @Transactional
    public GoalDtos.Response update(UUID userId, UUID id, GoalDtos.Upsert request) {
        Goal goal = require(userId, id);
        apply(userId, goal, request, false);
        return GoalDtos.Response.from(goal);
    }

    @Transactional
    public void archive(UUID userId, UUID id) {
        Goal goal = require(userId, id);
        goal.setStatus(GoalStatus.ARCHIVED);
        goal.setArchivedAt(Instant.now());
    }

    @Transactional
    public GoalDtos.Response addMilestone(UUID userId, UUID goalId, GoalDtos.MilestoneUpsert request) {
        Goal goal = require(userId, goalId);
        GoalMilestone milestone = new GoalMilestone();
        milestone.setGoal(goal);
        milestone.setName(request.name());
        milestone.setTargetValue(request.targetValue());
        milestone.setReachedAt(request.reachedAt());
        milestone.setNotes(request.notes());
        milestone.setSortOrder(request.sortOrder() == null ? goal.getMilestones().size() : request.sortOrder());
        goal.getMilestones().add(milestone);
        return GoalDtos.Response.from(goal);
    }

    public Goal require(UUID userId, UUID id) {
        return goals.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Goal not found"));
    }

    private void apply(UUID userId, Goal goal, GoalDtos.Upsert request, boolean creating) {
        if (request.name() != null) {
            goal.setName(request.name().trim());
        }
        if (request.description() != null) {
            goal.setDescription(request.description());
        }
        if (request.targetValue() != null) {
            goal.setTargetValue(request.targetValue());
        }
        if (request.currentValue() != null) {
            goal.setCurrentValue(request.currentValue());
        } else if (creating) {
            goal.setCurrentValue(BigDecimal.ZERO);
        }
        if (request.baselineValue() != null) {
            goal.setBaselineValue(request.baselineValue());
        }
        if (request.unit() != null) {
            goal.setUnit(request.unit());
        }
        if (request.startDate() != null) {
            goal.setStartDate(request.startDate());
        }
        if (request.targetDate() != null) {
            goal.setTargetDate(request.targetDate());
        }
        if (request.status() != null) {
            goal.setStatus(request.status());
        }
        if (request.notes() != null) {
            goal.setNotes(request.notes());
        }
        if (request.categoryId() != null) {
            goal.setCategory(categories.require(userId, request.categoryId()));
        }
    }
}
