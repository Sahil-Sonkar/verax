package com.verax.train;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TrainRecoveryTest {

    @Test
    void seventyTwoHoursIsFullyRecovered() {
        assertEquals(0, TrainDtos.recoveryPct(0));
        assertEquals(50, TrainDtos.recoveryPct(36));
        assertEquals(100, TrainDtos.recoveryPct(72));
        assertEquals(100, TrainDtos.recoveryPct(200));
    }
}
