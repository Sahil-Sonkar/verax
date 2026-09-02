package com.verax.train;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

final class ExerciseCatalog {

    private static final int ENGLISH = 2;
    private static final int MAX_HITS = 20;

    record IndexedHit(TrainDtos.ExerciseHit hit, String haystack) {
    }

    private ExerciseCatalog() {
    }

    static String mappedMuscle(String muscle, String type) {
        if (type != null && type.toLowerCase(Locale.ROOT).contains("cardio")) {
            return "CARDIO";
        }
        String key = muscle == null ? "" : muscle.trim().toLowerCase(Locale.ROOT).replace(' ', '_');
        return switch (key) {
            case "chest", "pectorals", "pectoralis", "pectoralis_major", "serratus_anterior" -> "CHEST";
            case "lats", "latissimus_dorsi", "lower_back", "middle_back", "upper_back", "traps",
                    "trapezius", "back" -> "BACK";
            case "shoulders", "delts", "deltoids", "neck" -> "SHOULDERS";
            case "biceps", "brachialis", "arms" -> "BICEPS";
            case "triceps" -> "TRICEPS";
            case "quadriceps", "quads", "legs" -> "QUADS";
            case "hamstrings" -> "HAMS";
            case "glutes", "gluteus" -> "GLUTES";
            case "calves", "soleus" -> "CALVES";
            case "abdominals", "abs", "core", "obliques", "obliquus_externus_abdominis" -> "CORE";
            default -> "OTHER";
        };
    }

    static String track(String type) {
        return type != null && type.toLowerCase(Locale.ROOT).contains("cardio") ? "TIME" : "REPS";
    }

    static String ninjaMuscle(String query) {
        String key = query.trim().toLowerCase(Locale.ROOT).replace(' ', '_');
        return switch (key) {
            case "chest", "biceps", "triceps", "calves", "glutes", "shoulders", "forearms",
                    "abductors", "adductors", "neck" -> key;
            case "quads", "quadriceps" -> "quadriceps";
            case "hams", "hamstrings" -> "hamstrings";
            case "back", "lats" -> "lats";
            case "core", "abs", "abdominals" -> "abdominals";
            default -> null;
        };
    }

    @SuppressWarnings("unchecked")
    static TrainDtos.ExerciseHit fromNinja(Map<String, Object> row) {
        String name = str(row.get("name"));
        if (name.isBlank()) {
            return null;
        }
        String type = str(row.get("type"));
        String muscle = str(row.get("muscle"));
        String difficulty = str(row.get("difficulty"));
        String instructions = str(row.get("instructions"));
        String safety = str(first(row.get("safety_info"), row.get("safetyInfo")));
        return new TrainDtos.ExerciseHit(
                name,
                type,
                muscle,
                mappedMuscle(muscle, type),
                track(type),
                difficulty,
                instructions,
                safety,
                equipment(row.get("equipments"), row.get("equipment"))
        );
    }

    @SuppressWarnings("unchecked")
    static IndexedHit fromWger(Map<String, Object> row) {
        Map<String, Object> translation = englishTranslation(row.get("translations"));
        if (translation == null) {
            return null;
        }
        String name = str(translation.get("name"));
        if (name.isBlank()) {
            return null;
        }
        String category = nestedName(row.get("category"));
        String type = category.equalsIgnoreCase("Cardio") ? "cardio" : "strength";
        String muscle = firstMuscle(row.get("muscles"));
        if (muscle.isBlank()) {
            muscle = category;
        }
        TrainDtos.ExerciseHit hit = new TrainDtos.ExerciseHit(
                name,
                type,
                muscle.toLowerCase(Locale.ROOT),
                mappedMuscle(muscle, type),
                track(type),
                "",
                htmlToText(str(translation.get("description"))),
                notesText(translation.get("notes")),
                namedList(row.get("equipment"))
        );
        List<String> extra = namedList(translation.get("aliases"), "alias");
        extra.add(category);
        return index(hit, String.join(" ", extra));
    }

    static IndexedHit index(TrainDtos.ExerciseHit hit, String extra) {
        if (hit == null) {
            return null;
        }
        String haystack = (hit.name() + " " + hit.muscle() + " " + hit.type() + " "
                + String.join(" ", hit.equipment()) + " " + str(extra)).toLowerCase(Locale.ROOT);
        return new IndexedHit(hit, haystack);
    }

    static List<TrainDtos.ExerciseHit> match(List<IndexedHit> catalog, String query) {
        String q = query.trim().toLowerCase(Locale.ROOT);
        if (q.isBlank() || catalog == null || catalog.isEmpty()) {
            return List.of();
        }
        record Ranked(int rank, int index, TrainDtos.ExerciseHit hit) {
        }
        List<Ranked> ranked = new ArrayList<>();
        for (int i = 0; i < catalog.size(); i++) {
            IndexedHit item = catalog.get(i);
            String name = item.hit().name().toLowerCase(Locale.ROOT);
            int rank;
            if (name.equals(q) || compact(name).equals(compact(q))) {
                rank = 0;
            } else if (name.startsWith(q)) {
                rank = 1;
            } else if (name.contains(q)) {
                rank = 2;
            } else if (item.haystack().contains(q)) {
                rank = 3;
            } else if (tokensMatch(item.haystack(), q)) {
                rank = 4;
            } else {
                continue;
            }
            ranked.add(new Ranked(rank, i, item.hit()));
        }
        ranked.sort(Comparator.comparingInt(Ranked::rank).thenComparingInt(Ranked::index));
        return ranked.stream().limit(MAX_HITS).map(Ranked::hit).toList();
    }

