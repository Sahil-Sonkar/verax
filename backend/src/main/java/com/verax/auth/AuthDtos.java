package com.verax.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            String timezone
    ) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {
    }

    public record UserResponse(
            UUID id,
            String name,
            String email,
            String timezone,
            Instant createdAt
    ) {
    }

    public record AuthResponse(
            String token,
            Instant expiresAt,
            UserResponse user
    ) {
    }

    public record UpdateProfileRequest(
            @Size(max = 120) String name,
            String timezone
    ) {
    }

    public record OauthRequest(@NotBlank String idToken) {
    }

    public record Providers(boolean google, boolean apple, String googleClientId, String appleClientId) {
    }
}
