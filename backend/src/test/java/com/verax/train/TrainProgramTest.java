package com.verax.train;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrainProgramTest {

    @Test
    void everyWorkoutLineHasInstructionsAndMuscle() {
        for (TrainProgram.Workout workout : TrainProgram.WORKOUTS) {
            for (TrainProgram.Line line : workout.lines()) {
                TrainProgram.Lift lift = TrainProgram.lift(line.name());
                assertEquals(line.name(), lift.name());
                assertFalse(lift.instructions().isBlank(), lift.name());
                assertFalse(lift.mappedMuscle().isBlank(), lift.name());
                assertFalse(line.plannedSets().isEmpty(), lift.name());
            }
        }
    }

    @Test
    void searchFindsLiftsWgerDidNotMatch() {
        var hits = ExerciseCatalog.match(TrainProgram.catalog(), "cable standing fly");
        assertEquals("Cable standing fly", hits.getFirst().name());
        assertEquals("CHEST", hits.getFirst().mappedMuscle());
        assertTrue(hits.getFirst().instructions().toLowerCase().contains("pulley")
                || hits.getFirst().instructions().toLowerCase().contains("cable")
                || hits.getFirst().instructions().toLowerCase().contains("arc"));

        var incline = ExerciseCatalog.match(TrainProgram.catalog(), "Dumbbell Incline Bench Press");
        assertEquals("Dumbbell Incline Bench Press", incline.getFirst().name());

        var walk = ExerciseCatalog.match(TrainProgram.catalog(), "incline walk");
        assertEquals("TIME", walk.getFirst().track());
        assertEquals(Integer.valueOf(1200), TrainProgram.WORKOUTS.getLast().lines().getLast().seconds());
    }
}
