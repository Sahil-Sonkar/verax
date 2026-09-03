package com.verax.recipe;

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

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "meal_log_items")
public class MealLogItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meal_id")
    private MealLog meal;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "external_id", length = 64)
    private String externalId;

    @Column(length = 24)
    private String source;

    @Column(nullable = false)
    private BigDecimal grams = BigDecimal.ZERO;

    @Column(nullable = false, length = 4)
    private String unit = "g";

    @Column(nullable = false)
    private BigDecimal kcal = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal protein = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal carbs = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal fat = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Double> micros = new LinkedHashMap<>();

    public UUID getId() {
        return id;
    }

    public MealLog getMeal() {
        return meal;
    }

    public void setMeal(MealLog meal) {
        this.meal = meal;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public BigDecimal getGrams() {
        return grams;
    }

    public void setGrams(BigDecimal grams) {
        this.grams = grams;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public BigDecimal getKcal() {
        return kcal;
    }

    public void setKcal(BigDecimal kcal) {
        this.kcal = kcal;
    }

    public BigDecimal getProtein() {
        return protein;
    }

    public void setProtein(BigDecimal protein) {
        this.protein = protein;
    }

    public BigDecimal getCarbs() {
        return carbs;
    }

    public void setCarbs(BigDecimal carbs) {
        this.carbs = carbs;
    }

    public BigDecimal getFat() {
        return fat;
    }

    public void setFat(BigDecimal fat) {
        this.fat = fat;
    }

    public Map<String, Double> getMicros() {
        return micros;
    }

    public void setMicros(Map<String, Double> micros) {
        this.micros = micros == null ? new LinkedHashMap<>() : micros;
    }
}
