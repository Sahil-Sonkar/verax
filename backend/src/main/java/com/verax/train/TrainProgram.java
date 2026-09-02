package com.verax.train;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class TrainProgram {

    record Lift(
            String name,
            String type,
            String muscle,
            String mappedMuscle,
            String track,
            String difficulty,
            String instructions,
            String safety,
            List<String> equipment,
            String aliases
    ) {
        TrainDtos.ExerciseHit hit() {
            return new TrainDtos.ExerciseHit(
                    name, type, muscle, mappedMuscle, track, difficulty, instructions, safety, equipment
            );
        }

        ExerciseCatalog.IndexedHit indexed() {
            return ExerciseCatalog.index(hit(), aliases);
        }
    }

    record Line(String name, int sets, Integer reps, Integer seconds) {
        List<PlannedSet> plannedSets() {
            if (seconds != null) {
                return List.of(new PlannedSet(null, null, seconds));
            }
            List<PlannedSet> out = new ArrayList<>();
            for (int i = 0; i < sets; i++) {
                out.add(new PlannedSet(reps, null, null));
            }
            return out;
        }
    }

    record Workout(String name, String kind, int sortOrder, List<String> legacyNames, List<Line> lines) {
    }

    private static final List<Lift> LIFTS = List.of(
            strength("Push-ups", "chest", "CHEST", "beginner",
                    "Hands under shoulders, body in a straight line from head to heels. Lower until the chest is just above the floor, then press back up without letting the hips sag.",
                    "Keep the neck long and the core braced. Stop if the lower back caves.",
                    "push up pushups press-up", "none (bodyweight)"),
            strength("Barbell bench press", "chest", "CHEST", "intermediate",
                    "Lie on a flat bench with eyes under the bar. Unrack, lower the bar to mid-chest with elbows about 45–70° from the torso, then press until the arms are straight.",
                    "Use a spotter or safety pins. Do not bounce the bar off the chest.",
                    "bench press barbell press", "Barbell", "Bench"),
            strength("Cable standing fly", "chest", "CHEST", "intermediate",
                    "Set both pulleys at about shoulder height. Stand in a staggered stance between the stacks, slight bend in the elbows. Sweep the handles together in a wide arc until they meet in front of the chest, then open under control.",
                    "Keep the elbow angle fixed so it stays a fly, not a press. Brace so the torso does not swing.",
                    "standing cable fly cable crossover cable chest fly", "Cable machine", "D-handles"),
            strength("Weighted tricep dips", "triceps", "TRICEPS", "intermediate",
                    "Support on parallel bars, torso fairly upright to bias triceps. Lower until the elbows are near 90°, then press up to lockout. Add a dip belt or dumbbell between the legs when bodyweight is easy.",
                    "Do not dump the shoulders forward. Stop above a painful range at the bottom.",
                    "weighted dips tricep dip parallel bar", "Parallel bars", "Dip belt"),
            strength("Tricep pushdown", "triceps", "TRICEPS", "beginner",
                    "Stand facing a high cable with a bar or rope. Pin the elbows to the ribs and extend until the arms are straight, then return to about 90° without letting the elbows drift forward.",
                    "Use a weight you can lock out without leaning on the stack.",
                    "tricep pushdown cable pushdown", "Cable machine", "Straight bar or rope"),
            strength("Overhead tricep extension", "triceps", "TRICEPS", "beginner",
                    "Hold a dumbbell or rope overhead with elbows pointing up. Lower the weight behind the head by bending only the elbows, then extend back to the top. Keep the upper arms still.",
                    "Ribs down, no excessive lumbar arch. Lighten the load if the elbows flare wildly.",
                    "overhead extension skullcrusher french press", "Dumbbell or cable"),
            strength("Lying leg raise", "abs", "CORE", "beginner",
                    "Lie on your back, hands by the hips or under the glutes. Raise straight (or slightly bent) legs until the hips leave the floor slightly, then lower without slamming the heels.",
                    "Press the lower back toward the floor. Bend the knees if the back peels up.",
                    "lying leg raise reverse crunch", "Mat or bench"),
            cardio("Running on Treadmill",
                    "Walk on, set an easy jog, and stay tall with a slight forward lean from the ankles. Land quietly under the hips. 10 minutes at a pace you could still speak in short sentences.",
                    "Clip the safety key. Do not hold the rails unless you are getting on or off.",
                    "treadmill run jogging", "Treadmill"),
            strength("Dumbbell Incline Bench Press", "chest", "CHEST", "intermediate",
                    "Set a bench to about 30–45°. Press dumbbells from the sides of the chest to a lockout above the upper chest, lowering until the elbows are just below the bench line.",
                    "Do not let the dumbbells crash together at the top. Control the bottom.",
                    "incline dumbbell press incline bench", "Dumbbells", "Incline bench"),
            strength("Lever Pec Deck Fly", "chest", "CHEST", "beginner",
                    "Sit with the back against the pad, elbows on the wing pads or hands on the handles. Bring the arms together in a hugging arc, squeeze the chest, then open to a stretch without yanking the shoulders forward.",
                    "Keep a soft elbow bend. Reduce the range if the front of the shoulder pinches.",
                    "pec deck pec dec butterfly machine fly", "Pec deck machine"),
            strength("Lever Seated Shoulder Press", "shoulders", "SHOULDERS", "beginner",
                    "Sit tall, handles at about ear height. Press overhead until the arms are straight, then lower to the start. Keep the low back against the pad.",
                    "Do not shrug the last inches. Stop short of pain in the shoulder.",
                    "machine shoulder press seated press", "Shoulder press machine"),
            strength("Diamond Push-up", "triceps", "TRICEPS", "intermediate",
                    "Hands close under the chest, thumbs and index fingers forming a diamond. Lower the chest toward the hands, elbows tracking close to the ribs, then press up.",
                    "Drop to the knees if the hips sag. Wrist-friendly fists or handles if needed.",
                    "diamond push up close grip pushup", "none (bodyweight)"),
            strength("One-Arm Side Tricep Pushdown", "triceps", "TRICEPS", "intermediate",
                    "High pulley, D-handle. Stand sideways to the stack with the working arm closest to it. Elbow pinned to the ribs; extend the handle down toward the outside of the thigh, squeeze, return to ~90°.",
                    "Do not lean away from the weight or let the elbow travel forward.",
                    "one arm side tricep pushdown single arm pushdown", "Cable machine", "D-handle"),
            strength("Lever Total Abdominal Crunch", "abs", "CORE", "beginner",
                    "Set the seat so the pivot lines up with the lower ribs. Sit tall, feet anchored, hands on the handles. Curl the ribcage toward the pelvis — do not yank with the arms — squeeze, then return slowly.",
                    "If the hip flexors take over, raise the seat and slow the eccentric.",
                    "ab crunch machine seated crunch", "Ab crunch machine"),
            strength("Seated Neck Extension", "neck", "SHOULDERS", "beginner",
                    "Sit on the neck machine with the pad against the back of the head. Nod the head back against the pad through a small, controlled range, then return. Keep the jaw relaxed.",
                    "Use a light load. No sudden jerks; stop at any dizziness or sharp pain.",
                    "neck extension neck machine", "Neck machine"),
            strength("Assisted pull-ups", "lats", "BACK", "beginner",
                    "Set the assist so you can do clean reps. Hang from the handles, pull the chest toward the bar, then lower to a straight-arm hang. Drive the elbows down, not the chin up.",
                    "Do not kip. Reduce assistance as the last reps stay strict.",
                    "assisted pull up gravitron machine pullup", "Assisted pull-up machine"),
            strength("Cable Seated Lats focused Row", "lats", "BACK", "intermediate",
                    "Sit on the cable row with a close or V-handle. Chest up, slight knee bend. Drive the elbows back toward the hips (tucked, not flared) to load the lats, then let the shoulders reach forward for a stretch.",
                    "Do not swing the torso. Lead with the elbows, not a biceps curl.",
                    "seated cable row lat row", "Cable row", "V-bar or close grip"),
            strength("Bar Lateral Pull Down", "lats", "BACK", "beginner",
                    "Wide overhand grip on the lat bar. Sit with thighs under the pads. Pull the bar to the upper chest, elbows down and slightly in front, then control back to a stretch overhead.",
                    "Do not pull behind the neck. Avoid shrugging the bar down with the traps.",
                    "lat pulldown lateral pulldown wide grip pulldown", "Lat pulldown", "Lat bar"),
            strength("Bent Over Row", "lats", "BACK", "intermediate",
                    "Hinge to about 30–45° with a flat back, bar hanging at the knees. Row to the lower ribs, squeeze the shoulder blades, then lower under control.",
                    "Brace the core. Drop the load if the torso pops up each rep.",
                    "bent over row barbell row", "Barbell"),
            strength("Hammer Curl", "biceps", "BICEPS", "beginner",
                    "Stand with dumbbells at the sides, palms facing in. Curl without swinging, keeping the wrists neutral, then lower fully.",
                    "Elbows stay by the ribs. No torso lean.",
                    "hammer curls neutral curl", "Dumbbells"),
            strength("Cable One Arm Lateral Raise", "shoulders", "SHOULDERS", "beginner",
                    "Stand side-on to a low pulley, handle in the far hand. Raise the arm to about shoulder height with a soft elbow, then lower slowly. Repeat on both sides.",
                    "Lead with the elbow, not a shrug. Light enough to stop at shoulder height.",
                    "cable lateral raise single arm side raise", "Cable machine", "D-handle"),
            strength("Lever Seated Reverse Fly", "shoulders", "SHOULDERS", "beginner",
                    "Sit facing the pec-deck or rear-delt machine, chest on the pad, handles in front. Sweep the arms back in a reverse-fly arc until the shoulder blades squeeze, then return.",
                    "Soft elbows. Do not yank into the end range.",
                    "reverse fly rear delt machine reverse pec deck", "Rear delt / pec deck machine"),
            strength("Abs Wheel Rollout", "abs", "CORE", "intermediate",
                    "Kneel with the wheel under the shoulders. Roll forward until the body is long and the abs are braced, then pull the wheel back to the knees without sagging the hips.",
                    "Stop the range before the low back arches. Start short and lengthen over weeks.",
                    "ab wheel rollout barbell rollout", "Ab wheel"),
            strength("Deadlift", "back", "BACK", "intermediate",
                    "Bar over mid-foot, hinge and grip just outside the shins. Brace, push the floor away, stand until hips and knees lock, then return the bar down the legs.",
                    "Keep the bar close. Neutral spine — if the back rounds, reduce the load.",
                    "deadlifts conventional deadlift", "Barbell"),
            strength("Cable straight arm pulldown", "lats", "BACK", "beginner",
                    "Stand facing a high cable with a bar or rope. Arms almost straight, slight elbow bend. Sweep the handle from overhead down to the thighs by driving the elbows toward the hips, then raise under control.",
                    "Do not turn it into a tricep pushdown. Ribs down, no swinging.",
                    "straight arm pulldown pullover cable", "Cable machine", "Lat bar or rope"),
            strength("45 degree hyperextension", "lower back", "BACK", "beginner",
                    "Pad just below the hip crease, feet locked. Hinge forward with a long spine, then squeeze glutes and hamstrings to rise until the body is a straight line — not past it.",
                    "Do not crank into lumbar hyperextension at the top. Hands across the chest until that is easy.",
                    "hyperextension back extension roman chair", "45° hyper bench"),
            strength("Cable Standing Face Pull (with rope)", "shoulders", "SHOULDERS", "beginner",
                    "Set a rope at upper-chest or face height. Pull the rope toward the face, elbows high, and separate the ends beside the ears. Squeeze the rear delts and upper back, then extend the arms.",
                    "Do not let the lower back arch. Light enough to keep the elbows up.",
                    "face pull facepull rope face pull", "Cable machine", "Rope"),
            strength("Dumbbell Incline Biceps Curl", "biceps", "BICEPS", "beginner",
                    "Sit on a 30–45° incline with arms hanging. Curl the dumbbells without swinging the shoulders forward, then lower to a full stretch.",
                    "Keep the upper arms still against the bench. No bouncing at the bottom.",
                    "incline curl incline biceps", "Dumbbells", "Incline bench"),
            strength("Shrug", "traps", "BACK", "beginner",
                    "Hold a barbell or dumbbells at the sides. Shrug the shoulders straight up toward the ears, pause, lower without rolling.",
                    "Do not roll the shoulders. Neck stays long.",
                    "barbell shrug dumbbell shrug traps", "Barbell or dumbbells"),
            strength("Decline Crunch", "abs", "CORE", "beginner",
                    "Lie on a decline bench, feet hooked. Curl the ribcage toward the hips — a crunch, not a full sit-up — then lower with control.",
                    "Do not yank on the neck. Hands at the temples, not pulling the head.",
                    "decline crunch decline sit up", "Decline bench"),
            strength("Normal Squat", "quads", "QUADS", "beginner",
                    "Feet about shoulder-width. Sit the hips down and back until the thighs are at least parallel, chest up, then stand. Bodyweight only for these warm-up sets.",
                    "Knees track over the toes. Heels stay down.",
                    "bodyweight squat air squat", "none (bodyweight)"),
            strength("Lever Leg Extension", "quads", "QUADS", "beginner",
                    "Sit with the pad on the lower shins, knees in line with the machine pivot. Extend until the legs are straight, squeeze the quads, then lower without slamming.",
                    "Do not hyperextend the knees. Adjust the back pad so you are fully on the seat.",
                    "leg extension machine extension", "Leg extension machine"),
            strength("Dumbbell Lunges", "quads", "QUADS", "beginner",
                    "Hold dumbbells at the sides. Step forward, drop the back knee toward the floor, then push back to stand. Alternate legs. Torso stays tall.",
                    "Front knee tracks the toes. Shorten the step if the front heel lifts.",
                    "dumbbell lunge walking lunge", "Dumbbells"),
            strength("Barbell Squat", "quads", "QUADS", "intermediate",
                    "Bar on the upper back, brace, sit between the hips until at least parallel, then drive up. Keep the bar over mid-foot.",
                    "Use safety pins or a spotter. Do not collapse the chest at the bottom.",
                    "back squat barbell squat", "Barbell", "Squat rack"),
            strength("Lever Seated Leg Curl", "hamstrings", "HAMS", "beginner",
                    "Sit with the thigh pad locked and the ankle pad on the Achilles. Curl the heels toward the glutes, squeeze, then extend without letting the stack dump.",
                    "Hips stay down. Reduce range if the knees complain.",
                    "seated leg curl hamstring curl", "Seated leg curl machine"),
            strength("Lever Seated Calf Raise", "calves", "CALVES", "beginner",
                    "Sit with the balls of the feet on the platform, pad on the lower thighs. Drop the heels for a stretch, then rise onto the toes and pause.",
                    "Do not bounce. Full stretch and full squeeze.",
                    "seated calf raise", "Seated calf machine"),
            strength("Hanging Oblique Knee Raise", "obliques", "CORE", "intermediate",
                    "Hang from a pull-up bar with active shoulders. Raise both knees toward one side of the ribs, pause, lower still, then the other side. No swing.",
                    "Stop if the shoulders shrug into the ears. Use straps or a captain’s chair if grip fails first.",
                    "hanging oblique raise hanging knee raise", "Pull-up bar"),
            cardio("Walk Elliptical Cross Trainer",
                    "Stand tall on the pedals, light hands on the moving arms. Smooth stride for 7 minutes at a pace you could still talk.",
                    "Do not lock the knees. Keep the heels from hammering the pedals.",
                    "elliptical cross trainer cross trainer", "Elliptical"),
            strength("Sled 45 Leg Press", "quads", "QUADS", "beginner",
                    "On a 45° sled, feet mid-platform about shoulder-width. Lower until the thighs are at least parallel, then press without locking the knees hard.",
                    "Do not let the hips roll off the pad at the bottom. Keep the low back in contact.",
                    "45 leg press sled press hack", "45° leg press"),
            strength("Lever Hip Thrust", "glutes", "GLUTES", "beginner",
                    "Sit in the hip-thrust machine with the pad on the hips. Drive through the heels until the hips are in line with the shoulders and knees, squeeze the glutes, then lower.",
                    "Do not overarch the low back at lockout. Ribs down.",
                    "hip thrust glute drive machine", "Hip thrust machine"),
            strength("Lever Standing Calf Raise", "calves", "CALVES", "beginner",
                    "Shoulders under the pads, balls of the feet on the block. Drop the heels, then rise as high as possible and pause.",
                    "Straight but not locked knees. No bouncing.",
                    "standing calf raise machine calf", "Standing calf machine"),
            strength("Alternate Heel Touches", "obliques", "CORE", "beginner",
                    "Lie on your back, knees bent, feet flat. Crunch slightly and tap the right hand to the right heel, then the left, keeping the shoulder blades off the floor.",
                    "Do not yank the neck. Small side-to-side crunch, not a full sit-up.",
                    "heel touches alternating heel touch", "Mat"),
            cardio("Incline Walk on Treadmill",
                    "Set a brisk walk and raise the incline. Stay tall, short steps, 20 minutes. Arms swing; do not hang on the console.",
                    "Start the belt before you step on. Ease the incline down before you hop off.",
                    "incline walk treadmill hike", "Treadmill")
    );

    static final List<Workout> WORKOUTS = List.of(
            new Workout("Push · Week 1", "STRENGTH", 1, List.of("Push day 1"), List.of(
                    reps("Push-ups", 2, 15),
                    reps("Barbell bench press", 3, 10),
                    reps("Cable standing fly", 3, 12),
                    reps("Weighted tricep dips", 3, 10),
                    reps("Tricep pushdown", 3, 12),
                    reps("Overhead tricep extension", 3, 12),
                    reps("Lying leg raise", 3, 20),
                    time("Running on Treadmill", 600)
            )),
            new Workout("Push · Week 2", "STRENGTH", 2, List.of("Push day 2"), List.of(
                    reps("Push-ups", 2, 15),
                    reps("Dumbbell Incline Bench Press", 3, 12),
                    reps("Lever Pec Deck Fly", 3, 12),
                    reps("Lever Seated Shoulder Press", 3, 12),
                    reps("Diamond Push-up", 2, 10),
                    reps("One-Arm Side Tricep Pushdown", 3, 12),
                    reps("Lever Total Abdominal Crunch", 3, 14),
                    reps("Seated Neck Extension", 3, 12),
                    time("Running on Treadmill", 600)
            )),
            new Workout("Pull · Week 1", "STRENGTH", 3, List.of("Pull day 1"), List.of(
                    reps("Assisted pull-ups", 2, 8),
                    reps("Cable Seated Lats focused Row", 3, 12),
                    reps("Bar Lateral Pull Down", 3, 12),
                    reps("Bent Over Row", 3, 12),
                    reps("Hammer Curl", 3, 10),
                    reps("Cable One Arm Lateral Raise", 3, 12),
                    reps("Lever Seated Reverse Fly", 3, 12),
                    reps("Abs Wheel Rollout", 3, 10)
            )),
            new Workout("Pull · Week 2", "STRENGTH", 4, List.of("Pull day 2"), List.of(
                    reps("Assisted pull-ups", 2, 8),
                    reps("Deadlift", 3, 10),
                    reps("Cable straight arm pulldown", 3, 12),
                    reps("45 degree hyperextension", 3, 12),
                    reps("Cable Standing Face Pull (with rope)", 3, 12),
                    reps("Dumbbell Incline Biceps Curl", 3, 12),
                    reps("Shrug", 3, 12),
                    reps("Decline Crunch", 3, 12)
            )),
            new Workout("Legs · Week 1", "STRENGTH", 5, List.of("Leg day 1", "Legs day 1"), List.of(
                    reps("Normal Squat", 2, 20),
                    reps("Lever Leg Extension", 3, 12),
                    reps("Dumbbell Lunges", 3, 10),
                    reps("Barbell Squat", 3, 10),
                    reps("Lever Seated Leg Curl", 3, 12),
                    reps("Lever Seated Calf Raise", 3, 12),
                    reps("Hanging Oblique Knee Raise", 3, 15),
                    time("Walk Elliptical Cross Trainer", 420)
            )),
            new Workout("Legs · Week 2", "STRENGTH", 6, List.of("Leg day 2", "Legs day 2"), List.of(
                    reps("Normal Squat", 2, 20),
                    reps("Barbell Squat", 3, 10),
                    reps("Lever Seated Leg Curl", 3, 12),
                    reps("Sled 45 Leg Press", 3, 12),
                    reps("Lever Hip Thrust", 3, 12),
                    reps("Lever Standing Calf Raise", 3, 12),
                    reps("Alternate Heel Touches", 3, 20),
                    time("Incline Walk on Treadmill", 1200)
            ))
    );

    private static final Map<String, Lift> BY_NAME = byName();
    private static final List<ExerciseCatalog.IndexedHit> CATALOG = LIFTS.stream().map(Lift::indexed).toList();

    private TrainProgram() {
    }

    static List<ExerciseCatalog.IndexedHit> catalog() {
        return CATALOG;
    }

    static Lift lift(String name) {
        Lift found = BY_NAME.get(name);
        if (found == null) {
            throw new IllegalStateException("Unknown program lift: " + name);
        }
        return found;
    }

    static List<Lift> lifts() {
        return LIFTS;
    }

    private static Map<String, Lift> byName() {
        Map<String, Lift> map = new LinkedHashMap<>();
        for (Lift lift : LIFTS) {
            map.put(lift.name(), lift);
        }
        return Map.copyOf(map);
    }

    private static Line reps(String name, int sets, int reps) {
        return new Line(name, sets, reps, null);
    }

    private static Line time(String name, int seconds) {
        return new Line(name, 1, null, seconds);
    }

    private static Lift strength(
            String name,
            String muscle,
            String mapped,
            String difficulty,
            String instructions,
            String safety,
            String aliases,
            String... equipment
    ) {
        return new Lift(name, "strength", muscle, mapped, "REPS", difficulty, instructions, safety, List.of(equipment), aliases);
    }

    private static Lift cardio(String name, String instructions, String safety, String aliases, String... equipment) {
        return new Lift(name, "cardio", "cardio", "CARDIO", "TIME", "beginner", instructions, safety, List.of(equipment), aliases);
    }
}
