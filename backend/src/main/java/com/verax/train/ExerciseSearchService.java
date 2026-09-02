package com.verax.train;

import com.verax.common.ApiException;
import com.verax.config.VeraxProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ExerciseSearchService {

    private static final Logger log = LoggerFactory.getLogger(ExerciseSearchService.class);
    private static final String WGER_INFO = "https://wger.de/api/v2/exerciseinfo/?limit=1000";
    private static final Duration WGER_TTL = Duration.ofHours(12);
    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST = new ParameterizedTypeReference<>() {
    };
    private static final ParameterizedTypeReference<Map<String, Object>> MAP = new ParameterizedTypeReference<>() {
    };

    private final RestClient http = RestClient.builder()
            .defaultHeader("User-Agent", "Verax/0.1 (personal training tracker)")
            .build();
    private final VeraxProperties properties;

    private volatile List<ExerciseCatalog.IndexedHit> wgerCatalog = List.of();
    private volatile Instant wgerLoadedAt;

    public ExerciseSearchService(VeraxProperties properties) {
        this.properties = properties;
    }

    public List<TrainDtos.ExerciseHit> search(String query) {
        if (query == null || query.isBlank()) {
            throw ApiException.badRequest("Enter an exercise name");
        }
        String q = query.trim();
        List<TrainDtos.ExerciseHit> local = ExerciseCatalog.match(TrainProgram.catalog(), q);
        List<TrainDtos.ExerciseHit> ninjas = ninjas(q);
        if (!ninjas.isEmpty()) {
            return ExerciseCatalog.merge(local, ninjas);
        }
        List<TrainDtos.ExerciseHit> wger = wger(q);
        if (wger != null) {
            return ExerciseCatalog.merge(local, wger);
        }
        if (!local.isEmpty()) {
            return local;
        }
        throw ApiException.badRequest("Could not search exercises right now.");
    }

    private List<TrainDtos.ExerciseHit> ninjas(String query) {
        String key = properties.getNinjasApiKey();
        if (key.isBlank()) {
            return List.of();
        }
        try {
            List<Map<String, Object>> body = http.get()
                    .uri(ninjasUrl(query))
                    .accept(MediaType.APPLICATION_JSON)
                    .header("X-Api-Key", key)
                    .retrieve()
                    .body(LIST);
            if (body == null) {
                return List.of();
            }
            List<TrainDtos.ExerciseHit> hits = new ArrayList<>();
            for (Map<String, Object> row : body) {
                TrainDtos.ExerciseHit hit = ExerciseCatalog.fromNinja(row);
                if (hit != null) {
                    hits.add(hit);
                }
            }
            return hits;
        } catch (RestClientResponseException ex) {
            log.info("API Ninjas search failed: {}", ex.getStatusCode());
            return List.of();
        } catch (Exception ex) {
            log.info("API Ninjas search failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<TrainDtos.ExerciseHit> wger(String query) {
        try {
            return ExerciseCatalog.match(wgerCatalog(), query);
        } catch (Exception ex) {
            log.info("wger search failed: {}", ex.getMessage());
            if (!wgerCatalog.isEmpty()) {
                return ExerciseCatalog.match(wgerCatalog, query);
            }
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private List<ExerciseCatalog.IndexedHit> wgerCatalog() {
        Instant loaded = wgerLoadedAt;
        List<ExerciseCatalog.IndexedHit> cached = wgerCatalog;
        if (!cached.isEmpty() && loaded != null && loaded.isAfter(Instant.now().minus(WGER_TTL))) {
            return cached;
        }
        synchronized (this) {
            loaded = wgerLoadedAt;
            cached = wgerCatalog;
            if (!cached.isEmpty() && loaded != null && loaded.isAfter(Instant.now().minus(WGER_TTL))) {
                return cached;
            }
            Map<String, Object> body = http.get()
                    .uri(WGER_INFO)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(MAP);
            if (body == null || !(body.get("results") instanceof List<?> results)) {
                throw new IllegalStateException("wger returned no exercises");
            }
            List<ExerciseCatalog.IndexedHit> catalog = new ArrayList<>();
            for (Object row : results) {
                if (!(row instanceof Map<?, ?> map)) {
                    continue;
                }
                ExerciseCatalog.IndexedHit hit = ExerciseCatalog.fromWger((Map<String, Object>) map);
                if (hit != null) {
                    catalog.add(hit);
                }
            }
            if (catalog.isEmpty()) {
                throw new IllegalStateException("wger returned no named exercises");
            }
            wgerCatalog = List.copyOf(catalog);
            wgerLoadedAt = Instant.now();
            log.info("Cached {} wger exercises", catalog.size());
            return wgerCatalog;
        }
    }

    private static String ninjasUrl(String query) {
        String muscle = ExerciseCatalog.ninjaMuscle(query);
        if (muscle != null) {
            return "https://api.api-ninjas.com/v1/exercises?muscle=" + enc(muscle);
        }
        return "https://api.api-ninjas.com/v1/exercises?name=" + enc(query);
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
