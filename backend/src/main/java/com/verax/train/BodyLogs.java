package com.verax.train;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

final class BodyLogs {

    private BodyLogs() {
    }

    static String kind(String value) {
        if (value != null && value.trim().equalsIgnoreCase("TAPE")) {
            return "TAPE";
        }
        return "COMPOSITION";
    }

    static void apply(BodyLog log, TrainDtos.BodyUpsert request) {
        if (request.date() != null) {
            log.setLogDate(request.date());
        }
        if (request.source() != null && !request.source().isBlank()) {
            log.setSource(request.source().trim().toUpperCase());
        }
        log.setKind(kind(request.kind()));
        if ("TAPE".equals(log.getKind())) {
            applyTape(log, request);
        } else {
            applyComposition(log, request);
        }
        if (request.notes() != null) {
            log.setNotes(request.notes());
        }
    }

    static void applyComposition(BodyLog log, TrainDtos.BodyUpsert request) {
        set(request.weightKg(), log::setWeightKg);
        set(request.heightCm(), log::setHeightCm);
        set(request.bmi(), log::setBmi);
        set(request.bodyFatPct(), log::setBodyFatPct);
        set(request.fatFreeKg(), log::setFatFreeKg);
        set(request.subcutaneousFatPct(), log::setSubcutaneousFatPct);
        set(request.visceralFat(), log::setVisceralFat);
        set(request.bodyWaterPct(), log::setBodyWaterPct);
        set(request.skeletalMusclePct(), log::setSkeletalMusclePct);
        set(request.muscleMassKg(), log::setMuscleMassKg);
        set(request.muscleStorage(), log::setMuscleStorage);
        set(request.boneMassKg(), log::setBoneMassKg);
        set(request.proteinPct(), log::setProteinPct);
        set(request.bmrKcal(), log::setBmrKcal);
        if (request.metabolicAge() != null) {
            log.setMetabolicAge(request.metabolicAge());
        }
    }

    static void applyTape(BodyLog log, TrainDtos.BodyUpsert request) {
        set(request.waistCm(), log::setWaistCm);
        set(request.chestCm(), log::setChestCm);
        set(request.leftBicepCm(), log::setLeftBicepCm);
        set(request.rightBicepCm(), log::setRightBicepCm);
        set(request.hipsCm(), log::setHipsCm);
        set(request.leftThighCm(), log::setLeftThighCm);
        set(request.rightThighCm(), log::setRightThighCm);
        set(request.neckCm(), log::setNeckCm);
        set(request.shouldersCm(), log::setShouldersCm);
        set(request.leftCalfCm(), log::setLeftCalfCm);
        set(request.rightCalfCm(), log::setRightCalfCm);
        set(request.leftForearmCm(), log::setLeftForearmCm);
        set(request.rightForearmCm(), log::setRightForearmCm);
    }

    static void applyScan(BodyLog log, Map<String, BigDecimal> values) {
        set(values.get("weightKg"), log::setWeightKg);
        set(values.get("heightCm"), log::setHeightCm);
        set(values.get("bmi"), log::setBmi);
        set(values.get("bodyFatPct"), log::setBodyFatPct);
        set(values.get("fatFreeKg"), log::setFatFreeKg);
        set(values.get("subcutaneousFatPct"), log::setSubcutaneousFatPct);
        set(values.get("visceralFat"), log::setVisceralFat);
        set(values.get("bodyWaterPct"), log::setBodyWaterPct);
        set(values.get("skeletalMusclePct"), log::setSkeletalMusclePct);
        set(values.get("muscleMassKg"), log::setMuscleMassKg);
        set(values.get("muscleStorage"), log::setMuscleStorage);
        set(values.get("boneMassKg"), log::setBoneMassKg);
        set(values.get("proteinPct"), log::setProteinPct);
        set(values.get("bmrKcal"), log::setBmrKcal);
        if (values.get("metabolicAge") != null) {
            log.setMetabolicAge(values.get("metabolicAge").intValue());
        }
    }

    static TrainDtos.BodyView view(BodyLog log, BodyProfile profile) {
        BigDecimal height = log.getHeightCm() != null ? log.getHeightCm() : (profile == null ? null : profile.getHeightCm());
        Integer age = age(profile);
        String sex = profile == null ? null : profile.getSex();
        String activity = profile == null ? "MODERATE" : profile.getActivity();
        BigDecimal computedBmi = BodyMetrics.bmi(log.getWeightKg(), height);
        BigDecimal computedBmr = BodyMetrics.bmr(log.getWeightKg(), height, age, sex);
        BigDecimal bmr = computedBmr != null ? computedBmr : log.getBmrKcal();
        return new TrainDtos.BodyView(
                log.getId(),
                log.getLogDate(),
                log.getSource(),
                log.getKind() == null ? "COMPOSITION" : log.getKind(),
                log.getWeightKg(),
                height,
                computedBmi != null ? computedBmi : log.getBmi(),
                log.getBodyFatPct(),
                log.getFatFreeKg(),
                log.getSubcutaneousFatPct(),
                log.getVisceralFat(),
                log.getBodyWaterPct(),
                log.getSkeletalMusclePct(),
                log.getMuscleMassKg(),
                log.getMuscleStorage(),
                log.getBoneMassKg(),
                log.getProteinPct(),
                log.getBmrKcal(),
                computedBmr,
                BodyMetrics.tdee(bmr, activity),
                log.getMetabolicAge(),
                log.getWaistCm(),
                log.getChestCm(),
                log.getLeftBicepCm(),
                log.getRightBicepCm(),
                log.getHipsCm(),
                log.getLeftThighCm(),
                log.getRightThighCm(),
                log.getNeckCm(),
                log.getShouldersCm(),
                log.getLeftCalfCm(),
                log.getRightCalfCm(),
                log.getLeftForearmCm(),
                log.getRightForearmCm(),
                log.getNotes()
        );
    }

    static Integer age(BodyProfile profile) {
        if (profile == null || profile.getBirthYear() == null) {
            return null;
        }
        return LocalDate.now().getYear() - profile.getBirthYear();
    }

    private static void set(BigDecimal value, java.util.function.Consumer<BigDecimal> setter) {
        if (value != null) {
            setter.accept(value);
        }
    }
}
