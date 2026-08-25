package com.verax.insight;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@RestController
public class QuoteController {

    private static final List<Quote> FALLBACK = List.of(
            new Quote("We are what we repeatedly do. Excellence, then, is not an act, but a habit.", "Aristotle"),
            new Quote("A river cuts through rock not because of its power, but because of its persistence.", "James N. Watkins"),
            new Quote("Small disciplines repeated with consistency every day lead to great achievements.", "John C. Maxwell"),
            new Quote("It does not matter how slowly you go as long as you do not stop.", "Confucius"),
            new Quote("The secret of change is to focus all of your energy not on fighting the old, but on building the new.", "Socrates")
    );

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
    private final ObjectMapper mapper;
    private volatile Cached cached;

    public QuoteController(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping("/api/quote")
    public Quote today() {
        Cached hit = cached;
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return hit.quote();
        }
        Quote fetched = fetch();
        cached = new Cached(fetched, Instant.now().plus(Duration.ofHours(6)));
        return fetched;
    }

    private Quote fetch() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://zenquotes.io/api/today"))
                    .timeout(Duration.ofSeconds(4))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                return fallback();
            }
            JsonNode root = mapper.readTree(response.body());
            JsonNode first = root.isArray() ? root.get(0) : root;
            String text = first.path("q").asText(null);
            String author = first.path("a").asText("Unknown");
            if (text == null || text.isBlank()) {
                return fallback();
            }
            return new Quote(text, author);
        } catch (Exception ex) {
            return fallback();
        }
    }

    private Quote fallback() {
        return FALLBACK.get(ThreadLocalRandom.current().nextInt(FALLBACK.size()));
    }

    public record Quote(String text, String author, String source) {
        public Quote(String text, String author) {
            this(text, author, "zenquotes");
        }
    }

    private record Cached(Quote quote, Instant expiresAt) {
    }
}
