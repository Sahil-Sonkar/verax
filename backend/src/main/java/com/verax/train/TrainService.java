package com.verax.train;

import com.verax.asset.Asset;
import com.verax.asset.AssetDtos;
import com.verax.asset.AssetRepository;
import com.verax.asset.AssetService;
import com.verax.common.ApiException;
import com.verax.habit.AutoCompleteService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

@Service
public class TrainService {

    private static final List<String> MUSCLES = List.of(
            "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "QUADS", "HAMS", "GLUTES", "CALVES", "CORE", "CARDIO"
    );

    private final TrainTemplateRepository templates;
    private final TrainSessionRepository sessions;
    private final TrainSetRepository sets;
    private final TrainActivityRepository activities;
    private final BodyProfileRepository profiles;
    private final BodyLogRepository bodyLogs;
    private final AssetService assets;
    private final AssetRepository assetRows;
    private final UserRepository users;
    private final AutoCompleteService autoComplete;

    public TrainService(
            TrainTemplateRepository templates,
            TrainSessionRepository sessions,
            TrainSetRepository sets,
            TrainActivityRepository activities,
            BodyProfileRepository profiles,
            BodyLogRepository bodyLogs,
            AssetService assets,
            AssetRepository assetRows,
            UserRepository users,
            AutoCompleteService autoComplete
    ) {
        this.templates = templates;
        this.sessions = sessions;
        this.sets = sets;
        this.activities = activities;
        this.profiles = profiles;
        this.bodyLogs = bodyLogs;
        this.assets = assets;
        this.assetRows = assetRows;
        this.users = users;
        this.autoComplete = autoComplete;
    }

    @Transactional
    public List<TrainDtos.TemplateView> listTemplates(UUID userId) {
        return templates.findWithExercises(userId).stream().map(TrainDtos.TemplateView::from).toList();
    }

    @Transactional
    public TrainDtos.TemplateView createTemplate(UUID userId, TrainDtos.TemplateUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        User user = users.getReferenceById(userId);
        TrainTemplate template = new TrainTemplate();
        template.setUser(user);
        template.setName(request.name().trim());
        template.setKind(kind(request.kind()));
        template.setSortOrder(100 + (int) templates.countByUserId(userId));
        int order = 0;
        for (TrainDtos.ExerciseUpsert exercise : request.exercises() == null ? List.<TrainDtos.ExerciseUpsert>of() : request.exercises()) {
            template.getExercises().add(exercise(template, exercise, order++));
        }
        templates.save(template);
        return TrainDtos.TemplateView.from(template);
    }

    @Transactional
    public TrainDtos.TemplateView updateTemplate(UUID userId, UUID id, TrainDtos.TemplateUpsert request) {
        TrainTemplate template = templates.findWithExercises(id, userId).orElseThrow(() -> ApiException.notFound("Routine not found"));
        if (request.name() != null && !request.name().isBlank()) {
            template.setName(request.name().trim());
        }
        if (request.kind() != null && !request.kind().isBlank()) {
            template.setKind(kind(request.kind()));
        }
        if (request.exercises() != null) {
            template.getExercises().clear();
            int order = 0;
            for (TrainDtos.ExerciseUpsert exercise : request.exercises()) {
                template.getExercises().add(exercise(template, exercise, order++));
            }
        }
        return TrainDtos.TemplateView.from(template);
    }

    @Transactional
    public void deleteTemplate(UUID userId, UUID id) {
        TrainTemplate template = templates.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Routine not found"));
        templates.delete(template);
    }

