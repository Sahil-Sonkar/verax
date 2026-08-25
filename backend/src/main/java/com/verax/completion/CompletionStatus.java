package com.verax.completion;

public enum CompletionStatus {
    COMPLETED(1.0),
    PARTIAL(0.5),
    MISSED(0.0),
    SKIPPED(-1.0);

    private final double multiplier;

    CompletionStatus(double multiplier) {
        this.multiplier = multiplier;
    }

    public double multiplier() {
        return multiplier;
    }

    public boolean countsTowardScore() {
        return this != SKIPPED;
    }
}
