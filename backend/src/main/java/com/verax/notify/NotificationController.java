package com.verax.notify;

import com.verax.common.ApiException;
import com.verax.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/settings/notifications")
public class NotificationController {

    private final NotificationPreferencesRepository repository;
    private final CurrentUser currentUser;

    public NotificationController(NotificationPreferencesRepository repository, CurrentUser currentUser) {
        this.repository = repository;
        this.currentUser = currentUser;
    }

    @GetMapping
    public NotificationDtos.Response get() {
        return NotificationDtos.Response.from(require(currentUser.id()));
    }

    @PutMapping
    public NotificationDtos.Response update(@RequestBody NotificationDtos.Update request) {
        NotificationPreferences prefs = require(currentUser.id());
        if (request.morningReminder() != null) {
            prefs.setMorningReminder(request.morningReminder());
        }
        if (request.eveningCheckin() != null) {
            prefs.setEveningCheckin(request.eveningCheckin());
        }
        if (request.missedHabit() != null) {
            prefs.setMissedHabit(request.missedHabit());
        }
        if (request.weeklyReview() != null) {
            prefs.setWeeklyReview(request.weeklyReview());
        }
        if (request.goalMilestone() != null) {
            prefs.setGoalMilestone(request.goalMilestone());
        }
        if (request.streakMilestone() != null) {
            prefs.setStreakMilestone(request.streakMilestone());
        }
        if (request.morningTime() != null) {
            prefs.setMorningTime(request.morningTime());
        }
        if (request.eveningTime() != null) {
            prefs.setEveningTime(request.eveningTime());
        }
        repository.save(prefs);
        return NotificationDtos.Response.from(prefs);
    }

    private NotificationPreferences require(UUID userId) {
        return repository.findByUserId(userId).orElseThrow(() -> ApiException.notFound("Preferences not found"));
    }

    public static final class NotificationDtos {
        public record Update(
                Boolean morningReminder,
                Boolean eveningCheckin,
                Boolean missedHabit,
                Boolean weeklyReview,
                Boolean goalMilestone,
                Boolean streakMilestone,
                LocalTime morningTime,
                LocalTime eveningTime
        ) {
        }

        public record Response(
                boolean morningReminder,
                boolean eveningCheckin,
                boolean missedHabit,
                boolean weeklyReview,
                boolean goalMilestone,
                boolean streakMilestone,
                LocalTime morningTime,
                LocalTime eveningTime
        ) {
            public static Response from(NotificationPreferences prefs) {
                return new Response(
                        prefs.isMorningReminder(),
                        prefs.isEveningCheckin(),
                        prefs.isMissedHabit(),
                        prefs.isWeeklyReview(),
                        prefs.isGoalMilestone(),
                        prefs.isStreakMilestone(),
                        prefs.getMorningTime(),
                        prefs.getEveningTime()
                );
            }
        }
    }
}