    @Transactional
    public TrainDtos.SessionView start(UUID userId, TrainDtos.SessionStart request) {
        sessions.findFirstByUserIdAndEndedAtIsNullOrderByStartedAtDesc(userId).ifPresent(open -> {
            open.setEndedAt(Instant.now());
        });
        User user = users.getReferenceById(userId);
        TrainSession session = new TrainSession();
        session.setUser(user);
        session.setStartedAt(Instant.now());
        session.setSource("MANUAL");
        if (request.templateId() != null) {
            TrainTemplate template = templates.findWithExercises(request.templateId(), userId)
                    .orElseThrow(() -> ApiException.notFound("Routine not found"));
            session.setTemplate(template);
            session.setName(template.getName());
            session.setKind(template.getKind());
            Map<String, List<TrainSet>> lastByExercise = lastSets(userId, template);
            for (TrainTemplateExercise exercise : template.getExercises()) {
                List<PlannedSet> planned = exercise.getPlannedSets() == null || exercise.getPlannedSets().isEmpty()
                        ? defaultSets(exercise.getTrack())
                        : exercise.getPlannedSets();
                List<TrainSet> lastRows = lastByExercise.getOrDefault(
                        exercise.getName().toLowerCase(Locale.ROOT),
                        List.of()
                );
                int count = Math.max(planned.size(), lastRows.size());
                if (count == 0) {
                    count = defaultSets(exercise.getTrack()).size();
                }
                for (int i = 0; i < count; i++) {
                    PlannedSet plannedSet = i < planned.size() ? planned.get(i) : new PlannedSet();
                    TrainSet lastSet = i < lastRows.size() ? lastRows.get(i) : null;
                    TrainSet set = new TrainSet();
                    set.setSession(session);
                    set.setExerciseName(exercise.getName());
                    set.setMuscle(exercise.getMuscle());
                    set.setTrack(exercise.getTrack());
                    set.setSetIndex(i + 1);
                    set.setSortOrder(exercise.getSortOrder());
                    set.setReps(firstNonNull(lastSet != null ? lastSet.getReps() : null, plannedSet.getReps()));
                    set.setKg(firstNonNull(lastSet != null ? lastSet.getKg() : null, plannedSet.getKg()));
                    set.setSeconds(firstNonNull(lastSet != null ? lastSet.getSeconds() : null, plannedSet.getSeconds()));
                    session.getSets().add(set);
                }
            }
        } else {
            if (request.name() == null || request.name().isBlank()) {
                throw ApiException.badRequest("Name is required");
            }
            session.setName(request.name().trim());
            session.setKind(kind(request.kind()));
        }
        sessions.save(session);
        return TrainDtos.SessionView.from(session);
    }

    @Transactional(readOnly = true)
    public TrainDtos.SessionView getSession(UUID userId, UUID id) {
        return TrainDtos.SessionView.from(sessions.findWithSets(id, userId).orElseThrow(() -> ApiException.notFound("Session not found")));
    }

    @Transactional
    public TrainDtos.SessionView end(UUID userId, UUID id) {
        TrainSession session = sessions.findWithSets(id, userId).orElseThrow(() -> ApiException.notFound("Session not found"));
        if (session.getEndedAt() == null) {
            session.setEndedAt(Instant.now());
        }
        markWorkout(userId, sessionDate(userId, session.getStartedAt()), TrainDtos.sessionDurationSec(session), "Train session");
        return TrainDtos.SessionView.from(session);
    }

    @Transactional
    public void deleteSession(UUID userId, UUID id) {
        TrainSession session = sessions.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Session not found"));
        sessions.delete(session);
    }

    @Transactional
    public TrainDtos.SetView addSet(UUID userId, UUID sessionId, TrainDtos.SetUpsert request) {
        TrainSession session = sessions.findWithSets(sessionId, userId).orElseThrow(() -> ApiException.notFound("Session not found"));
        if (request.exerciseName() == null || request.exerciseName().isBlank()) {
            throw ApiException.badRequest("Exercise name is required");
        }
        TrainSet set = new TrainSet();
        set.setSession(session);
        apply(set, request);
        String name = request.exerciseName().trim();
        int order = session.getSets().stream()
                .filter(row -> row.getExerciseName().equalsIgnoreCase(name))
                .mapToInt(TrainSet::getSortOrder)
                .findFirst()
                .orElseGet(() -> session.getSets().stream().mapToInt(TrainSet::getSortOrder).max().orElse(-1) + 1);
        set.setSortOrder(order);
        if (request.setIndex() == null) {
            int next = session.getSets().stream()
                    .filter(row -> row.getExerciseName().equalsIgnoreCase(request.exerciseName().trim()))
                    .mapToInt(TrainSet::getSetIndex)
                    .max()
                    .orElse(0) + 1;
            set.setSetIndex(next);
        }
        session.getSets().add(set);
        sets.save(set);
        return TrainDtos.SetView.from(set);
    }

