package com.verax.transformation;

import com.verax.analytics.AnalyticsService;
import com.verax.common.ApiException;
import com.verax.goal.GoalDtos;
import com.verax.goal.GoalService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class TransformationService {

    private final TransformationRepository periods;
    private final TransformationGoalRepository links;
    private final UserRepository users;
    private final GoalService goals;
    private final AnalyticsService analytics;

    public TransformationService(
            TransformationRepository periods,
            TransformationGoalRepository links,
            UserRepository users,
            GoalService goals,
            AnalyticsService analytics
    ) {
        this.periods = periods;
        this.links = links;
        this.users = users;
        this.goals = goals;
        this.analytics = analytics;
    }

    @Transactional(readOnly = true)
    public List<TransformationDtos.Summary> list(UUID userId) {
        return periods.findByUserIdOrderByStartDateDesc(userId).stream()
                .map(period -> toSummary(userId, period))
                .toList();
    }

    @Transactional(readOnly = true)
    public TransformationDtos.Summary get(UUID userId, UUID id) {
        return toSummary(userId, require(userId, id));
    }

    @Transactional
    public TransformationDtos.Summary create(UUID userId, TransformationDtos.Upsert request) {
        User user = users.getReferenceById(userId);
        TransformationPeriod period = new TransformationPeriod();
        period.setUser(user);
        period.setName(request.name());
        period.setStartDate(request.startDate());
        period.setEndDate(request.endDate());
        period.setNotes(request.notes());
        periods.save(period);
        if (request.goalIds() != null) {
            for (UUID goalId : request.goalIds()) {
                link(userId, period, goalId);
            }
        }
        return toSummary(userId, period);
    }

    @Transactional
    public TransformationDtos.Summary attachGoal(UUID userId, UUID periodId, UUID goalId) {
        TransformationPeriod period = require(userId, periodId);
        link(userId, period, goalId);
        return toSummary(userId, period);
    }

    private void link(UUID userId, TransformationPeriod period, UUID goalId) {
        TransformationGoal link = new TransformationGoal();
        link.setTransformation(period);
        link.setGoal(goals.require(userId, goalId));
        links.save(link);
    }

    private TransformationPeriod require(UUID userId, UUID id) {
        return periods.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Transformation not found"));
    }

    private TransformationDtos.Summary toSummary(UUID userId, TransformationPeriod period) {
        LocalDate today = LocalDate.now();
        long total = ChronoUnit.DAYS.between(period.getStartDate(), period.getEndDate()) + 1;
        LocalDate end = today.isAfter(period.getEndDate()) ? period.getEndDate() : today;
        long elapsed = today.isBefore(period.getStartDate())
                ? 0
                : ChronoUnit.DAYS.between(period.getStartDate(), end) + 1;
        Double consistency = analytics.averageScore(userId, period.getStartDate(),
                today.isBefore(period.getStartDate()) ? period.getStartDate() : end);
        List<GoalDtos.Response> goalViews = links.findByTransformation(period.getId()).stream()
                .map(tg -> GoalDtos.Response.from(tg.getGoal()))
                .toList();
        return new TransformationDtos.Summary(
                period.getId(),
                period.getName(),
                period.getStartDate(),
                period.getEndDate(),
                period.getNotes(),
                elapsed,
                total,
                consistency,
                goalViews
        );
    }
}
