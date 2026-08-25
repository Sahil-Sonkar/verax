package com.verax.auth;

import com.verax.config.VeraxProperties;
import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    private final AuthService auth;
    private final CurrentUser currentUser;
    private final VeraxProperties properties;

    public AuthController(AuthService auth, CurrentUser currentUser, VeraxProperties properties) {
        this.auth = auth;
        this.currentUser = currentUser;
        this.properties = properties;
    }

    @PostMapping("/api/auth/register")
    public AuthDtos.AuthResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return auth.register(request);
    }

    @PostMapping("/api/auth/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return auth.login(request);
    }

    @GetMapping("/api/auth/providers")
    public AuthDtos.Providers providers() {
        var oauth = properties.getOauth();
        return new AuthDtos.Providers(
                oauth.googleEnabled(),
                oauth.appleEnabled(),
                oauth.googleEnabled() ? oauth.getGoogleClientId() : null,
                oauth.appleEnabled() ? oauth.getAppleClientId() : null
        );
    }

    @PostMapping("/api/auth/google")
    public AuthDtos.AuthResponse google(@Valid @RequestBody AuthDtos.OauthRequest request) {
        return auth.oauth("google", request);
    }

    @PostMapping("/api/auth/apple")
    public AuthDtos.AuthResponse apple(@Valid @RequestBody AuthDtos.OauthRequest request) {
        return auth.oauth("apple", request);
    }

    @GetMapping("/api/me")
    public AuthDtos.UserResponse me() {
        return auth.me(currentUser.id());
    }

    @PatchMapping("/api/me")
    public AuthDtos.UserResponse update(@Valid @RequestBody AuthDtos.UpdateProfileRequest request) {
        return auth.update(currentUser.id(), request);
    }
}