    @Transactional
    public TrainDtos.SetView updateSet(UUID userId, UUID id, TrainDtos.SetUpsert request) {
        TrainSet set = sets.findByIdAndSessionUserId(id, userId).orElseThrow(() -> ApiException.notFound("Set not found"));
        apply(set, request);
        return TrainDtos.SetView.from(set);
    }

    @Transactional
    public void deleteSet(UUID userId, UUID id) {
        TrainSet set = sets.findByIdAndSessionUserId(id, userId).orElseThrow(() -> ApiException.notFound("Set not found"));
        sets.delete(set);
    }

    @Transactional(readOnly = true)
    public List<TrainDtos.SessionView> listSessions(UUID userId, LocalDate from, LocalDate to) {
        Instant start = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        return sessions.findRange(userId, start, end).stream().map(TrainDtos.SessionView::from).toList();
    }

    @Transactional
    public TrainDtos.ActivityView addActivity(UUID userId, TrainDtos.ActivityUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        if (request.activityType() == null || request.activityType().isBlank()) {
            throw ApiException.badRequest("Activity type is required");
        }
        TrainActivity activity = new TrainActivity();
        activity.setUser(users.getReferenceById(userId));
        apply(activity, request);
        activities.save(activity);
        if (activity.getDurationSec() != null && activity.getDurationSec() > 0) {
            markWorkout(userId, activity.getActivityDate(), activity.getDurationSec(), "Train activity");
        }
        return TrainDtos.ActivityView.from(activity);
    }

    @Transactional(readOnly = true)
    public List<TrainDtos.ActivityView> listActivities(UUID userId, LocalDate from, LocalDate to) {
        return activities.findByUserIdAndActivityDateBetweenOrderByActivityDateDesc(userId, from, to)
                .stream()
                .map(TrainDtos.ActivityView::from)
                .toList();
    }

    @Transactional
    public void deleteActivity(UUID userId, UUID id) {
        TrainActivity activity = activities.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Activity not found"));
        activities.delete(activity);
    }

