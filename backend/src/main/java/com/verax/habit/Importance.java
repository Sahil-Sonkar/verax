package com.verax.habit;

public enum Importance {
    CRITICAL(3),
    IMPORTANT(2),
    OPTIONAL(1);

    private final int defaultWeight;

    Importance(int defaultWeight) {
        this.defaultWeight = defaultWeight;
    }

    public int defaultWeight() {
        return defaultWeight;
    }
}
