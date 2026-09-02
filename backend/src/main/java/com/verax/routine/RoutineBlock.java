package com.verax.routine;

import com.verax.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "routine_blocks")
public class RoutineBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(name = "start_min", nullable = false)
    private int startMin;

    @Column(name = "end_min", nullable = false)
    private int endMin;

    @Column(nullable = false, length = 32)
    private String weekdays = "1,2,3,4,5,6,7";

    @Column(nullable = false, length = 16)
    private String color = "#0095f6";

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "google_event_id", length = 128)
    private String googleEventId;

    @Column(name = "google_etag", length = 128)
    private String googleEtag;

    @Column(name = "google_updated_at")
    private Instant googleUpdatedAt;

    @Column(nullable = false, length = 16)
    private String origin = "VERAX";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "block", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder, id")
    private List<RoutineTask> tasks = new ArrayList<>();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public int getStartMin() {
        return startMin;
    }

    public void setStartMin(int startMin) {
        this.startMin = startMin;
    }

    public int getEndMin() {
        return endMin;
    }

    public void setEndMin(int endMin) {
        this.endMin = endMin;
    }

    public String getWeekdays() {
        return weekdays;
    }

    public void setWeekdays(String weekdays) {
        this.weekdays = weekdays;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public List<RoutineTask> getTasks() {
        return tasks;
    }

    public String getGoogleEventId() {
        return googleEventId;
    }

    public void setGoogleEventId(String googleEventId) {
        this.googleEventId = googleEventId;
    }

    public String getGoogleEtag() {
        return googleEtag;
    }

    public void setGoogleEtag(String googleEtag) {
        this.googleEtag = googleEtag;
    }

    public Instant getGoogleUpdatedAt() {
        return googleUpdatedAt;
    }

    public void setGoogleUpdatedAt(Instant googleUpdatedAt) {
        this.googleUpdatedAt = googleUpdatedAt;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