    @Transactional(readOnly = true)
    public TrainDtos.Summary summary(UUID userId, LocalDate from, LocalDate to, String granularity) {
        String grain = grain(granularity);
        Instant start = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        List<TrainSession> rows = sessions.findRange(userId, start, end);
        Map<String, BigDecimal> volumeByPeriod = new TreeMap<>();
        Map<String, Long> timeByPeriod = new TreeMap<>();
        Map<String, Map<String, BigDecimal>> muscleByPeriod = new TreeMap<>();
        Map<String, Map<String, Integer>> muscleSessionsByPeriod = new TreeMap<>();
        for (String key : periodKeys(from, to, grain)) {
            volumeByPeriod.put(key, BigDecimal.ZERO);
            timeByPeriod.put(key, 0L);
            muscleByPeriod.put(key, new LinkedHashMap<>());
            muscleSessionsByPeriod.put(key, new LinkedHashMap<>());
        }
        Map<String, BigDecimal> volumeByMuscle = new LinkedHashMap<>();
        Map<String, Integer> sessionsByMuscle = new LinkedHashMap<>();
        Map<String, Instant> lastByMuscle = new LinkedHashMap<>();
        BigDecimal totalVolume = BigDecimal.ZERO;
        long totalDuration = 0;
        for (TrainSession session : rows) {
            BigDecimal volume = TrainDtos.sessionVolume(session.getSets());
            long duration = TrainDtos.sessionDurationSec(session);
            totalVolume = totalVolume.add(volume);
            totalDuration += duration;
            String period = periodKey(session.getStartedAt(), grain);
            volumeByPeriod.merge(period, volume, BigDecimal::add);
            timeByPeriod.merge(period, duration, Long::sum);
            Map<String, BigDecimal> periodMuscles = muscleByPeriod.computeIfAbsent(period, ignored -> new LinkedHashMap<>());
            Map<String, Integer> periodCounts = muscleSessionsByPeriod.computeIfAbsent(period, ignored -> new LinkedHashMap<>());
            for (TrainSet set : session.getSets()) {
                String muscle = muscle(set.getMuscle());
                if (set.getKg() != null && set.getReps() != null) {
                    BigDecimal setVolume = set.getKg().multiply(BigDecimal.valueOf(set.getReps()));
                    volumeByMuscle.merge(muscle, setVolume, BigDecimal::add);
                    periodMuscles.merge(muscle, setVolume, BigDecimal::add);
                }
                sessionsByMuscle.merge(muscle, 1, Integer::sum);
                periodCounts.merge(muscle, 1, Integer::sum);
                Instant previous = lastByMuscle.get(muscle);
                if (previous == null || session.getStartedAt().isAfter(previous)) {
                    lastByMuscle.put(muscle, session.getStartedAt());
                }
            }
            if ("CARDIO".equals(session.getKind())) {
                BigDecimal cardio = BigDecimal.valueOf(duration);
                volumeByMuscle.merge("CARDIO", cardio, BigDecimal::add);
                periodMuscles.merge("CARDIO", cardio, BigDecimal::add);
                lastByMuscle.put("CARDIO", session.getStartedAt());
            }
        }
        List<TrainDtos.TrendPoint> trends = volumeByPeriod.entrySet().stream()
                .map(entry -> new TrainDtos.TrendPoint(
                        entry.getKey(),
                        entry.getValue(),
                        timeByPeriod.getOrDefault(entry.getKey(), 0L),
                        muscleRadar(
                                muscleByPeriod.getOrDefault(entry.getKey(), Map.of()),
                                muscleSessionsByPeriod.getOrDefault(entry.getKey(), Map.of())
                        )
                ))
                .toList();
        List<TrainDtos.MusclePoint> radar = muscleRadar(volumeByMuscle, sessionsByMuscle);
        Instant now = Instant.now();
        List<TrainDtos.RecoveryPoint> recovery = lastByMuscle.entrySet().stream()
                .map(entry -> {
                    int hours = (int) Math.max(0, (now.getEpochSecond() - entry.getValue().getEpochSecond()) / 3600);
                    return new TrainDtos.RecoveryPoint(
                            entry.getKey(),
                            entry.getValue().atZone(ZoneOffset.UTC).toLocalDate().toString(),
                            hours,
                            TrainDtos.recoveryPct(hours)
                    );
                })
                .sorted(Comparator.comparing(TrainDtos.RecoveryPoint::recoveryPct))
                .toList();
        return new TrainDtos.Summary(trends, radar, recovery, totalVolume, totalDuration);
    }

