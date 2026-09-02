package com.verax.train;

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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "body_logs")
public class BodyLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate = LocalDate.now();

    @Column(nullable = false, length = 24)
    private String source = "MANUAL";

    @Column(nullable = false, length = 24)
    private String kind = "COMPOSITION";

    @Column(name = "weight_kg")
    private BigDecimal weightKg;
    @Column(name = "height_cm")
    private BigDecimal heightCm;
    private BigDecimal bmi;
    @Column(name = "body_fat_pct")
    private BigDecimal bodyFatPct;
    @Column(name = "fat_free_kg")
    private BigDecimal fatFreeKg;
    @Column(name = "subcutaneous_fat_pct")
    private BigDecimal subcutaneousFatPct;
    @Column(name = "visceral_fat")
    private BigDecimal visceralFat;
    @Column(name = "body_water_pct")
    private BigDecimal bodyWaterPct;
    @Column(name = "skeletal_muscle_pct")
    private BigDecimal skeletalMusclePct;
    @Column(name = "muscle_mass_kg")
    private BigDecimal muscleMassKg;
    @Column(name = "muscle_storage")
    private BigDecimal muscleStorage;
    @Column(name = "bone_mass_kg")
    private BigDecimal boneMassKg;
    @Column(name = "protein_pct")
    private BigDecimal proteinPct;
    @Column(name = "bmr_kcal")
    private BigDecimal bmrKcal;
    @Column(name = "metabolic_age")
    private Integer metabolicAge;
    @Column(name = "waist_cm")
    private BigDecimal waistCm;
    @Column(name = "chest_cm")
    private BigDecimal chestCm;
    @Column(name = "left_bicep_cm")
    private BigDecimal leftBicepCm;
    @Column(name = "right_bicep_cm")
    private BigDecimal rightBicepCm;
    @Column(name = "hips_cm")
    private BigDecimal hipsCm;
    @Column(name = "left_thigh_cm")
    private BigDecimal leftThighCm;
    @Column(name = "right_thigh_cm")
    private BigDecimal rightThighCm;
    @Column(name = "neck_cm")
    private BigDecimal neckCm;
    @Column(name = "shoulders_cm")
    private BigDecimal shouldersCm;
    @Column(name = "left_calf_cm")
    private BigDecimal leftCalfCm;
    @Column(name = "right_calf_cm")
    private BigDecimal rightCalfCm;
    @Column(name = "left_forearm_cm")
    private BigDecimal leftForearmCm;
    @Column(name = "right_forearm_cm")
    private BigDecimal rightForearmCm;
    @Column(columnDefinition = "text")
    private String notes;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDate getLogDate() { return logDate; }
    public void setLogDate(LocalDate logDate) { this.logDate = logDate; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public BigDecimal getWeightKg() { return weightKg; }
    public void setWeightKg(BigDecimal weightKg) { this.weightKg = weightKg; }
    public BigDecimal getHeightCm() { return heightCm; }
    public void setHeightCm(BigDecimal heightCm) { this.heightCm = heightCm; }
    public BigDecimal getBmi() { return bmi; }
    public void setBmi(BigDecimal bmi) { this.bmi = bmi; }
    public BigDecimal getBodyFatPct() { return bodyFatPct; }
    public void setBodyFatPct(BigDecimal bodyFatPct) { this.bodyFatPct = bodyFatPct; }
    public BigDecimal getFatFreeKg() { return fatFreeKg; }
    public void setFatFreeKg(BigDecimal fatFreeKg) { this.fatFreeKg = fatFreeKg; }
    public BigDecimal getSubcutaneousFatPct() { return subcutaneousFatPct; }
    public void setSubcutaneousFatPct(BigDecimal subcutaneousFatPct) { this.subcutaneousFatPct = subcutaneousFatPct; }
    public BigDecimal getVisceralFat() { return visceralFat; }
    public void setVisceralFat(BigDecimal visceralFat) { this.visceralFat = visceralFat; }
    public BigDecimal getBodyWaterPct() { return bodyWaterPct; }
    public void setBodyWaterPct(BigDecimal bodyWaterPct) { this.bodyWaterPct = bodyWaterPct; }
    public BigDecimal getSkeletalMusclePct() { return skeletalMusclePct; }
    public void setSkeletalMusclePct(BigDecimal skeletalMusclePct) { this.skeletalMusclePct = skeletalMusclePct; }
    public BigDecimal getMuscleMassKg() { return muscleMassKg; }
    public void setMuscleMassKg(BigDecimal muscleMassKg) { this.muscleMassKg = muscleMassKg; }
    public BigDecimal getMuscleStorage() { return muscleStorage; }
    public void setMuscleStorage(BigDecimal muscleStorage) { this.muscleStorage = muscleStorage; }
    public BigDecimal getBoneMassKg() { return boneMassKg; }
    public void setBoneMassKg(BigDecimal boneMassKg) { this.boneMassKg = boneMassKg; }
    public BigDecimal getProteinPct() { return proteinPct; }
    public void setProteinPct(BigDecimal proteinPct) { this.proteinPct = proteinPct; }
    public BigDecimal getBmrKcal() { return bmrKcal; }
    public void setBmrKcal(BigDecimal bmrKcal) { this.bmrKcal = bmrKcal; }
    public Integer getMetabolicAge() { return metabolicAge; }
    public void setMetabolicAge(Integer metabolicAge) { this.metabolicAge = metabolicAge; }
    public BigDecimal getWaistCm() { return waistCm; }
    public void setWaistCm(BigDecimal waistCm) { this.waistCm = waistCm; }
    public BigDecimal getChestCm() { return chestCm; }
    public void setChestCm(BigDecimal chestCm) { this.chestCm = chestCm; }
    public BigDecimal getLeftBicepCm() { return leftBicepCm; }
    public void setLeftBicepCm(BigDecimal leftBicepCm) { this.leftBicepCm = leftBicepCm; }
    public BigDecimal getRightBicepCm() { return rightBicepCm; }
    public void setRightBicepCm(BigDecimal rightBicepCm) { this.rightBicepCm = rightBicepCm; }
    public BigDecimal getHipsCm() { return hipsCm; }
    public void setHipsCm(BigDecimal hipsCm) { this.hipsCm = hipsCm; }
    public BigDecimal getLeftThighCm() { return leftThighCm; }
    public void setLeftThighCm(BigDecimal leftThighCm) { this.leftThighCm = leftThighCm; }
    public BigDecimal getRightThighCm() { return rightThighCm; }
    public void setRightThighCm(BigDecimal rightThighCm) { this.rightThighCm = rightThighCm; }
    public BigDecimal getNeckCm() { return neckCm; }
    public void setNeckCm(BigDecimal neckCm) { this.neckCm = neckCm; }
    public BigDecimal getShouldersCm() { return shouldersCm; }
    public void setShouldersCm(BigDecimal shouldersCm) { this.shouldersCm = shouldersCm; }
    public BigDecimal getLeftCalfCm() { return leftCalfCm; }
    public void setLeftCalfCm(BigDecimal leftCalfCm) { this.leftCalfCm = leftCalfCm; }
    public BigDecimal getRightCalfCm() { return rightCalfCm; }
    public void setRightCalfCm(BigDecimal rightCalfCm) { this.rightCalfCm = rightCalfCm; }
    public BigDecimal getLeftForearmCm() { return leftForearmCm; }
    public void setLeftForearmCm(BigDecimal leftForearmCm) { this.leftForearmCm = leftForearmCm; }
    public BigDecimal getRightForearmCm() { return rightForearmCm; }
    public void setRightForearmCm(BigDecimal rightForearmCm) { this.rightForearmCm = rightForearmCm; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
