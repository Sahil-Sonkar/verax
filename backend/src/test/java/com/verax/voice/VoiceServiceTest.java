package com.verax.voice;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class VoiceServiceTest {

    @Test
    void platformsCoverYoutubeInstagramLinkedIn() {
        assertEquals(List.of("YOUTUBE", "INSTAGRAM", "LINKEDIN"),
                VoiceService.PLATFORMS.stream().map(VoiceService.PlatformSpec::key).toList());
    }

    @Test
    void unknownPlatformIsRejected() {
        assertThrows(com.verax.common.ApiException.class, () -> VoiceService.platform("tiktok"));
        assertEquals("YOUTUBE", VoiceService.platform("youtube").key());
    }
}
