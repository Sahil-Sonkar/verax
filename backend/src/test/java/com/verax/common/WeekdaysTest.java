package com.verax.common;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WeekdaysTest {

    @Test
    void showerSubtaskOnlyOnNamedDays() {
        String block = Weekdays.ALL;
        String shampoo = "1,3";
        assertTrue(Weekdays.taskVisible(block, shampoo, 1));
        assertTrue(Weekdays.taskVisible(block, shampoo, 3));
        assertFalse(Weekdays.taskVisible(block, shampoo, 2));
        assertFalse(Weekdays.taskVisible(block, shampoo, 5));
    }

    @Test
    void emptyTaskDaysInheritBlock() {
        assertTrue(Weekdays.taskVisible("1,2,3,4,5", "", 1));
        assertFalse(Weekdays.taskVisible("1,2,3,4,5", "", 6));
    }

    @Test
    void formatRoundTrip() {
        assertEquals("1,3,5", Weekdays.format(List.of(5, 1, 3, 1)));
    }
}
