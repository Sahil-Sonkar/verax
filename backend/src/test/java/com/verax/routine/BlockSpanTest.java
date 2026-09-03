package com.verax.routine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BlockSpanTest {

    @Test
    void adjacentBlocksDoNotOverlap() {
        assertFalse(BlockSpan.overlaps(6 * 60, 7 * 60, 7 * 60, 8 * 60));
    }

    @Test
    void interiorTimesOverlap() {
        assertTrue(BlockSpan.overlaps(6 * 60, 8 * 60, 7 * 60, 9 * 60));
    }

    @Test
    void overnightWrapsIntoMorning() {
        assertTrue(BlockSpan.overlaps(22 * 60, 2 * 60, 1 * 60, 3 * 60));
        assertFalse(BlockSpan.overlaps(22 * 60, 2 * 60, 10 * 60, 11 * 60));
    }

    @Test
    void midnightEndIsEndOfDay() {
        assertTrue(BlockSpan.overlaps(22 * 60, 0, 23 * 60, 23 * 60 + 30));
    }
}