    @Transactional(readOnly = true)
    public TrainDtos.SessionReport report(UUID userId, UUID id) {
        TrainSession session = sessions.findWithSets(id, userId).orElseThrow(() -> ApiException.notFound("Session not found"));
        TrainSession previous = null;
        if (session.getTemplate() != null) {
            previous = sessions.findFirstByUserIdAndTemplate_IdAndEndedAtNotNullAndStartedAtLessThanOrderByStartedAtDesc(
                    userId, session.getTemplate().getId(), session.getStartedAt()).orElse(null);
        }
        if (previous == null) {
            previous = sessions.findFirstByUserIdAndNameIgnoreCaseAndEndedAtNotNullAndStartedAtLessThanOrderByStartedAtDesc(
                    userId, session.getName(), session.getStartedAt()).orElse(null);
        }
        if (previous != null) {
            previous = sessions.findWithSets(previous.getId(), userId).orElse(previous);
        }
        Map<String, BigDecimal> prevVolume = new LinkedHashMap<>();
        Map<String, BigDecimal> prevBest = new LinkedHashMap<>();
        Map<String, String> muscles = new LinkedHashMap<>();
        if (previous != null) {
            for (TrainSet set : previous.getSets()) {
                accumulate(prevVolume, prevBest, muscles, set);
            }
        }
        Map<String, BigDecimal> volume = new LinkedHashMap<>();
        Map<String, BigDecimal> best = new LinkedHashMap<>();
        Map<String, BigDecimal> radarVolume = new LinkedHashMap<>();
        for (TrainSet set : session.getSets()) {
            accumulate(volume, best, muscles, set);
            if (set.getKg() != null && set.getReps() != null) {
                radarVolume.merge(muscle(set.getMuscle()), set.getKg().multiply(BigDecimal.valueOf(set.getReps())), BigDecimal::add);
            }
        }
        List<TrainDtos.ExerciseDelta> exercises = volume.keySet().stream().map(name -> {
            BigDecimal nowVol = volume.get(name);
            BigDecimal wasVol = prevVolume.get(name);
            BigDecimal nowBest = best.get(name);
            BigDecimal wasBest = prevBest.get(name);
            boolean improved = (wasVol != null && nowVol.compareTo(wasVol) > 0)
                    || (wasBest != null && nowBest != null && nowBest.compareTo(wasBest) > 0);
            return new TrainDtos.ExerciseDelta(name, muscles.getOrDefault(name, "OTHER"), nowVol, wasVol, nowBest, wasBest, improved);
        }).toList();
        List<TrainDtos.MusclePoint> radar = MUSCLES.stream()
                .map(row -> new TrainDtos.MusclePoint(row, radarVolume.getOrDefault(row, BigDecimal.ZERO), radarVolume.containsKey(row) ? 1 : 0))
                .filter(point -> point.volume().signum() > 0)
                .toList();
        BigDecimal nowVolume = TrainDtos.sessionVolume(session.getSets());
        long nowDuration = TrainDtos.sessionDurationSec(session);
        BigDecimal volumeDelta = previous == null ? null : nowVolume.subtract(TrainDtos.sessionVolume(previous.getSets()));
        Long durationDelta = previous == null ? null : nowDuration - TrainDtos.sessionDurationSec(previous);
        TrainDtos.SessionView view = TrainDtos.SessionView.from(session);
        return new TrainDtos.SessionReport(
                view,
                previous == null ? null : TrainDtos.SessionView.from(previous),
                nowVolume,
                nowDuration,
                volumeDelta,
                durationDelta,
                exercises,
                radar,
                view.photoUrl()
        );
    }

    @Transactional
    public TrainDtos.SessionView attachPhoto(UUID userId, UUID sessionId, MultipartFile file) {
        TrainSession session = sessions.findWithSets(sessionId, userId).orElseThrow(() -> ApiException.notFound("Session not found"));
        AssetDtos.Response uploaded = assets.upload(userId, file, "SESSION_SELFIE", "BODY", LocalDate.now(), session.getName());
        Asset asset = assetRows.findByIdAndUserId(uploaded.id(), userId).orElseThrow(() -> ApiException.notFound("Photo not found"));
        session.setPhotoAsset(asset);
        return TrainDtos.SessionView.from(session);
    }

    @Transactional(readOnly = true)
    public TrainDtos.ProfileView profile(UUID userId) {
        BodyProfile profile = profiles.findById(userId).orElse(null);
        BodyLog latest = bodyLogs.findFirstByUserIdAndKindOrderByLogDateDescCreatedAtDesc(userId, "COMPOSITION")
                .or(() -> bodyLogs.findFirstByUserIdOrderByLogDateDescCreatedAtDesc(userId))
                .orElse(null);
        Integer age = BodyLogs.age(profile);
        BigDecimal height = profile == null ? null : profile.getHeightCm();
        if (height == null && latest != null) {
            height = latest.getHeightCm();
        }
        BigDecimal weight = latest == null ? null : latest.getWeightKg();
        String sex = profile == null ? null : profile.getSex();
        String activity = profile == null ? "MODERATE" : profile.getActivity();
        BigDecimal bmr = BodyMetrics.bmr(weight, height, age, sex);
        if (bmr == null && latest != null) {
            bmr = latest.getBmrKcal();
        }
        return new TrainDtos.ProfileView(
                height,
                sex,
                profile == null ? null : profile.getBirthYear(),
                activity,
                age,
                weight,
                BodyMetrics.bmi(weight, height),
                bmr,
                BodyMetrics.tdee(bmr, activity)
        );
    }

