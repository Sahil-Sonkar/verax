package com.verax.notify;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "notification_preferences")
public class NotificationPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "morning_reminder", nullable = false)
    private boolean morningReminder = true;

    @Column(name = "evening_checkin", nullable = false)
    private boolean eveningCheckin = true;

    @Column(name = "missed_habit", nullable = false)
    private boolean missedHabit = false;

    @Column(name = "weekly_review", nullable = false)
    private boolean weeklyReview = true;

    @Column(name = "goal_milestone", nullable = false)
    private boolean goalMilestone = true;

    @Column(name = "streak_milestone", nullable = false)
    private boolean streakMilestone = true;

    @Column(name = "morning_time", nullable = false)
    private LocalTime morningTime = LocalTime.of(7, 30);

    @Column(name = "evening_time", nullable = false)
    private LocalTime eveningTime = LocalTime.of(21, 0);

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public boolean isMorningReminder() {
        return morningReminder;
    }

    public void setMorningReminder(boolean morningReminder) {
        this.morningReminder = morningReminder;
    }

    public boolean isEveningCheckin() {
        return eveningCheckin;
    }

    public void setEveningCheckin(boolean eveningCheckin) {
        this.eveningCheckin = eveningCheckin;
    }

    public boolean isMissedHabit() {
        return missedHabit;
    }

    public void setMissedHabit(boolean missedHabit) {
        this.missedHabit = missedHabit;
    }

    public boolean isWeeklyReview() {
        return weeklyReview;
    }

    public void setWeeklyReview(boolean weeklyReview) {
        this.weeklyReview = weeklyReview;
    }

    public boolean isGoalMilestone() {
        return goalMilestone;
    }

    public void setGoalMilestone(boolean goalMilestone) {
        this.goalMilestone = goalMilestone;
    }

    public boolean isStreakMilestone() {
        return streakMilestone;
    }

    public void setStreakMilestone(boolean streakMilestone) {
        this.streakMilestone = streakMilestone;
    }

    public LocalTime getMorningTime() {
        return morningTime;
    }

    public void setMorningTime(LocalTime morningTime) {
        this.morningTime = morningTime;
    }

    public LocalTime getEveningTime() {
        return eveningTime;
    }

    public void setEveningTime(LocalTime eveningTime) {
        this.eveningTime = eveningTime;
    }
}
