package com.verax.security;

import com.verax.config.VeraxProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final VeraxProperties properties;

    public JwtService(VeraxProperties properties) {
        this.properties = properties;
    }

    public String issue(UUID userId, String email) {
        Instant now = Instant.now();
        Instant exp = now.plus(properties.getJwt().getTtl());
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key())
                .compact();
    }

    public Instant expiresAt() {
        return Instant.now().plus(properties.getJwt().getTtl());
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String issueCalendarState(UUID userId, String redirectUri) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("kind", "gcal")
                .claim("redirect", redirectUri)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofMinutes(20))))
                .signWith(key())
                .compact();
    }

    public CalendarState parseCalendarState(String token) {
        Claims claims = parse(token);
        if (!"gcal".equals(claims.get("kind", String.class))) {
            throw new IllegalArgumentException("Not a calendar connect token");
        }
        return new CalendarState(UUID.fromString(claims.getSubject()), claims.get("redirect", String.class));
    }

    public record CalendarState(UUID userId, String redirectUri) {
    }

    private SecretKey key() {
        byte[] bytes = properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(bytes, 0, padded, 0, bytes.length);
            bytes = padded;
        }
        return Keys.hmacShaKeyFor(bytes);
    }
}
