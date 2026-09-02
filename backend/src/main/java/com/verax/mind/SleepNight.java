package com.verax.mind;

import com.verax.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;
import java.time.LocalDate;

@Entity
@Table(name = "sleep_nights")
public class SleepNight {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "night_date", nullable = false)
    private LocalDate nightDate;

    @Column(name = "start_time", length = 8)
    private String startTime;

    @Column(name = "end_time", length = 8)
    private String endTime;

    private Integer score;

    @Column(name = "awake_min", nullable = false)
    private int awakeMin;

    @Column(name = "rem_min", nullable = false)
    private int remMin;

    @Column(name = "core_min", nullable = false)
    private int coreMin;

    @Column(name = "deep_min", nullable = false)
    private int deepMin;

    @Column(nullable = false, length = 24)
    private String source = "MANUAL";

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDate getNightDate() {
        return nightDate;
    }

    public void setNightDate(LocalDate nightDate) {
        this.nightDate = nightDate;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public int getAwakeMin() {
        return awakeMin;
    }

    public void setAwakeMin(int awakeMin) {
        this.awakeMin = awakeMin;
    }

    public int getRemMin() {
        return remMin;
    }

    public void setRemMin(int remMin) {
        this.remMin = remMin;
    }

    public int getCoreMin() {
        return coreMin;
    }

    public void setCoreMin(int coreMin) {
        this.coreMin = coreMin;
    }

    public int getDeepMin() {
        return deepMin;
    }

    public void setDeepMin(int deepMin) {
        this.deepMin = deepMin;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public int totalMin() {
        return awakeMin + remMin + coreMin + deepMin;
    }
}
