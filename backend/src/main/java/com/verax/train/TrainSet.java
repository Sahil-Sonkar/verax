package com.verax.train;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "train_sets")
public class TrainSet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id")
    private TrainSession session;

    @Column(name = "exercise_name", nullable = false, length = 160)
    private String exerciseName;

    @Column(nullable = false, length = 32)
    private String muscle = "OTHER";

    @Column(nullable = false, length = 16)
    private String track = "REPS";

    @Column(name = "set_index", nullable = false)
    private int setIndex = 1;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    private Integer reps;

    private BigDecimal kg;

    private Integer seconds;

    public UUID getId() {
        return id;
    }

    public TrainSession getSession() {
        return session;
    }

    public void setSession(TrainSession session) {
        this.session = session;
    }

    public String getExerciseName() {
        return exerciseName;
    }

    public void setExerciseName(String exerciseName) {
        this.exerciseName = exerciseName;
    }

    public String getMuscle() {
        return muscle;
    }

    public void setMuscle(String muscle) {
        this.muscle = muscle;
    }

    public String getTrack() {
        return track;
    }

    public void setTrack(String track) {
        this.track = track;
    }

    public int getSetIndex() {
        return setIndex;
    }

    public void setSetIndex(int setIndex) {
        this.setIndex = setIndex;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Integer getReps() {
        return reps;
    }

    public void setReps(Integer reps) {
        this.reps = reps;
    }

    public BigDecimal getKg() {
        return kg;
    }

    public void setKg(BigDecimal kg) {
        this.kg = kg;
    }

    public Integer getSeconds() {
        return seconds;
    }

    public void setSeconds(Integer seconds) {
        this.seconds = seconds;
    }
}
