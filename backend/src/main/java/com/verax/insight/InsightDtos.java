package com.verax.insight;

import java.time.LocalDate;
import java.util.List;

public final class InsightDtos {

    private InsightDtos() {
    }

    public record Preview(List<String> insights, String focus, String source, LocalDate weekStart) {
    }
}
