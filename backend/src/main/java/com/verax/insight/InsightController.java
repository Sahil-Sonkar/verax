package com.verax.insight;

import com.verax.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/insights")
public class InsightController {

    private final InsightService insights;
    private final CurrentUser currentUser;

    public InsightController(InsightService insights, CurrentUser currentUser) {
        this.insights = insights;
        this.currentUser = currentUser;
    }

    @GetMapping("/preview")
    public InsightDtos.Preview preview() {
        return insights.preview(currentUser.id());
    }
}
