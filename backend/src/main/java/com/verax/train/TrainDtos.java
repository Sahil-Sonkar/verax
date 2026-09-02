package com.verax.train;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class TrainDtos {

    private TrainDtos() {
    }

    public record ExerciseView(UUID id, String name, String muscle, String track, List<PlannedSet> sets) {
        public static ExerciseView from(TrainTemplateExercise exercise) {
            return new ExerciseView(
                    exercise.getId(),
                    exercise.getName(),
                    exercise.getMuscle(),
                    exercise.getTrack(),
                    exercise.getPlannedSets() == null ? List.of() : List.copyOf(exercise.getPlannedSets())
            );
        }
    }

    public record TemplateView(UUID id, String name, String kind, List<ExerciseView> exercises) {
        public static TemplateView from(TrainTemplate template) {
            return new TemplateView(
                    template.getId(),
                    template.getName(),
                    template.getKind(),
                    template.getExercises().stream().map(ExerciseView::from).toList()
            );
        }
    }

    public record TemplateUpsert(String name, String kind, List<ExerciseUpsert> exercises) {
    }

    public record ExerciseUpsert(String name, String muscle, String track, List<PlannedSet> sets) {
    }

    public record ExerciseHit(
            String name,
            String type,
            String muscle,
            String mappedMuscle,
            String track,
            String difficulty,
            String instructions,
            String safetyInfo,
            List<String> equipment
    ) {
    }

    public record SetUpsert(String exerciseName, String muscle, String track, Integer setIndex, Integer reps, BigDecimal kg, Integer seconds) {
    }

    public record SetView(
            UUID id,
            String exerciseName,
            String muscle,
            String track,
            int setIndex,
            Integer reps,
            BigDecimal kg,
            Integer seconds
    ) {
        public static SetView from(TrainSet set) {
            return new SetView(
                    set.getId(),
                    set.getExerciseName(),
                    set.getMuscle(),
                    set.getTrack(),
                    set.getSetIndex(),
                    set.getReps(),
                    set.getKg(),
                    set.getSeconds()
            );
        }
    }

    public record SessionStart(UUID templateId, String name, String kind) {
    }

    public record SessionView(
            UUID id,
            UUID templateId,
            String name,
            String kind,
            Instant startedAt,
            Instant endedAt,
            String source,
            long durationSec,
            BigDecimal volume,
            String photoUrl,
            List<SetView> sets
    ) {
        public static SessionView from(TrainSession session) {
            return new SessionView(
                    session.getId(),
                    session.getTemplate() == null ? null : session.getTemplate().getId(),
                    session.getName(),
                    session.getKind(),
                    session.getStartedAt(),
                    session.getEndedAt(),
                    session.getSource(),
                    sessionDurationSec(session),
                    sessionVolume(session.getSets()),
                    session.getPhotoAsset() == null ? null : "/api/photos/" + session.getPhotoAsset().getId() + "/file",
                    session.getSets().stream().map(SetView::from).toList()
            );
        }
    }

    public record ActivityUpsert(
            String name,
            String activityType,
            LocalDate date,
            Integer durationSec,
            Integer distanceM,
            Integer calories,
            Integer avgHr,
            String notes,
            String source
    ) {
    }

    public record ActivityView(
            UUID id,
            String name,
            String activityType,
            LocalDate date,
            Integer durationSec,
            Integer distanceM,
            Integer calories,
            Integer avgHr,
            String notes,
            String source
    ) {
        public static ActivityView from(TrainActivity activity) {
            return new ActivityView(
                    activity.getId(),
                    activity.getName(),
                    activity.getActivityType(),
                    activity.getActivityDate(),
                    activity.getDurationSec(),
                    activity.getDistanceM(),
                    activity.getCalories(),
                    activity.getAvgHr(),
                    activity.getNotes(),
                    activity.getSource()
            );
        }
    }

    public record MusclePoint(String muscle, BigDecimal volume, int sessions) {
    }

    public record RecoveryPoint(String muscle, String lastDate, int hoursSince, int recoveryPct) {
    }

    public record TrendPoint(String period, BigDecimal volume, long durationSec, List<MusclePoint> radar) {
        public TrendPoint(String period, BigDecimal volume, long durationSec) {
            this(period, volume, durationSec, List.of());
        }
    }

    public record Summary(
            List<TrendPoint> trends,
            List<MusclePoint> radar,
            List<RecoveryPoint> recovery,
            BigDecimal totalVolume,
            long totalDurationSec
    ) {
    }

    public record ExerciseDelta(
            String name,
            String muscle,
            BigDecimal volume,
            BigDecimal previousVolume,
            BigDecimal bestKg,
            BigDecimal previousBestKg,
            boolean improved
    ) {
    }

    public record SessionReport(
            SessionView session,
            SessionView previous,
            BigDecimal volume,
            long durationSec,
            BigDecimal volumeDelta,
            Long durationDelta,
            List<ExerciseDelta> exercises,
            List<MusclePoint> radar,
            String photoUrl
    ) {
    }

    public record ScanRequest(String text) {
    }

    public record ProfileUpsert(BigDecimal heightCm, String sex, Integer birthYear, String activity) {
    }

    public record ProfileView(
            BigDecimal heightCm,
            String sex,
            Integer birthYear,
            String activity,
            Integer age,
            BigDecimal weightKg,
            BigDecimal bmi,
            BigDecimal bmr,
            BigDecimal tdee
    ) {
    }

    public record BurnLine(String name, String source, BigDecimal kcal) {
    }

    public record DayEnergy(BigDecimal tdee, BigDecimal weightKg, BigDecimal burned, List<BurnLine> burns) {
    }

    public record BodyUpsert(
            LocalDate date,
            String source,
            String kind,
            BigDecimal weightKg,
            BigDecimal heightCm,
            BigDecimal bmi,
            BigDecimal bodyFatPct,
            BigDecimal fatFreeKg,
            BigDecimal subcutaneousFatPct,
            BigDecimal visceralFat,
            BigDecimal bodyWaterPct,
            BigDecimal skeletalMusclePct,
            BigDecimal muscleMassKg,
            BigDecimal muscleStorage,
            BigDecimal boneMassKg,
            BigDecimal proteinPct,
            BigDecimal bmrKcal,
            Integer metabolicAge,
            BigDecimal waistCm,
            BigDecimal chestCm,
            BigDecimal leftBicepCm,
            BigDecimal rightBicepCm,
            BigDecimal hipsCm,
            BigDecimal leftThighCm,
            BigDecimal rightThighCm,
            BigDecimal neckCm,
            BigDecimal shouldersCm,
            BigDecimal leftCalfCm,
            BigDecimal rightCalfCm,
            BigDecimal leftForearmCm,
            BigDecimal rightForearmCm,
            String notes
    ) {
    }

    public record BodyView(
            UUID id,
            LocalDate date,
            String source,
            String kind,
            BigDecimal weightKg,
            BigDecimal heightCm,
            BigDecimal bmi,
            BigDecimal bodyFatPct,
            BigDecimal fatFreeKg,
            BigDecimal subcutaneousFatPct,
            BigDecimal visceralFat,
            BigDecimal bodyWaterPct,
            BigDecimal skeletalMusclePct,
            BigDecimal muscleMassKg,
            BigDecimal muscleStorage,
            BigDecimal boneMassKg,
            BigDecimal proteinPct,
            BigDecimal bmrKcal,
            BigDecimal bmrComputed,
            BigDecimal tdee,
            Integer metabolicAge,
            BigDecimal waistCm,
            BigDecimal chestCm,
            BigDecimal leftBicepCm,
            BigDecimal rightBicepCm,
            BigDecimal hipsCm,
            BigDecimal leftThighCm,
            BigDecimal rightThighCm,
            BigDecimal neckCm,
            BigDecimal shouldersCm,
            BigDecimal leftCalfCm,
            BigDecimal rightCalfCm,
            BigDecimal leftForearmCm,
            BigDecimal rightForearmCm,
            String notes
    ) {
    }

    static long sessionDurationSec(TrainSession session) {
        Instant end = session.getEndedAt() == null ? Instant.now() : session.getEndedAt();
        long seconds = end.getEpochSecond() - session.getStartedAt().getEpochSecond();
        return Math.max(0, seconds);
    }

    static BigDecimal sessionVolume(List<TrainSet> sets) {
        BigDecimal total = BigDecimal.ZERO;
        for (TrainSet set : sets) {
            if (set.getKg() != null && set.getReps() != null) {
                total = total.add(set.getKg().multiply(BigDecimal.valueOf(set.getReps())));
            }
        }
        return total;
    }

    public static int recoveryPct(int hoursSince) {
        if (hoursSince <= 0) {
            return 0;
        }
        int pct = (int) Math.round((hoursSince / 72.0) * 100);
        return Math.min(100, Math.max(0, pct));
    }
}