    static List<TrainDtos.ExerciseHit> merge(List<TrainDtos.ExerciseHit> preferred, List<TrainDtos.ExerciseHit> extra) {
        Map<String, TrainDtos.ExerciseHit> out = new java.util.LinkedHashMap<>();
        for (TrainDtos.ExerciseHit hit : preferred == null ? List.<TrainDtos.ExerciseHit>of() : preferred) {
            out.putIfAbsent(compact(hit.name()), hit);
        }
        for (TrainDtos.ExerciseHit hit : extra == null ? List.<TrainDtos.ExerciseHit>of() : extra) {
            out.putIfAbsent(compact(hit.name()), hit);
        }
        return out.values().stream().limit(MAX_HITS).toList();
    }

    static String compact(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    private static boolean tokensMatch(String haystack, String query) {
        List<String> parts = tokens(query);
        if (parts.isEmpty()) {
            return false;
        }
        for (String token : parts) {
            if (!haystack.contains(token)) {
                return false;
            }
        }
        return true;
    }

    private static List<String> tokens(String query) {
        List<String> out = new ArrayList<>();
        for (String part : query.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")) {
            if (part.length() >= 2 && !STOP.contains(part)) {
                out.add(part);
            }
        }
        return out;
    }

    private static final java.util.Set<String> STOP = java.util.Set.of(
            "on", "the", "a", "an", "with", "of", "and", "to", "for"
    );

    static String htmlToText(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }
        String text = html
                .replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("(?i)</p>", "\n")
                .replaceAll("(?i)</li>", "\n")
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replaceAll("[ \\t]+", " ")
                .replaceAll(" *\\n *", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
        return text;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> englishTranslation(Object raw) {
        if (!(raw instanceof List<?> list) || list.isEmpty()) {
            return null;
        }
        Map<String, Object> fallback = null;
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            Map<String, Object> translation = (Map<String, Object>) map;
            if (str(translation.get("name")).isBlank()) {
                continue;
            }
            if (isEnglish(translation.get("language"))) {
                return translation;
            }
            if (fallback == null) {
                fallback = translation;
            }
        }
        return fallback;
    }

    private static boolean isEnglish(Object language) {
        if (language instanceof Number number) {
            return number.intValue() == ENGLISH;
        }
        if (language instanceof Map<?, ?> map) {
            Object id = map.get("id");
            if (id instanceof Number number && number.intValue() == ENGLISH) {
                return true;
            }
            String shortName = str(first(map.get("short_name"), map.get("shortName")));
            return "en".equalsIgnoreCase(shortName);
        }
        return "2".equals(str(language)) || "en".equalsIgnoreCase(str(language));
    }

    private static String firstMuscle(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return "";
        }
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                String en = str(map.get("name_en"));
                if (!en.isBlank()) {
                    return en;
                }
                String name = str(map.get("name"));
                if (!name.isBlank()) {
                    return name;
                }
            }
        }
        return "";
    }

    private static String nestedName(Object raw) {
        if (raw instanceof Map<?, ?> map) {
            return str(map.get("name"));
        }
        return str(raw);
    }

    private static String notesText(Object raw) {
        List<String> notes = namedList(raw, "comment");
        return String.join("\n", notes);
    }

    private static List<String> namedList(Object raw) {
        return namedList(raw, "name");
    }

    private static List<String> namedList(Object raw, String key) {
        List<String> out = new ArrayList<>();
        if (!(raw instanceof List<?> list)) {
            return out;
        }
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                String name = str(first(map.get(key), map.get("name")));
                if (!name.isBlank()) {
                    out.add(name);
                }
            } else if (item != null && !item.toString().isBlank()) {
                out.add(item.toString().trim());
            }
        }
        return out;
    }

    private static List<String> equipment(Object equipments, Object equipment) {
        List<String> out = new ArrayList<>();
        if (equipments instanceof List<?> list) {
            for (Object item : list) {
                if (item != null && !item.toString().isBlank() && !"...".equals(item.toString())) {
                    out.add(item.toString());
                }
            }
        }
        if (out.isEmpty() && equipment instanceof String text && !text.isBlank()) {
            for (String part : text.split(",")) {
                if (!part.isBlank()) {
                    out.add(part.trim());
                }
            }
        }
        return out;
    }

    private static Object first(Object left, Object right) {
        return left != null ? left : right;
    }

    private static String str(Object value) {
        return value == null ? "" : value.toString().trim();
    }
}
