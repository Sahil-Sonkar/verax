package com.verax.auth;

import com.verax.category.CategoryService;
import com.verax.common.ApiException;
import com.verax.notify.NotificationPreferences;
import com.verax.notify.NotificationPreferencesRepository;
import com.verax.security.JwtService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtService jwt;
    private final CategoryService categories;
    private final NotificationPreferencesRepository notificationPreferences;
    private final OauthVerifier oauth;

    public AuthService(
            UserRepository users,
            PasswordEncoder passwords,
            JwtService jwt,
            CategoryService categories,
            NotificationPreferencesRepository notificationPreferences,
            OauthVerifier oauth
    ) {
        this.users = users;
        this.passwords = passwords;
        this.jwt = jwt;
        this.categories = categories;
        this.notificationPreferences = notificationPreferences;
        this.oauth = oauth;
    }

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with that email already exists");
        }
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwords.encode(request.password()));
        if (request.timezone() != null && !request.timezone().isBlank()) {
            user.setTimezone(request.timezone().trim());
        }
        users.save(user);
        categories.createDefaultsFor(user.getId());
        NotificationPreferences prefs = new NotificationPreferences();
        prefs.setUserId(user.getId());
        notificationPreferences.save(prefs);
        return toAuth(user);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        User user = users.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw ApiException.unauthorized("This account signs in with Google or Apple");
        }
        if (!passwords.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        return toAuth(user);
    }

    @Transactional
    public AuthDtos.AuthResponse oauth(String provider, AuthDtos.OauthRequest request) {
        OauthVerifier.Identity identity = switch (provider.toLowerCase()) {
            case "google" -> oauth.google(request.idToken());
            case "apple" -> oauth.apple(request.idToken());
            default -> throw ApiException.badRequest("Unknown provider");
        };
        User user = users.findByAuthProviderAndProviderSubject(identity.provider(), identity.subject())
                .orElseGet(() -> users.findByEmailIgnoreCase(identity.email().trim().toLowerCase()).orElse(null));
        if (user == null) {
            user = new User();
            user.setName(identity.name());
            user.setEmail(identity.email().trim().toLowerCase());
            user.setAuthProvider(identity.provider());
            user.setProviderSubject(identity.subject());
            user.setTimezone(java.time.ZoneId.systemDefault().getId());
            users.save(user);
            categories.createDefaultsFor(user.getId());
            NotificationPreferences prefs = new NotificationPreferences();
            prefs.setUserId(user.getId());
            notificationPreferences.save(prefs);
        } else {
            user.setAuthProvider(identity.provider());
            user.setProviderSubject(identity.subject());
            if (user.getName() == null || user.getName().isBlank()) {
                user.setName(identity.name());
            }
        }
        return toAuth(user);
    }

    public AuthDtos.UserResponse me(UUID userId) {
        return toUser(require(userId));
    }

    @Transactional
    public AuthDtos.UserResponse update(UUID userId, AuthDtos.UpdateProfileRequest request) {
        User user = require(userId);
        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name().trim());
        }
        if (request.timezone() != null && !request.timezone().isBlank()) {
            user.setTimezone(request.timezone().trim());
        }
        return toUser(user);
    }

    public User require(UUID userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
    }

    private AuthDtos.AuthResponse toAuth(User user) {
        return new AuthDtos.AuthResponse(jwt.issue(user.getId(), user.getEmail()), jwt.expiresAt(), toUser(user));
    }

    public static AuthDtos.UserResponse toUser(User user) {
        return new AuthDtos.UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getTimezone(),
                user.getCreatedAt()
        );
    }
}
