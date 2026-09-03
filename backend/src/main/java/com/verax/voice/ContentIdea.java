package com.verax.voice;

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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "content_ideas")
public class ContentIdea {

    public enum Platform {
        YOUTUBE,
        INSTAGRAM,
        LINKEDIN
    }

    public enum Phase {
        IDEA,
        HAPPENED,
        LEARNED,
        PLATFORM,
        HOOK
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Platform platform = Platform.YOUTUBE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private Phase phase = Phase.IDEA;

    @Column(nullable = false, columnDefinition = "text")
    private String idea;

    @Column(columnDefinition = "text")
    private String happened;

    @Column(columnDefinition = "text")
    private String learned;

    @Column(name = "potential_platform", columnDefinition = "text")
    private String potentialPlatform;

    @Column(columnDefinition = "text")
    private String hook;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

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

    public Platform getPlatform() {
        return platform;
    }

    public void setPlatform(Platform platform) {
        this.platform = platform;
    }

    public Phase getPhase() {
        return phase;
    }

    public void setPhase(Phase phase) {
        this.phase = phase;
    }

    public String getIdea() {
        return idea;
    }

    public void setIdea(String idea) {
        this.idea = idea;
    }

    public String getHappened() {
        return happened;
    }

    public void setHappened(String happened) {
        this.happened = happened;
    }

    public String getLearned() {
        return learned;
    }

    public void setLearned(String learned) {
        this.learned = learned;
    }

    public String getPotentialPlatform() {
        return potentialPlatform;
    }

    public void setPotentialPlatform(String potentialPlatform) {
        this.potentialPlatform = potentialPlatform;
    }

    public String getHook() {
        return hook;
    }

    public void setHook(String hook) {
        this.hook = hook;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
