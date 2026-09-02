package com.verax.common;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public final class Weekdays {

    public static final String ALL = "1,2,3,4,5,6,7";
    public static final String WEEKDAYS = "1,2,3,4,5";
    public static final String WEEKEND = "6,7";

    private Weekdays() {
    }

    public static List<Integer> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        List<Integer> days = new ArrayList<>();
        for (String part : raw.split(",")) {
            String trimmed = part.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            try {
                int day = Integer.parseInt(trimmed);
                if (day >= 1 && day <= 7 && !days.contains(day)) {
                    days.add(day);
                }
            } catch (NumberFormatException ignored) {
                // skip junk
            }
        }
        return days;
    }

    public static String format(List<Integer> days) {
        if (days == null || days.isEmpty()) {
            return "";
        }
        return days.stream()
                .filter(day -> day >= 1 && day <= 7)
                .distinct()
                .sorted()
                .map(String::valueOf)
                .collect(Collectors.joining(","));
    }

    public static String formatOrAll(List<Integer> days) {
        String value = format(days);
        return value.isBlank() ? ALL : value;
    }

    public static boolean blockVisible(String blockDays, int weekday) {
        List<Integer> days = parse(blockDays);
        return days.isEmpty() || days.contains(weekday);
    }

    public static boolean taskVisible(String blockDays, String taskDays, int weekday) {
        if (!blockVisible(blockDays, weekday)) {
            return false;
        }
        List<Integer> scoped = parse(taskDays);
        return scoped.isEmpty() || scoped.contains(weekday);
    }
}
