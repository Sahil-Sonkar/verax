package com.verax.day;

import com.verax.consistency.ConsistencyCalculator;

public final class Encouragement {

    private Encouragement() {
    }

    public static String message(ConsistencyCalculator.DailyScore score, boolean today) {
        if (score.scheduled() == 0) {
            return "Nothing scheduled. Rest is part of the process.";
        }
        double pct = score.score() == null ? 0 : score.score();
        if (today && score.pending() == score.scheduled()) {
            return "The day is still yours.";
        }
        if (pct >= 0.9) {
            return "Exceptional consistency today.";
        }
        if (pct >= 0.75) {
            return "Good day. Keep going.";
        }
        if (pct >= 0.5) {
            return "You showed up.";
        }
        if (score.completed() + score.partial() > 0) {
            return "You're building consistency.";
        }
        if (score.missed() > 0 && score.missed() < score.scheduled()) {
            return "One missed habit doesn't erase your progress.";
        }
        if (today) {
            return "Start with one commitment.";
        }
        return "One quiet day doesn't define the stretch.";
    }
}
