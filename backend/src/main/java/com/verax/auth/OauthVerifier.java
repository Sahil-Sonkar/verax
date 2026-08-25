package com.verax.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.verax.common.ApiException;
import com.verax.config.VeraxProperties;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.util.Base64;

@Component
public class OauthVerifier {

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    private final ObjectMapper mapper;
    private final VeraxProperties properties;

    public OauthVerifier(ObjectMapper mapper, VeraxProperties properties) {
        this.mapper = mapper;
        this.properties = properties;
    }

    public Identity google(String idToken) {
        if (!properties.getOauth().googleEnabled()) {
            throw ApiException.badRequest("Google sign-in is not configured. Set GOOGLE_CLIENT_ID.");
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + java.net.URLEncoder.encode(idToken, StandardCharsets.UTF_8)))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw ApiException.unauthorized("Google could not verify that sign-in");
            }
            JsonNode body = mapper.readTree(response.body());
            String aud = text(body, "aud");
            if (!properties.getOauth().getGoogleClientId().equals(aud)) {
                throw ApiException.unauthorized("Google client does not match this Verax app");
            }
            String email = text(body, "email");
            if (email == null) {
                throw ApiException.unauthorized("Google did not return an email");
            }
            String name = text(body, "name");
            if (name == null || name.isBlank()) {
                name = email.split("@")[0];
            }
            return new Identity("GOOGLE", text(body, "sub"), email, name);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.unauthorized("Google sign-in failed");
        }
    }

    public Identity apple(String idToken) {
        if (!properties.getOauth().appleEnabled()) {
            throw ApiException.badRequest("Apple sign-in is not configured. Set APPLE_CLIENT_ID.");
        }
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length < 2) {
                throw ApiException.unauthorized("Apple token is malformed");
            }
            JsonNode header = mapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
            JsonNode payload = mapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            String kid = text(header, "kid");
            RSAPublicKey key = appleKey(kid);
            io.jsonwebtoken.Claims claims = io.jsonwebtoken.Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();
            var audience = claims.getAudience();
            if (audience == null || !audience.contains(properties.getOauth().getAppleClientId())) {
                throw ApiException.unauthorized("Apple client does not match this Verax app");
            }
            String email = claims.get("email", String.class);
            if (email == null) {
                email = text(payload, "email");
            }
            if (email == null) {
                throw ApiException.unauthorized("Apple did not return an email. Hide my email is fine if relay is present.");
            }
            String name = email.split("@")[0];
            return new Identity("APPLE", claims.getSubject(), email, name);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.unauthorized("Apple sign-in failed");
        }
    }

    private RSAPublicKey appleKey(String kid) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://appleid.apple.com/auth/keys"))
                .timeout(Duration.ofSeconds(8))
                .GET()
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode keys = mapper.readTree(response.body()).path("keys");
        for (JsonNode key : keys) {
            if (kid.equals(text(key, "kid"))) {
                byte[] n = Base64.getUrlDecoder().decode(text(key, "n"));
                byte[] e = Base64.getUrlDecoder().decode(text(key, "e"));
                RSAPublicKeySpec spec = new RSAPublicKeySpec(new BigInteger(1, n), new BigInteger(1, e));
                return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(spec);
            }
        }
        throw ApiException.unauthorized("Apple signing key was not found");
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    public record Identity(String provider, String subject, String email, String name) {
    }
}
