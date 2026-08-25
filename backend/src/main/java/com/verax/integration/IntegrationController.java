package com.verax.integration;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integrations")
public class IntegrationController {

    private final IntegrationService integrations;
    private final CurrentUser currentUser;

    public IntegrationController(IntegrationService integrations, CurrentUser currentUser) {
        this.integrations = integrations;
        this.currentUser = currentUser;
    }

    @GetMapping
    public IntegrationDtos.Catalog catalog() {
        return integrations.catalog();
    }

    @PostMapping("/ingest")
    public IntegrationDtos.IngestResult ingest(@Valid @RequestBody IntegrationDtos.IngestRequest request) {
        return integrations.ingest(currentUser.id(), request);
    }
}