    @Transactional(readOnly = true)
    public TrainDtos.DayEnergy dayEnergy(UUID userId, LocalDate date) {
        TrainDtos.ProfileView profile = profile(userId);
        BigDecimal weight = profile.weightKg();
        List<TrainDtos.BurnLine> burns = new ArrayList<>();
        for (TrainActivity activity : activities.findByUserIdAndActivityDateBetweenOrderByActivityDateDesc(userId, date, date)) {
            BigDecimal kcal = activity.getCalories() != null
                    ? BigDecimal.valueOf(activity.getCalories())
                    : BodyMetrics.workoutKcal(weight, activity.getDurationSec(), activity.getActivityType());
            if (kcal != null && kcal.signum() > 0) {
                burns.add(new TrainDtos.BurnLine(activity.getName(), activity.getSource(), kcal));
            }
        }
        for (TrainDtos.SessionView session : listSessions(userId, date, date)) {
            int duration = session.endedAt() == null
                    ? (int) Math.max(0, Instant.now().getEpochSecond() - session.startedAt().getEpochSecond())
                    : (int) session.durationSec();
            BigDecimal kcal = BodyMetrics.workoutKcal(weight, duration, session.kind());
            if (kcal != null && kcal.signum() > 0) {
                burns.add(new TrainDtos.BurnLine(session.name(), "SESSION", kcal));
            }
        }
        BigDecimal burned = burns.stream().map(TrainDtos.BurnLine::kcal).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new TrainDtos.DayEnergy(profile.tdee(), weight, burned, burns);
    }

