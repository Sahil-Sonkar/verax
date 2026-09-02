package com.verax.calendar;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.verax.common.ApiException;
import com.verax.config.VeraxProperties;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

@Component
public class GoogleCalendarClient {

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper mapper;
    private final VeraxProperties properties;

    public GoogleCalendarClient(ObjectMapper mapper, VeraxProperties properties) {
        this.mapper = mapper;
        this.properties = properties;
    }

    public TokenPair exchangeCode(String code, String redirectUri) {
        return tokens(Map.of(
                "code", code,
                "client_id", properties.getOauth().getGoogleClientId(),
                "client_secret", properties.getOauth().getGoogleClientSecret(),
                "redirect_uri", redirectUri,
                "grant_type", "authorization_code"
        ));
    }

    public TokenPair refresh(String refreshToken) {
        return tokens(Map.of(
                "refresh_token", refreshToken,
                "client_id", properties.getOauth().getGoogleClientId(),
                "client_secret", properties.getOauth().getGoogleClientSecret(),
                "grant_type", "refresh_token"
        ));
    }

    public String email(String accessToken) {
        JsonNode body = get("https://www.googleapis.com/oauth2/v2/userinfo", accessToken, null);
        String email = text(body, "email");
        if (email == null || email.isBlank()) {
            throw ApiException.badRequest("Google did not return an email for Calendar");
        }
        return email;
    }

    public JsonNode insert(String accessToken, String calendarId, Map<String, Object> event) {
        return send(
                "POST",
                "https://www.googleapis.com/calendar/v3/calendars/" + enc(calendarId) + "/events",
                accessToken,
                event
        );
    }

    public JsonNode patch(String accessToken, String calendarId, String eventId, Map<String, Object> event) {
        return send(
                "PATCH",
                "https://www.googleapis.com/calendar/v3/calendars/" + enc(calendarId) + "/events/" + enc(eventId),
                accessToken,
                event
        );
    }

    public void delete(String accessToken, String calendarId, String eventId) {
        try {
            send(
                    "DELETE",
                    "https://www.googleapis.com/calendar/v3/calendars/" + enc(calendarId) + "/events/" + enc(eventId),
                    accessToken,
                    null
            );
        } catch (GoogleHttpException ex) {
            if (ex.status != 404 && ex.status != 410) {
                throw ex;
            }
        }
    }

    public Page list(String accessToken, String calendarId, String pageToken, String syncToken) {
        StringJoiner query = new StringJoiner("&");
        query.add("maxResults=250");
        query.add("showDeleted=true");
        if (syncToken != null && !syncToken.isBlank()) {
            query.add("syncToken=" + enc(syncToken));
        }
        if (pageToken != null && !pageToken.isBlank()) {
            query.add("pageToken=" + enc(pageToken));
        }
        JsonNode body = get(
                "https://www.googleapis.com/calendar/v3/calendars/" + enc(calendarId) + "/events?" + query,
                accessToken,
                null
        );
        return page(body);
    }

    public Page listRange(String accessToken, String calendarId, String timeMin, String timeMax) {
        StringJoiner query = new StringJoiner("&");
        query.add("maxResults=250");
        query.add("singleEvents=true");
        query.add("orderBy=startTime");
        query.add("timeMin=" + enc(timeMin));
        query.add("timeMax=" + enc(timeMax));
        JsonNode body = get(
                "https://www.googleapis.com/calendar/v3/calendars/" + enc(calendarId) + "/events?" + query,
                accessToken,
                null
        );
        return page(body);
    }

    private TokenPair tokens(Map<String, String> fields) {
        StringJoiner form = new StringJoiner("&");
        fields.forEach((key, value) -> form.add(enc(key) + "=" + enc(value)));
        JsonNode body = sendForm("https://oauth2.googleapis.com/token", form.toString());
        String access = text(body, "access_token");
        if (access == null) {
            throw ApiException.badRequest("Google did not return an access token");
        }
        Integer expires = body.path("expires_in").isNumber() ? body.path("expires_in").asInt() : 3600;
        return new TokenPair(access, text(body, "refresh_token"), expires);
    }

    private JsonNode sendForm(String url, String form) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            return parse(response, url);
        } catch (ApiException | GoogleHttpException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.badRequest("Google token request failed");
        }
    }

    private JsonNode send(String method, String url, String accessToken, Object body) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + accessToken);
            if (body != null) {
                builder.header("Content-Type", "application/json");
                String json = mapper.writeValueAsString(body);
                if ("PATCH".equals(method)) {
                    builder.method("PATCH", HttpRequest.BodyPublishers.ofString(json));
                } else {
                    builder.POST(HttpRequest.BodyPublishers.ofString(json));
                }
            } else {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            }
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if ("DELETE".equals(method) && (response.statusCode() == 204 || response.statusCode() == 200)) {
                return mapper.createObjectNode();
            }
            return parse(response, url);
        } catch (ApiException | GoogleHttpException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new GoogleHttpException(0, "Google Calendar request failed");
        }
    }

    private JsonNode get(String url, String accessToken, Void ignored) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            return parse(response, url);
        } catch (ApiException | GoogleHttpException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new GoogleHttpException(0, "Google Calendar request failed");
        }
    }

    private JsonNode parse(HttpResponse<String> response, String url) throws Exception {
        if (response.statusCode() >= 400) {
            String message = "Google Calendar error";
            try {
                JsonNode err = mapper.readTree(response.body()).path("error");
                if (err.hasNonNull("message")) {
                    message = err.get("message").asText();
                } else if (err.isTextual()) {
                    message = err.asText();
                }
            } catch (Exception ignored) {
                if (response.body() != null && !response.body().isBlank()) {
                    message = response.body();
                }
            }
            throw new GoogleHttpException(response.statusCode(), message + " (" + url + ")");
        }
        if (response.body() == null || response.body().isBlank()) {
            return mapper.createObjectNode();
        }
        return mapper.readTree(response.body());
    }

    private static Page page(JsonNode body) {
        List<JsonNode> items = new ArrayList<>();
        JsonNode raw = body.path("items");
        if (raw.isArray()) {
            raw.forEach(items::add);
        }
        return new Page(items, text(body, "nextPageToken"), text(body, "nextSyncToken"));
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() || value.asText().isBlank() ? null : value.asText();
    }

    private static String enc(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    public record TokenPair(String accessToken, String refreshToken, int expiresIn) {
    }

    public record Page(List<JsonNode> items, String nextPageToken, String nextSyncToken) {
    }

    public static class GoogleHttpException extends RuntimeException {
        public final int status;

        public GoogleHttpException(int status, String message) {
            super(message);
            this.status = status;
        }
    }
}
