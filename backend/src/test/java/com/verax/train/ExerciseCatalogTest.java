package com.verax.train;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExerciseCatalogTest {

    @Test
    void mapsNinjaMuscleAndCardioTrack() {
        assertEquals("CHEST", ExerciseCatalog.mappedMuscle("chest", "strength"));
        assertEquals("QUADS", ExerciseCatalog.mappedMuscle("quadriceps", "strength"));
        assertEquals("BACK", ExerciseCatalog.mappedMuscle("lats", "strength"));
        assertEquals("CORE", ExerciseCatalog.mappedMuscle("abdominals", "strength"));
        assertEquals("CARDIO", ExerciseCatalog.mappedMuscle("quadriceps", "cardio"));
        assertEquals("TIME", ExerciseCatalog.track("cardio"));
        assertEquals("REPS", ExerciseCatalog.track("strength"));
        assertEquals("quadriceps", ExerciseCatalog.ninjaMuscle("quads"));
        assertEquals("abdominals", ExerciseCatalog.ninjaMuscle("core"));
    }

    @Test
    void readsNinjaPayload() {
        TrainDtos.ExerciseHit hit = ExerciseCatalog.fromNinja(Map.of(
                "name", "Incline Hammer Curls",
                "type", "strength",
                "muscle", "biceps",
                "difficulty", "beginner",
                "instructions", "Seat yourself on an incline bench.",
                "safety_info", "Keep your back firmly against the bench.",
                "equipments", List.of("dumbbells", "incline bench")
        ));
        assertEquals("Incline Hammer Curls", hit.name());
        assertEquals("BICEPS", hit.mappedMuscle());
        assertEquals("REPS", hit.track());
        assertEquals("beginner", hit.difficulty());
        assertTrue(hit.equipment().contains("dumbbells"));
        assertTrue(hit.safetyInfo().contains("back"));
    }

    @Test
    void mapsWgerPayloadAndStripsHtml() {
        TrainDtos.ExerciseHit hit = ExerciseCatalog.fromWger(Map.of(
                "category", Map.of("id", 11, "name", "Chest"),
                "muscles", List.of(Map.of("name", "Pectoralis major", "name_en", "Chest")),
                "equipment", List.of(Map.of("name", "Barbell")),
                "translations", List.of(Map.of(
                        "name", "Bench Press",
                        "language", 2,
                        "description", "<p>Lie on the bench.</p><p>Press the bar up.</p>",
                        "notes", List.of(Map.of("comment", "Keep wrists straight.")),
                        "aliases", List.of(Map.of("alias", "Barbell bench"))
                ))
        )).hit();
        assertEquals("Bench Press", hit.name());
        assertEquals("strength", hit.type());
        assertEquals("chest", hit.muscle());
        assertEquals("CHEST", hit.mappedMuscle());
        assertEquals("REPS", hit.track());
        assertTrue(hit.instructions().contains("Lie on the bench."));
        assertTrue(hit.instructions().contains("Press the bar up."));
        assertFalse(hit.instructions().contains("<p>"));
        assertEquals("Keep wrists straight.", hit.safetyInfo());
        assertTrue(hit.equipment().contains("Barbell"));
    }

    @Test
    void mapsWgerCardioAndFallsBackToCategoryMuscle() {
        TrainDtos.ExerciseHit hit = ExerciseCatalog.fromWger(Map.of(
                "category", Map.of("name", "Cardio"),
                "muscles", List.of(),
                "equipment", List.of(),
                "translations", List.of(Map.of(
                        "name", "Running",
                        "language", 2,
                        "description", "Run at an easy pace.",
                        "notes", List.of(),
                        "aliases", List.of()
                ))
        )).hit();
        assertEquals("CARDIO", hit.mappedMuscle());
        assertEquals("TIME", hit.track());
        assertEquals("cardio", hit.muscle());
    }

    @Test
    void ranksWgerNameMatchesAheadOfMuscleHits() {
        List<ExerciseCatalog.IndexedHit> catalog = List.of(
                ExerciseCatalog.fromWger(wger("Squat", "Legs", "Quads")),
                ExerciseCatalog.fromWger(wger("Bench Press", "Chest", "Chest")),
                ExerciseCatalog.fromWger(wger("Incline Bench Press", "Chest", "Chest")),
                ExerciseCatalog.fromWger(wger("Biceps Curl", "Arms", "Biceps"))
        );
        List<String> names = ExerciseCatalog.match(catalog, "bench").stream()
                .map(TrainDtos.ExerciseHit::name)
                .toList();
        assertEquals(List.of("Bench Press", "Incline Bench Press"), names);
        assertEquals("BICEPS", ExerciseCatalog.match(catalog, "biceps").getFirst().mappedMuscle());
        assertEquals("Bench Press", ExerciseCatalog.match(catalog, "press bench").getFirst().name());
    }

    @Test
    void stripsHtmlEntities() {
        assertEquals("Push & pull", ExerciseCatalog.htmlToText("<p>Push &amp; pull</p>"));
    }

    private static Map<String, Object> wger(String name, String category, String muscle) {
        return Map.of(
                "category", Map.of("name", category),
                "muscles", List.of(Map.of("name_en", muscle)),
                "equipment", List.of(),
                "translations", List.of(Map.of(
                        "name", name,
                        "language", 2,
                        "description", "",
                        "notes", List.of(),
                        "aliases", List.of()
                ))
        );
    }
}
