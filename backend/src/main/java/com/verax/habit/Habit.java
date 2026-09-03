package com.verax.habit;

import com.verax.category.Category;
import com.verax.metric.Metric;
import com.verax.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "habits")
public class Habit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(length = 64)
    private String icon;

    @Column(nullable = false)
    private boolean tracked = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private HabitSection section = HabitSection.GROWTH;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency_type", nullable = false, length = 32)
    private FrequencyType frequencyType = FrequencyType.DAILY;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "frequency_config", nullable = false, columnDefinition = "jsonb")
    private FrequencyConfig frequencyConfig = new FrequencyConfig();

    @Column(name = "target_value")
    private BigDecimal targetValue;

    @Column(length = 40)
    private String unit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Importance importance = Importance.IMPORTANT;

    @Column(nullable = false)
    private int weight = 2;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auto_complete_metric_id")
    private Metric autoCompleteMetric;

    @Column(name = "auto_complete_threshold")
    private BigDecimal autoCompleteThreshold;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Habit parent;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public boolean isInWindow(LocalDate date) {
        if (date.isBefore(startDate)) {
            return false;
        }
        return endDate == null || !date.isAfter(endDate);
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public boolean isTracked() {
        return tracked;
    }

    public void setTracked(boolean tracked) {
        this.tracked = tracked;
    }

    public HabitSection getSection() {
        return section;
    }

    public void setSection(HabitSection section) {
        this.section = section;
    }

    public FrequencyType getFrequencyType() {
        return frequencyType;
    }

    public void setFrequencyType(FrequencyType frequencyType) {
        this.frequencyType = frequencyType;
    }

    public FrequencyConfig getFrequencyConfig() {
        return frequencyConfig == null ? new FrequencyConfig() : frequencyConfig;
    }

    public void setFrequencyConfig(FrequencyConfig frequencyConfig) {
        this.frequencyConfig = frequencyConfig == null ? new FrequencyConfig() : frequencyConfig;
    }

    public BigDecimal getTargetValue() {
        return targetValue;
    }

    public void setTargetValue(BigDecimal targetValue) {
        this.targetValue = targetValue;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Importance getImportance() {
        return importance;
    }

    public void setImportance(Importance importance) {
        this.importance = importance;
    }

    public int getWeight() {
        return weight;
    }

    public void setWeight(int weight) {
        this.weight = weight;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Instant getArchivedAt() {
        return archivedAt;
    }

    public void setArchivedAt(Instant archivedAt) {
        this.archivedAt = archivedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Metric getAutoCompleteMetric() {
        return autoCompleteMetric;
    }

    public void setAutoCompleteMetric(Metric autoCompleteMetric) {
        this.autoCompleteMetric = autoCompleteMetric;
    }

    public BigDecimal getAutoCompleteThreshold() {
        return autoCompleteThreshold;
    }

    public void setAutoCompleteThreshold(BigDecimal autoCompleteThreshold) {
        this.autoCompleteThreshold = autoCompleteThreshold;
    }

    public Habit getParent() {
        return parent;
    }

    public void setParent(Habit parent) {
        this.parent = parent;
    }
}
