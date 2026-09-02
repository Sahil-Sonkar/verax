package com.verax.calendar;

import com.fasterxml.jackson.databind.JsonNode;
import com.verax.calendar.GoogleCalendarClient.GoogleHttpException;
import com.verax.common.ApiException;
import com.verax.common.SecretBox;
import com.verax.common.Weekdays;
import com.verax.config.VeraxProperties;
import com.verax.routine.RoutineBlock;
import com.verax.routine.RoutineBlockRepository;
import com.verax.security.JwtService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class GoogleCalendarService {

    private static final Logger log = LoggerFactory.getLogger(GoogleCalendarService.class);
    private static final Set<String> LOCAL_HOSTS = Set.of("localhost", "127.0.0.1");

    private final VeraxProperties properties;
    private final JwtService jwt;
    private final SecretBox secrets;
    private final GoogleCalendarClient client;
    private final GoogleCalendarAccountRepository accounts;
    private final RoutineBlockRepository blocks;
    private final UserRepository users;

    public GoogleCalendarService(
            VeraxProperties properties,
            JwtService jwt,
            SecretBox secrets,
            GoogleCalendarClient client,
            GoogleCalendarAccountRepository accounts,
            RoutineBlockRepository blocks,
            UserRepository users
    ) {
        this.properties = properties;
        this.jwt = jwt;
        this.secrets = secrets;
        this.client = client;
        this.accounts = accounts;
        this.blocks = blocks;
        this.users = users;
    }

    public GoogleCalendarDtos.Status status(UUID userId) {
        boolean configured = properties.getOauth().googleCalendarEnabled();
        return accounts.findById(userId)
                .map(account -> new GoogleCalendarDtos.Status(
                        configured,
                        true,
                        account.getGoogleEmail(),
                        account.getLastSyncedAt(),
                        account.getLastError()
                ))
                .orElseGet(() -> new GoogleCalendarDtos.Status(configured, false, null, null, null));
    }

    public GoogleCalendarDtos.AuthUrl authUrl(UUID userId, String redirectUri) {
        requireConfigured();
        String redirect = requireRedirect(redirectUri);
        String state = jwt.issueCalendarState(userId, redirect);
        String url = "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + enc(properties.getOauth().getGoogleClientId())
                + "&redirect_uri=" + enc(redirect)
                + "&response_type=code"
                + "&scope=" + enc("https://www.googleapis.com/auth/calendar.events email")
                + "&access_type=offline"
                + "&prompt=consent"
                + "&include_granted_scopes=true"
                + "&state=" + enc(state);
        return new GoogleCalendarDtos.AuthUrl(url, redirect);
    }

    @Transactional
    public GoogleCalendarDtos.Status connect(UUID userId, GoogleCalendarDtos.CallbackRequest request) {
        requireConfigured();
        if (request == null || request.code() == null || request.state() == null) {
            throw ApiException.badRequest("Google did not return an authorization code");
        }
        JwtService.CalendarState state;
        try {
            state = jwt.parseCalendarState(request.state());
        } catch (Exception ex) {
            throw ApiException.badRequest("Calendar connect expired. Try again.");
        }
        if (!userId.equals(state.userId())) {
            throw ApiException.unauthorized("Google Calendar connect was started by a different user");
        }
        String redirect = requireRedirect(request.redirectUri() == null ? state.redirectUri() : request.redirectUri());
        if (!redirect.equals(state.redirectUri())) {
            throw ApiException.badRequest("Redirect URI does not match the connect request");
        }
        GoogleCalendarClient.TokenPair tokens = client.exchangeCode(request.code(), redirect);
        if (tokens.refreshToken() == null || tokens.refreshToken().isBlank()) {
            throw ApiException.badRequest("Google did not return a refresh token. Disconnect any old Verax grant in Google Account permissions, then connect again.");
        }
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
        String email = client.email(tokens.accessToken());
        GoogleCalendarAccount account = accounts.findById(userId).orElseGet(GoogleCalendarAccount::new);
        account.setUser(user);
        account.setGoogleEmail(email);
        account.setCalendarId("primary");
        account.setRefreshTokenEnc(secrets.seal(tokens.refreshToken()));
        storeAccess(account, tokens);
        account.setSyncToken(null);
        account.setLastError(null);
        accounts.save(account);
        syncLocked(account);
        return status(userId);
    }

    @Transactional
    public void disconnect(UUID userId) {
        accounts.findById(userId).ifPresent(account -> {
            for (RoutineBlock block : blocks.findWithTasks(userId)) {
                block.setGoogleEventId(null);
                block.setGoogleEtag(null);
                block.setGoogleUpdatedAt(null);
            }
            accounts.delete(account);
        });
    }

    @Transactional
    public GoogleCalendarDtos.Status sync(UUID userId) {
        GoogleCalendarAccount account = accounts.findById(userId)
                .orElseThrow(() -> ApiException.badRequest("Connect Google Calendar first"));
        syncLocked(account);
        return status(userId);
    }

    public void pushBlock(UUID userId, UUID blockId) {
        Optional<GoogleCalendarAccount> account = accounts.findById(userId);
        if (account.isEmpty()) {
            return;
        }
        RoutineBlock block = blocks.findByIdAndUserId(blockId, userId).orElse(null);
        if (block == null) {
            return;
        }
        try {
            upsert(account.get(), block);
            clearError(account.get());
        } catch (Exception ex) {
            fail(account.get(), ex);
        }
    }

    public void deleteRemote(UUID userId, String eventId) {
        if (eventId == null || eventId.isBlank()) {
            return;
        }
        Optional<GoogleCalendarAccount> account = accounts.findById(userId);
        if (account.isEmpty()) {
            return;
        }
        try {
            client.delete(accessToken(account.get()), account.get().getCalendarId(), eventId);
            clearError(account.get());
        } catch (Exception ex) {
            fail(account.get(), ex);
        }
    }

    public GoogleCalendarDtos.EventList events(UUID userId, LocalDate from, LocalDate to) {
        GoogleCalendarAccount account = accounts.findById(userId).orElse(null);
        if (account == null) {
            return new GoogleCalendarDtos.EventList(List.of());
        }
        User user = users.findById(userId).orElseThrow();
        ZoneId zone = GoogleCalendarMapper.zone(user.getTimezone());
        ZonedDateTime start = from.atStartOfDay(zone);
        ZonedDateTime end = to.plusDays(1).atStartOfDay(zone);
        try {
            GoogleCalendarClient.Page page = client.listRange(
                    accessToken(account),
                    account.getCalendarId(),
                    start.toOffsetDateTime().toString(),
                    end.toOffsetDateTime().toString()
            );
            List<GoogleCalendarDtos.ExternalEvent> events = new ArrayList<>();
            for (JsonNode item : page.items()) {
                if (!"confirmed".equals(item.path("status").asText("confirmed"))) {
                    continue;
                }
                if (GoogleCalendarMapper.isAllDay(item) || GoogleCalendarMapper.isVeraxEvent(item)) {
                    continue;
                }
                GoogleCalendarMapper.Times times = GoogleCalendarMapper.fromEvent(item, user.getTimezone());
                if (times == null) {
                    continue;
                }
                events.add(new GoogleCalendarDtos.ExternalEvent(
                        item.path("id").asText(),
                        times.title().isBlank() ? "Busy" : times.title(),
                        times.date(),
                        times.weekday(),
                        times.startMin(),
                        times.endMin()
                ));
            }
            return new GoogleCalendarDtos.EventList(events);
        } catch (Exception ex) {
            fail(account, ex);
            return new GoogleCalendarDtos.EventList(List.of());
        }
    }

    private void syncLocked(GoogleCalendarAccount account) {
        try {
            pull(account);
            for (RoutineBlock block : blocks.findWithTasks(account.getUserId())) {
                upsert(account, block);
            }
            account.setLastSyncedAt(Instant.now());
            account.setLastError(null);
            accounts.save(account);
        } catch (Exception ex) {
            fail(account, ex);
            throw ApiException.badRequest("Google Calendar sync failed: " + rootMessage(ex));
        }
    }

    private void pull(GoogleCalendarAccount account) {
        User user = users.findById(account.getUserId()).orElseThrow();
        String token = accessToken(account);
        String syncToken = account.getSyncToken();
        boolean full = syncToken == null || syncToken.isBlank();
        String pageToken = null;
        String nextSync = null;
        try {
            do {
                GoogleCalendarClient.Page page = client.list(token, account.getCalendarId(), pageToken, full ? null : syncToken);
                for (JsonNode item : page.items()) {
                    applyRemote(account, user, item);
                }
                pageToken = page.nextPageToken();
                if (page.nextSyncToken() != null) {
                    nextSync = page.nextSyncToken();
                }
            } while (pageToken != null);
        } catch (GoogleHttpException ex) {
            if (ex.status == 410) {
                account.setSyncToken(null);
                accounts.save(account);
                pull(account);
                return;
            }
            throw ex;
        }
        if (nextSync != null) {
            account.setSyncToken(nextSync);
        }
    }

    private void applyRemote(GoogleCalendarAccount account, User user, JsonNode item) {
        String eventId = item.path("id").asText(null);
        if (eventId == null) {
            return;
        }
        boolean cancelled = "cancelled".equals(item.path("status").asText());
        Optional<RoutineBlock> existing = blocks.findByUserIdAndGoogleEventId(user.getId(), eventId);
        UUID tagged = parseUuid(GoogleCalendarMapper.veraxBlockId(item));
        if (tagged != null) {
            existing = existing.or(() -> blocks.findByIdAndUserId(tagged, user.getId()));
        }
        if (cancelled) {
            existing.ifPresent(blocks::delete);
            return;
        }
        if (existing.isPresent()) {
            RoutineBlock block = existing.get();
            String etag = item.path("etag").asText(null);
            if (etag != null && etag.equals(block.getGoogleEtag())) {
                return;
            }
            GoogleCalendarMapper.Times times = GoogleCalendarMapper.fromEvent(item, user.getTimezone());
            if (times == null) {
                return;
            }
            if (!times.title().isBlank()) {
                block.setTitle(times.title());
            }
            block.setStartMin(times.startMin());
            block.setEndMin(times.endMin());
            block.setWeekdays(Weekdays.formatOrAll(times.weekdays()));
            block.setSortOrder(times.startMin());
            stamp(block, item);
            return;
        }
        if (!GoogleCalendarMapper.isWeeklySeries(item) || GoogleCalendarMapper.isAllDay(item)) {
            return;
        }
        if (item.path("attendees").isArray() && item.path("attendees").size() > 0) {
            return;
        }
        GoogleCalendarMapper.Times times = GoogleCalendarMapper.fromEvent(item, user.getTimezone());
        if (times == null) {
            return;
        }
        RoutineBlock created = new RoutineBlock();
        created.setUser(user);
        created.setTitle(times.title().isBlank() ? "Google event" : times.title());
        created.setStartMin(times.startMin());
        created.setEndMin(times.endMin());
        created.setWeekdays(Weekdays.formatOrAll(times.weekdays()));
        created.setColor("#737373");
        created.setSortOrder(times.startMin());
        created.setOrigin("GOOGLE");
        stamp(created, item);
        blocks.save(created);
        try {
            client.patch(accessToken(account), account.getCalendarId(), eventId, GoogleCalendarMapper.toEvent(created, user.getTimezone()));
            stamp(created, item);
        } catch (Exception ex) {
            log.info("Could not tag imported Google event {}: {}", eventId, ex.getMessage());
        }
    }

    private void upsert(GoogleCalendarAccount account, RoutineBlock block) {
        User user = users.findById(account.getUserId()).orElseThrow();
        Map<String, Object> body = GoogleCalendarMapper.toEvent(block, user.getTimezone());
        String token = accessToken(account);
        JsonNode saved;
        if (block.getGoogleEventId() == null || block.getGoogleEventId().isBlank()) {
            saved = client.insert(token, account.getCalendarId(), body);
        } else {
            try {
                saved = client.patch(token, account.getCalendarId(), block.getGoogleEventId(), body);
            } catch (GoogleHttpException ex) {
                if (ex.status != 404 && ex.status != 410) {
                    throw ex;
                }
                saved = client.insert(token, account.getCalendarId(), body);
            }
        }
        stamp(block, saved);
        blocks.save(block);
    }

    private String accessToken(GoogleCalendarAccount account) {
        Instant expiry = account.getAccessTokenExpiresAt();
        if (account.getAccessTokenEnc() != null && expiry != null && expiry.isAfter(Instant.now().plusSeconds(60))) {
            return secrets.open(account.getAccessTokenEnc());
        }
        String refresh = secrets.open(account.getRefreshTokenEnc());
        GoogleCalendarClient.TokenPair tokens = client.refresh(refresh);
        if (tokens.refreshToken() != null && !tokens.refreshToken().isBlank()) {
            account.setRefreshTokenEnc(secrets.seal(tokens.refreshToken()));
        }
        storeAccess(account, tokens);
        accounts.save(account);
        return tokens.accessToken();
    }

    private void storeAccess(GoogleCalendarAccount account, GoogleCalendarClient.TokenPair tokens) {
        account.setAccessTokenEnc(secrets.seal(tokens.accessToken()));
        account.setAccessTokenExpiresAt(Instant.now().plusSeconds(Math.max(60, tokens.expiresIn())));
    }

    private static void stamp(RoutineBlock block, JsonNode event) {
        if (event.hasNonNull("id")) {
            block.setGoogleEventId(event.get("id").asText());
        }
        if (event.hasNonNull("etag")) {
            block.setGoogleEtag(event.get("etag").asText());
        }
        if (event.hasNonNull("updated")) {
            try {
                block.setGoogleUpdatedAt(Instant.parse(event.get("updated").asText()));
            } catch (Exception ignored) {
                block.setGoogleUpdatedAt(Instant.now());
            }
        } else {
            block.setGoogleUpdatedAt(Instant.now());
        }
    }

    private void fail(GoogleCalendarAccount account, Exception ex) {
        account.setLastError(rootMessage(ex));
        accounts.save(account);
        log.info("Google Calendar failed for {}: {}", account.getUserId(), ex.getMessage());
    }

    private void clearError(GoogleCalendarAccount account) {
        if (account.getLastError() != null) {
            account.setLastError(null);
            accounts.save(account);
        }
    }

    private void requireConfigured() {
        if (!properties.getOauth().googleCalendarEnabled()) {
            throw ApiException.badRequest("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, enable the Calendar API, and add http://localhost:5173/settings as an authorized redirect URI.");
        }
    }

    private static String requireRedirect(String redirectUri) {
        if (redirectUri == null || redirectUri.isBlank()) {
            throw ApiException.badRequest("Redirect URI is required");
        }
        URI uri;
        try {
            uri = URI.create(redirectUri);
        } catch (Exception ex) {
            throw ApiException.badRequest("Redirect URI is invalid");
        }
        if (uri.getScheme() == null || (!uri.getScheme().equals("http") && !uri.getScheme().equals("https"))) {
            throw ApiException.badRequest("Redirect URI must be http(s)");
        }
        if (!LOCAL_HOSTS.contains(uri.getHost()) && !"https".equals(uri.getScheme())) {
            throw ApiException.badRequest("Redirect URI host is not allowed");
        }
        if (!"/settings".equals(uri.getPath())) {
            throw ApiException.badRequest("Redirect URI must end with /settings");
        }
        return redirectUri;
    }

    private static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (Exception ex) {
            return null;
        }
    }

    private static String rootMessage(Exception ex) {
        Throwable cursor = ex;
        while (cursor.getCause() != null && cursor.getCause() != cursor) {
            cursor = cursor.getCause();
        }
        String message = cursor.getMessage();
        return message == null || message.isBlank() ? ex.getClass().getSimpleName() : message;
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
