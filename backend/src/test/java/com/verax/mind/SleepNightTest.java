package com.verax.mind;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SleepNightTest {

    @Test
    void stagesWinOverClockSpan() {
        SleepNight night = new SleepNight();
        night.setStartTime("23:00");
        night.setEndTime("07:00");
        night.setRemMin(90);
        night.setCoreMin(240);
        night.setDeepMin(90);
        night.setAwakeMin(60);
        assertEquals(7.0, night.sleptHours(), 0.01);
    }

    @Test
    void clockSpanWhenStagesEmpty() {
        SleepNight night = new SleepNight();
        night.setStartTime("23:00");
        night.setEndTime("07:00");
        assertEquals(8.0, night.sleptHours(), 0.01);
    }

    @Test
    void parseHmRejectsJunk() {
        assertEquals(null, SleepNight.parseHm("nope"));
        assertEquals(Integer.valueOf(23 * 60), SleepNight.parseHm("23:00:00"));
    }
}
