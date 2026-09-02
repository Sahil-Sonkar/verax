package com.verax.calendar;

import com.fasterxml.jackson.databind.JsonNode;
import com.verax.common.Weekdays;
import com.verax.routine.RoutineBlock;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class GoogleCalendarMapper {

    static final String PROP_FLAG = "verax";
    static final String PROP_BLOCK = "veraxBlockId";
    private static final int DAY = 24 * 60;
    private static final String[] BYDAY = {"", "MO", "TU", "WE", "TH", "FR", "SA", "SU"};

    private GoogleCalendarMapper() {
    }

    public static Map<String, Object> toEvent(RoutineBlock block, String timeZone) {
        ZoneId zone = zone(timeZone);
        List<Integer> days = Weekdays.parse(block.getWeekdays());
        if (days.isEmpty()) {
            days = List.of(1, 2, 3, 4, 5, 6, 7);
        }
        ZonedDateTime start = firstStart(days.getFirst(), block.getStartMin(), zone);
        ZonedDateTime end = start.plusMinutes(durationMin(block.getStartMin(), block.getEndMin()));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("summary", block.getTitle());
        body.put("description", "Verax routine");
        body.put("start", dateTime(start, zone));
        body.put("end", dateTime(end, zone));
        body.put("recurrence", List.of("RRULE:FREQ=WEEKLY;BYDAY=" + String.join(",", days.stream().map(GoogleCalendarMapper::byDay).toList())));
        Map<String, String> priv = new LinkedHashMap<>();
        priv.put(PROP_FLAG, "1");
        if (block.getId() != null) {
            priv.put(PROP_BLOCK, block.getId().toString());
        }
        body.put("extendedProperties", Map.of("private", priv));
        return body;
    }

    public static Times fromEvent(JsonNode event, String timeZone) {
        ZoneId zone = zone(timeZone);
        JsonNode startNode = event.path("start");
        JsonNode endNode = event.path("end");
        ZonedDateTime start = parseDateTime(startNode, zone);
        ZonedDateTime end = parseDateTime(endNode, zone);
        if (start == null || end == null) {
            return null;
        }
        int startMin = start.getHour() * 60 + start.getMinute();
        long duration = Math.max(1, Duration.between(start, end).toMinutes());
        int endMin = startMin + (int) duration;
        if (endMin > DAY) {
            endMin = endMin % DAY;
            if (endMin == 0) {
                endMin = DAY;
            }
        }
        List<Integer> days = weekdaysFromRecurrence(event.path("recurrence"), start.getDayOfWeek().getValue());
        return new Times(start.toLocalDate(), start.getDayOfWeek().getValue(), startMin, endMin, days, event.path("summary").asText(""));
    }

    public static boolean isAllDay(JsonNode event) {
        return event.path("start").hasNonNull("date") && !event.path("start").hasNonNull("dateTime");
    }

    public static boolean isVeraxEvent(JsonNode event) {
        return "1".equals(event.path("extendedProperties").path("private").path(PROP_FLAG).asText());
    }

    public static String veraxBlockId(JsonNode event) {
        String id = event.path("extendedProperties").path("private").path(PROP_BLOCK).asText();
        return id == null || id.isBlank() ? null : id;
    }

    public static boolean isWeeklySeries(JsonNode event) {
        JsonNode recurrence = event.path("recurrence");
        if (!recurrence.isArray() || recurrence.isEmpty()) {
            return false;
        }
        for (JsonNode row : recurrence) {
            String value = row.asText("").toUpperCase(Locale.ROOT);
            if (value.contains("FREQ=WEEKLY")) {
                return !value.contains("COUNT=") && !value.contains("UNTIL=");
            }
        }
        return false;
    }

    public static int durationMin(int startMin, int endMin) {
        int stop = endMin == 0 ? DAY : endMin;
        if (stop > startMin) {
            return stop - startMin;
        }
        return DAY - startMin + stop;
    }

    static List<Integer> weekdaysFromRecurrence(JsonNode recurrence, int fallback) {
        if (recurrence.isArray()) {
            for (JsonNode row : recurrence) {
                List<Integer> parsed = parseByDay(row.asText(""));
                if (!parsed.isEmpty()) {
                    return parsed;
                }
            }
        }
        return List.of(fallback);
    }

    static List<Integer> parseByDay(String rrule) {
        int index = rrule.toUpperCase(Locale.ROOT).indexOf("BYDAY=");
        if (index < 0) {
            return List.of();
        }
        String rest = rrule.substring(index + 6);
        int end = rest.indexOf(';');
        String csv = end < 0 ? rest : rest.substring(0, end);
        List<Integer> days = new ArrayList<>();
        for (String token : csv.split(",")) {
            int day = fromByDay(token.trim());
            if (day > 0 && !days.contains(day)) {
                days.add(day);
            }
        }
        days.sort(Integer::compareTo);
        return days;
    }

    static ZonedDateTime firstStart(int weekday, int startMin, ZoneId zone) {
        LocalDate date = LocalDate.now(zone);
        for (int i = 0; i < 7; i++) {
            LocalDate candidate = date.minusDays(i);
            if (candidate.getDayOfWeek().getValue() == weekday) {
                date = candidate;
                break;
            }
        }
        int hours = Math.floorDiv(startMin, 60);
        int minutes = Math.floorMod(startMin, 60);
        if (hours >= 24) {
            hours = 23;
            minutes = 59;
        }
        return date.atTime(hours, minutes).atZone(zone);
    }

    static ZonedDateTime parseDateTime(JsonNode node, ZoneId fallback) {
        if (node == null || node.isMissingNode()) {
            return null;
        }
        String dt = text(node, "dateTime");
        if (dt == null || dt.isBlank()) {
            return null;
        }
        ZoneId zone = text(node, "timeZone") == null ? fallback : zone(text(node, "timeZone"));
        if (dt.length() <= 19) {
            return LocalDateTime.parse(dt, DateTimeFormatter.ISO_LOCAL_DATE_TIME).atZone(zone);
        }
        return OffsetDateTime.parse(dt).atZoneSameInstant(zone);
    }

    static String byDay(int weekday) {
        if (weekday < 1 || weekday > 7) {
            return "MO";
        }
        return BYDAY[weekday];
    }

    static int fromByDay(String token) {
        String day = token.replaceAll("[^A-Z]", "");
        for (int i = 1; i < BYDAY.length; i++) {
            if (BYDAY[i].equals(day)) {
                return i;
            }
        }
        return 0;
    }

    static ZoneId zone(String timeZone) {
        try {
            return ZoneId.of(timeZone == null || timeZone.isBlank() ? "UTC" : timeZone);
        } catch (Exception ex) {
            return ZoneId.of("UTC");
        }
    }

    private static Map<String, String> dateTime(ZonedDateTime value, ZoneId zone) {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("dateTime", value.withZoneSameInstant(zone).toLocalDateTime().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        map.put("timeZone", zone.getId());
        return map;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    public record Times(LocalDate date, int weekday, int startMin, int endMin, List<Integer> weekdays, String title) {
    }
}
