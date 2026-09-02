package com.verax.train;

import java.math.BigDecimal;

public class PlannedSet {

    private Integer reps;
    private BigDecimal kg;
    private Integer seconds;

    public PlannedSet() {
    }

    public PlannedSet(Integer reps, BigDecimal kg, Integer seconds) {
        this.reps = reps;
        this.kg = kg;
        this.seconds = seconds;
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