    @Transactional
    public TrainDtos.ProfileView saveProfile(UUID userId, TrainDtos.ProfileUpsert request) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
        BodyProfile profile = profiles.findById(userId).orElseGet(BodyProfile::new);
        profile.setUser(user);
        if (request.heightCm() != null) {
            profile.setHeightCm(request.heightCm());
        }
        if (request.sex() != null && !request.sex().isBlank()) {
            profile.setSex(request.sex().trim().toUpperCase(Locale.ROOT));
        }
        if (request.birthYear() != null) {
            profile.setBirthYear(request.birthYear());
        }
        if (request.activity() != null && !request.activity().isBlank()) {
            profile.setActivity(request.activity().trim().toUpperCase(Locale.ROOT));
        }
        profiles.save(profile);
        return profile(userId);
    }

    @Transactional(readOnly = true)
    public List<TrainDtos.BodyView> listBody(UUID userId) {
        BodyProfile profile = profiles.findById(userId).orElse(null);
        return bodyLogs.findByUserIdOrderByLogDateDescCreatedAtDesc(userId).stream().map(log -> BodyLogs.view(log, profile)).toList();
    }

    @Transactional
    public TrainDtos.BodyView saveBody(UUID userId, TrainDtos.BodyUpsert request) {
        LocalDate date = request.date() == null ? LocalDate.now() : request.date();
        User user = users.getReferenceById(userId);
        BodyLog log = new BodyLog();
        log.setUser(user);
        log.setLogDate(date);
        BodyLogs.apply(log, request);
        bodyLogs.save(log);
        if (!"TAPE".equals(log.getKind()) && request.heightCm() != null) {
            saveProfile(userId, new TrainDtos.ProfileUpsert(request.heightCm(), null, null, null));
        }
        return BodyLogs.view(log, profiles.findById(userId).orElse(null));
    }

    @Transactional
    public void deleteBody(UUID userId, UUID id) {
        BodyLog log = bodyLogs.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Measurement not found"));
        bodyLogs.delete(log);
    }

    @Transactional(readOnly = true)
    public TrainDtos.BodyView scan(UUID userId, String text) {
        BodyScanParser.Result parsed = BodyScanParser.parse(text);
        if (parsed.values().isEmpty()) {
            throw ApiException.badRequest("Could not read measurements from that image. Try a sharper screenshot.");
        }
        BodyLog log = new BodyLog();
        log.setLogDate(parsed.date() == null ? LocalDate.now() : parsed.date());
        log.setSource("SCAN");
        log.setKind("COMPOSITION");
        BodyLogs.applyScan(log, parsed.values());
        BodyProfile profile = profiles.findById(userId).orElse(null);
        if (log.getHeightCm() == null && profile != null) {
            log.setHeightCm(profile.getHeightCm());
        }
        return BodyLogs.view(log, profile);
    }

    private static void accumulate(
            Map<String, BigDecimal> volume,
            Map<String, BigDecimal> best,
            Map<String, String> muscles,
            TrainSet set
    ) {
        muscles.putIfAbsent(set.getExerciseName(), muscle(set.getMuscle()));
        if (set.getKg() != null && set.getReps() != null) {
            BigDecimal load = set.getKg().multiply(BigDecimal.valueOf(set.getReps()));
            volume.merge(set.getExerciseName(), load, BigDecimal::add);
            BigDecimal current = best.get(set.getExerciseName());
            if (current == null || set.getKg().compareTo(current) > 0) {
                best.put(set.getExerciseName(), set.getKg());
            }
        }
    }

    private void apply(TrainSet set, TrainDtos.SetUpsert request) {
        if (request.exerciseName() != null && !request.exerciseName().isBlank()) {
            set.setExerciseName(request.exerciseName().trim());
        }
        if (request.muscle() != null) {
            set.setMuscle(muscle(request.muscle()));
        }
        if (request.track() != null && !request.track().isBlank()) {
            set.setTrack(request.track().trim().toUpperCase(Locale.ROOT));
        }
        if (request.setIndex() != null) {
            set.setSetIndex(request.setIndex());
        }
        if (request.reps() != null) {
            set.setReps(request.reps());
        }
        if (request.kg() != null) {
            set.setKg(request.kg());
        }
        if (request.seconds() != null) {
            set.setSeconds(request.seconds());
        }
    }

    private void apply(TrainActivity activity, TrainDtos.ActivityUpsert request) {
        activity.setName(request.name().trim());
        activity.setActivityType(request.activityType().trim().toUpperCase(Locale.ROOT).replace(' ', '_'));
        activity.setActivityDate(request.date() == null ? LocalDate.now() : request.date());
        activity.setDurationSec(request.durationSec());
        activity.setDistanceM(request.distanceM());
        activity.setCalories(request.calories());
        activity.setAvgHr(request.avgHr());
        activity.setNotes(request.notes());
        activity.setSource(request.source() == null || request.source().isBlank() ? "GARMIN" : request.source().trim().toUpperCase(Locale.ROOT));
    }

    private static TrainTemplateExercise exercise(TrainTemplate template, TrainDtos.ExerciseUpsert request, int order) {
        TrainTemplateExercise exercise = new TrainTemplateExercise();
        exercise.setTemplate(template);
        exercise.setName(request.name() == null ? "Exercise" : request.name().trim());
        exercise.setMuscle(muscle(request.muscle()));
        exercise.setTrack(request.track() == null || request.track().isBlank() ? "REPS" : request.track().trim().toUpperCase(Locale.ROOT));
        exercise.setSortOrder(order);
        exercise.setPlannedSets(new ArrayList<>(
                request.sets() == null || request.sets().isEmpty() ? defaultSets(exercise.getTrack()) : request.sets()
        ));
        return exercise;
    }

    private static List<PlannedSet> defaultSets(String track) {
        if ("TIME".equalsIgnoreCase(track)) {
            return List.of(new PlannedSet(null, null, null));
        }
        return List.of(
                new PlannedSet(8, null, null),
                new PlannedSet(8, null, null),
                new PlannedSet(8, null, null)
        );
    }

    private Map<String, List<TrainSet>> lastSets(UUID userId, TrainTemplate template) {
        TrainSession previous = sessions
                .findFirstByUserIdAndTemplate_IdAndEndedAtNotNullAndStartedAtLessThanOrderByStartedAtDesc(
                        userId, template.getId(), Instant.now())
                .orElse(null);
        if (previous == null) {
            previous = sessions
                    .findFirstByUserIdAndNameIgnoreCaseAndEndedAtNotNullAndStartedAtLessThanOrderByStartedAtDesc(
                            userId, template.getName(), Instant.now())
                    .orElse(null);
        }
        Map<String, List<TrainSet>> lastByExercise = new LinkedHashMap<>();
        if (previous == null) {
            return lastByExercise;
        }
        for (TrainSet row : previous.getSets()) {
            lastByExercise
                    .computeIfAbsent(row.getExerciseName().toLowerCase(Locale.ROOT), ignored -> new ArrayList<>())
                    .add(row);
        }
        lastByExercise.replaceAll((ignored, rows) -> {
            List<TrainSet> sorted = new ArrayList<>(rows);
            sorted.sort(Comparator.comparingInt(TrainSet::getSetIndex));
            return sorted;
        });
        return lastByExercise;
    }

    private static <T> T firstNonNull(T preferred, T fallback) {
        return preferred != null ? preferred : fallback;
    }

    private static String kind(String value) {
        if (value == null || value.isBlank()) {
            return "STRENGTH";
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private static String muscle(String value) {
        if (value == null || value.isBlank()) {
            return "OTHER";
        }
        String key = value.trim().toUpperCase(Locale.ROOT);
        return MUSCLES.contains(key) || key.equals("OTHER") ? key : "OTHER";
    }

    private static String grain(String granularity) {
        if (granularity == null || granularity.isBlank()) {
            return "week";
        }
        String value = granularity.toLowerCase(Locale.ROOT);
        return List.of("day", "week", "month").contains(value) ? value : "week";
    }

    private static String periodKey(Instant instant, String grain) {
        return periodKey(instant.atZone(ZoneOffset.UTC).toLocalDate(), grain);
    }

    private static String periodKey(LocalDate date, String grain) {
        if ("week".equals(grain)) {
            return date.getYear() + "-W" + date.get(WeekFields.ISO.weekOfWeekBasedYear());
        }
        if ("month".equals(grain)) {
            return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
        }
        return date.toString();
    }

    private static List<String> periodKeys(LocalDate from, LocalDate to, String grain) {
        List<String> keys = new ArrayList<>();
        if ("month".equals(grain)) {
            LocalDate cursor = from.withDayOfMonth(1);
            LocalDate last = to.withDayOfMonth(1);
            while (!cursor.isAfter(last)) {
                keys.add(periodKey(cursor, grain));
                cursor = cursor.plusMonths(1);
            }
            return keys;
        }
        if ("week".equals(grain)) {
            LocalDate cursor = from.with(DayOfWeek.MONDAY);
            LocalDate last = to.with(DayOfWeek.MONDAY);
            while (!cursor.isAfter(last)) {
                keys.add(periodKey(cursor, grain));
                cursor = cursor.plusWeeks(1);
            }
            return keys;
        }
        LocalDate cursor = from;
        while (!cursor.isAfter(to)) {
            keys.add(periodKey(cursor, grain));
            cursor = cursor.plusDays(1);
        }
        return keys;
    }

    private static List<TrainDtos.MusclePoint> muscleRadar(Map<String, BigDecimal> volume, Map<String, Integer> counts) {
        return MUSCLES.stream()
                .map(muscle -> new TrainDtos.MusclePoint(
                        muscle,
                        volume.getOrDefault(muscle, BigDecimal.ZERO),
                        counts.getOrDefault(muscle, 0)
                ))
                .toList();
    }

    private void markWorkout(UUID userId, LocalDate date, long durationSec, String note) {
        if (date == null || durationSec <= 0) {
            return;
        }
        BigDecimal minutes = BigDecimal.valueOf(durationSec).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        autoComplete.applyNamed(userId, date, "exercise|workout", minutes, BigDecimal.valueOf(45), note);
    }

    private LocalDate sessionDate(UUID userId, Instant startedAt) {
        User user = users.findById(userId).orElseThrow();
        return startedAt.atZone(ZoneId.of(user.getTimezone())).toLocalDate();
    }
}
