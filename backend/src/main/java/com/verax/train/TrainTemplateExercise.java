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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "train_template_exercises")
public class TrainTemplateExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id")
    private TrainTemplate template;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 32)
    private String muscle = "OTHER";

    @Column(nullable = false, length = 16)
    private String track = "REPS";

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "planned_sets", nullable = false, columnDefinition = "jsonb")
    private List<PlannedSet> plannedSets = new ArrayList<>();

    public UUID getId() {
        return id;
    }

    public TrainTemplate getTemplate() {
        return template;
    }

    public void setTemplate(TrainTemplate template) {
        this.template = template;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public List<PlannedSet> getPlannedSets() {
        return plannedSets;
    }

    public void setPlannedSets(List<PlannedSet> plannedSets) {
        this.plannedSets = plannedSets == null ? new ArrayList<>() : plannedSets;
    }
}
