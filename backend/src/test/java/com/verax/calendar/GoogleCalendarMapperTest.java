package com.verax.calendar;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.verax.routine.RoutineBlock;
import org.junit.jupiter.api.Test;

import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GoogleCalendarMapperTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void weekdayBlockBecomesWeeklyRrule() {
        RoutineBlock block = new RoutineBlock();
        block.setTitle("Workout");
        block.setStartMin(6 * 60 + 20);
        block.setEndMin(7 * 60 + 30);
        block.setWeekdays("1,2,3,4,5");
        Map<String, Object> event = GoogleCalendarMapper.toEvent(block, "Asia/Kolkata");
        @SuppressWarnings("unchecked")
        List<String> recurrence = (List<String>) event.get("recurrence");
        assertEquals("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", recurrence.getFirst());
        @SuppressWarnings("unchecked")
        Map<String, String> start = (Map<String, String>) event.get("start");
        assertTrue(start.get("dateTime").contains("T06:20:00"));
        assertEquals("Asia/Kolkata", start.get("timeZone"));
    }

    @Test
    void overnightSleepKeepsDuration() {
        assertEquals(150, GoogleCalendarMapper.durationMin(21 * 60 + 30, 24 * 60));
        assertEquals(150, GoogleCalendarMapper.durationMin(21 * 60 + 30, 0));
    }

    @Test
    void rruleRoundTrip() {
        assertEquals(List.of(1, 3, 5), GoogleCalendarMapper.parseByDay("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"));
        assertEquals("TH", GoogleCalendarMapper.byDay(4));
        assertEquals(7, GoogleCalendarMapper.fromByDay("SU"));
    }

    @Test
    void googleEventParsesIntoBlockTimes() throws Exception {
        ObjectNode event = mapper.createObjectNode();
        event.put("summary", "Read");
        event.putObject("start").put("dateTime", "2026-08-31T09:10:00+05:30").put("timeZone", "Asia/Kolkata");
        event.putObject("end").put("dateTime", "2026-08-31T09:40:00+05:30").put("timeZone", "Asia/Kolkata");
        ArrayNode recurrence = event.putArray("recurrence");
        recurrence.add("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
        GoogleCalendarMapper.Times times = GoogleCalendarMapper.fromEvent(event, "Asia/Kolkata");
        assertEquals("Read", times.title());
        assertEquals(9 * 60 + 10, times.startMin());
        assertEquals(9 * 60 + 40, times.endMin());
        assertEquals(List.of(1, 2, 3, 4, 5), times.weekdays());
        assertEquals(1, times.weekday());
    }

    @Test
    void tagsVeraxEventsAndSkipsAllDay() {
        ObjectNode tagged = mapper.createObjectNode();
        tagged.putObject("extendedProperties").putObject("private").put("verax", "1").put("veraxBlockId", "abc");
        assertTrue(GoogleCalendarMapper.isVeraxEvent(tagged));
        ObjectNode allDay = mapper.createObjectNode();
        allDay.putObject("start").put("date", "2026-08-31");
        assertTrue(GoogleCalendarMapper.isAllDay(allDay));
        ObjectNode timed = mapper.createObjectNode();
        timed.putObject("start").put("dateTime", "2026-08-31T09:00:00+05:30");
        assertFalse(GoogleCalendarMapper.isAllDay(timed));
    }

    @Test
    void firstStartLandsOnRequestedWeekday() {
        var start = GoogleCalendarMapper.firstStart(1, 9 * 60, ZoneId.of("Asia/Kolkata"));
        assertEquals(1, start.getDayOfWeek().getValue());
        assertEquals(9, start.getHour());
        assertEquals(0, start.getMinute());
    }
}
