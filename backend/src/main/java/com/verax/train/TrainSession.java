package com.verax.train;

import com.verax.asset.Asset;
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
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "train_sessions")
public class TrainSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private TrainTemplate template;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 24)
    private String kind = "STRENGTH";

    @Column(name = "started_at", nullable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(nullable = false, length = 24)
    private String source = "MANUAL";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "photo_asset_id")
    private Asset photoAsset;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder, setIndex, id")
    private List<TrainSet> sets = new ArrayList<>();

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
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

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(Instant endedAt) {
        this.endedAt = endedAt;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Asset getPhotoAsset() {
        return photoAsset;
    }

    public void setPhotoAsset(Asset photoAsset) {
        this.photoAsset = photoAsset;
    }

    public List<TrainSet> getSets() {
        return sets;
    }
}
