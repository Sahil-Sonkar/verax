package com.verax.analytics;

import com.verax.category.Category;
import com.verax.completion.HabitCompletion;
import com.verax.completion.HabitCompletionRepository;
import com.verax.config.VeraxProperties;
import com.verax.consistency.ConsistencyCalculator;
import com.verax.consistency.ConsistencyCalculator.DailyScore;
import com.verax.habit.Habit;
import com.verax.habit.HabitRepository;
import com.verax.habit.HabitScheduler;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class AnalyticsService {

    private final UserRepository users;
    private final HabitRepository habits;
    private final HabitCompletionRepository completions;
    private final VeraxProperties properties;

    public AnalyticsService(
            UserRepository users,
            HabitRepository habits,
            HabitCompletionRepository completions,
            VeraxProperties properties
    ) {
        this.users = users;
        this.habits = habits;
        this.completions = completions;
        this.properties = properties;
    }

    public LocalDate today(UUID userId) {
        User user = users.findById(userId).orElseThrow();
        return LocalDate.now(ZoneId.of(user.getTimezone()));
    }

    @Transactional(readOnly = true)
    public AnalyticsDtos.Dashboard dashboard(UUID userId) {
        LocalDate today = today(userId);
        LocalDate heatmapStart = today.minusMonths(11).withDayOfMonth(1);
        List<DailyScore> year = scores(userId, heatmapStart, today);
        YearMonth thisMonth = YearMonth.from(today);
        YearMonth lastMonth = thisMonth.minusMonths(1);
        Double monthScore = average(filter(year, thisMonth.atDay(1), today));
        Double prevMonthScore = average(filter(year, lastMonth.atDay(1), lastMonth.atEndOfMonth()));
        Double delta = (monthScore == null || prevMonthScore == null) ? null : round(monthScore - prevMonthScore);
        Double overall = average(filter(year, today.minusDays(29), today));
        if (overall == null) {
            overall = monthScore == null ? 0 : monthScore;
        }
        LocalDate weekStart = HabitScheduler.weekStart(today);
        return new AnalyticsDtos.Dashboard(
                overall,
                pct(overall),
                delta,
                lastMonth.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH),
                ConsistencyCalculator.currentStreak(year, today, properties.getStreakThreshold()),
                ConsistencyCalculator.bestStreak(year, properties.getStreakThreshold()),
                average(filter(year, weekStart, today)),
                monthScore,
                categoryScores(userId, today.minusDays(29), today),
                heatmap(year)
        );
    }

    @Transactional(readOnly = true)
    public List<AnalyticsDtos.HeatCell> heatmapRange(UUID userId, LocalDate from, LocalDate to) {
        return heatmap(scores(userId, from, to));
    }

    @Transactional(readOnly = true)
    public AnalyticsDtos.Trends trends(UUID userId, String granularity, LocalDate from, LocalDate to) {
        List<DailyScore> days = scores(userId, from, to);
        List<AnalyticsDtos.Point> points = new ArrayList<>();
        switch (granularity == null ? "daily" : granularity.toLowerCase(Locale.ROOT)) {
            case "weekly" -> {
                LocalDate cursor = HabitScheduler.weekStart(from);
                while (!cursor.isAfter(to)) {
                    LocalDate end = cursor.plusDays(6);
                    Double avg = average(filter(days, cursor, end.isAfter(to) ? to : end));
                    points.add(new AnalyticsDtos.Point("Week of " + cursor, cursor, avg, pct(avg)));
                    cursor = cursor.plusWeeks(1);
                }
            }
            case "monthly" -> {
                YearMonth cursor = YearMonth.from(from);
                YearMonth last = YearMonth.from(to);
                while (!cursor.isAfter(last)) {
                    Double avg = average(filter(days, cursor.atDay(1), cursor.atEndOfMonth()));
                    points.add(new AnalyticsDtos.Point(
                            cursor.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + cursor.getYear(),
                            cursor.atDay(1),
                            avg,
                            pct(avg)
                    ));
                    cursor = cursor.plusMonths(1);
                }
            }
            case "yearly" -> {
                int year = from.getYear();
                while (year <= to.getYear()) {
                    LocalDate start = LocalDate.of(year, 1, 1);
                    LocalDate end = LocalDate.of(year, 12, 31);
                    Double avg = average(filter(days, start, end));
                    points.add(new AnalyticsDtos.Point(String.valueOf(year), start, avg, pct(avg)));
                    year++;
                }
            }
            default -> {
                for (DailyScore day : days) {
                    points.add(new AnalyticsDtos.Point(day.date().toString(), day.date(), day.score(), day.percent()));
                }
            }
        }
        return new AnalyticsDtos.Trends(granularity, points);
    }

    @Transactional(readOnly = true)
    public List<AnalyticsDtos.NamedScore> categories(UUID userId, LocalDate from, LocalDate to) {
        return categoryScores(userId, from, to);
    }

    @Transactional(readOnly = true)
    public List<AnalyticsDtos.NamedScore> habits(UUID userId, LocalDate from, LocalDate to) {
        LocalDate today = today(userId);
        List<Habit> relevant = habits.findRelevant(userId, from.minusDays(7), to);
        List<HabitCompletion> all = completions.findInRange(userId, from.minusDays(7), to);
        Map<UUID, Double> earned = new HashMap<>();
        Map<UUID, Double> possible = new HashMap<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            DailyScore score = ConsistencyCalculator.scoreDay(date, today, relevant, all);
            for (var contribution : score.contributions()) {
                if (contribution.possibleWeight() <= 0) {
                    continue;
                }
                UUID id = contribution.habit().getId();
                earned.merge(id, contribution.earnedWeight(), Double::sum);
                possible.merge(id, contribution.possibleWeight(), Double::sum);
            }
        }
        List<AnalyticsDtos.NamedScore> result = new ArrayList<>();
        for (Habit habit : relevant) {
            Double poss = possible.get(habit.getId());
            if (poss == null || poss == 0) {
                continue;
            }
            double score = earned.getOrDefault(habit.getId(), 0.0) / poss;
            result.add(new AnalyticsDtos.NamedScore(habit.getId(), habit.getName(), color(habit.getCategory()), round(score), pct(score)));
        }
        result.sort(Comparator.comparingDouble(AnalyticsDtos.NamedScore::score).reversed());
        return result;
    }

    @Transactional(readOnly = true)
    public AnalyticsDtos.Compare compare(UUID userId, String period) {
        LocalDate today = today(userId);
        LocalDate currentStart;
        LocalDate previousStart;
        LocalDate previousEnd;
        String currentLabel;
        String previousLabel;
        switch (period == null ? "week" : period.toLowerCase(Locale.ROOT)) {
            case "month" -> {
                YearMonth month = YearMonth.from(today);
                currentStart = month.atDay(1);
                previousStart = month.minusMonths(1).atDay(1);
                previousEnd = month.minusMonths(1).atEndOfMonth();
                currentLabel = month.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
                previousLabel = month.minusMonths(1).getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            }
            case "year" -> {
                currentStart = LocalDate.of(today.getYear(), 1, 1);
                previousStart = LocalDate.of(today.getYear() - 1, 1, 1);
                previousEnd = LocalDate.of(today.getYear() - 1, 12, 31);
                currentLabel = String.valueOf(today.getYear());
                previousLabel = String.valueOf(today.getYear() - 1);
            }
            default -> {
                currentStart = HabitScheduler.weekStart(today);
                previousStart = currentStart.minusWeeks(1);
                previousEnd = currentStart.minusDays(1);
                currentLabel = "This week";
                previousLabel = "Last week";
                period = "week";
            }
        }
        Double current = averageScore(userId, currentStart, today);
        Double previous = averageScore(userId, previousStart, previousEnd);
        Double delta = (current == null || previous == null) ? null : round(current - previous);
        return new AnalyticsDtos.Compare(period, current, previous, delta, currentLabel, previousLabel);
    }

    @Transactional(readOnly = true)
    public AnalyticsDtos.WeeklyReview weeklyReview(UUID userId, LocalDate weekStartParam) {
        LocalDate today = today(userId);
        LocalDate weekStart;
        if (weekStartParam != null) {
            weekStart = HabitScheduler.weekStart(weekStartParam);
        } else if (today.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
            weekStart = HabitScheduler.weekStart(today);
        } else {
            weekStart = HabitScheduler.weekStart(today).minusWeeks(1);
        }
        LocalDate weekEnd = weekStart.plusDays(6);
        LocalDate end = weekEnd.isAfter(today) ? today : weekEnd;
        List<DailyScore> days = scores(userId, weekStart.minusWeeks(1), end);
        Double thisWeek = average(filter(days, weekStart, end));
        Double lastWeek = average(filter(days, weekStart.minusWeeks(1), weekStart.minusDays(1)));
        Double delta = (thisWeek == null || lastWeek == null) ? null : round(thisWeek - lastWeek);
        List<AnalyticsDtos.NamedScore> cats = categoryScores(userId, weekStart, end);
        AnalyticsDtos.NamedScore best = cats.stream().max(Comparator.comparingDouble(AnalyticsDtos.NamedScore::score)).orElse(null);
        AnalyticsDtos.NamedScore worst = cats.stream().min(Comparator.comparingDouble(AnalyticsDtos.NamedScore::score)).orElse(null);
        List<DailyScore> weekDays = filter(days, weekStart, end);
        int completed = weekDays.stream().mapToInt(DailyScore::completed).sum();
        int scheduled = weekDays.stream().mapToInt(d -> d.scheduled() - d.skipped()).sum();
        int streak = ConsistencyCalculator.currentStreak(scores(userId, today.minusDays(120), today), today, properties.getStreakThreshold());
        List<AnalyticsDtos.NamedScore> habitScores = habits(userId, weekStart, end);
        List<String> wentWell = habitScores.stream().filter(h -> h.score() >= 0.8).limit(3)
                .map(h -> h.name() + " stayed consistent").toList();
        List<String> needsWork = habitScores.stream().filter(h -> h.score() < 0.65).limit(3)
                .map(h -> h.name() + " needs a lighter, repeatable version").toList();
        if (wentWell.isEmpty()) {
            wentWell = List.of("You kept showing up this week");
        }
        if (needsWork.isEmpty()) {
            needsWork = List.of("Protect the habits that already work");
        }
        return new AnalyticsDtos.WeeklyReview(
                weekStart,
                weekEnd,
                thisWeek,
                delta,
                best,
                worst,
                completed,
                scheduled,
                streak,
                wentWell,
                needsWork
        );
    }

    public Double averageScore(UUID userId, LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            return null;
        }
        return average(scores(userId, from, to));
    }

    public List<DailyScore> scores(UUID userId, LocalDate from, LocalDate to) {
        LocalDate today = today(userId);
        LocalDate loadFrom = from.minusDays(7);
        List<Habit> relevant = habits.findRelevant(userId, loadFrom, to);
        List<HabitCompletion> all = completions.findInRange(userId, loadFrom, to);
        List<DailyScore> result = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            result.add(ConsistencyCalculator.scoreDay(date, today, relevant, all));
        }
        return result;
    }

    private List<AnalyticsDtos.NamedScore> categoryScores(UUID userId, LocalDate from, LocalDate to) {
        LocalDate today = today(userId);
        List<Habit> relevant = habits.findRelevant(userId, from.minusDays(7), to);
        List<HabitCompletion> all = completions.findInRange(userId, from.minusDays(7), to);
        Map<String, Double> earned = new HashMap<>();
        Map<String, Double> possible = new HashMap<>();
        Map<String, UUID> ids = new HashMap<>();
        Map<String, String> colors = new HashMap<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            DailyScore score = ConsistencyCalculator.scoreDay(date, today, relevant, all);
            for (var contribution : score.contributions()) {
                if (contribution.possibleWeight() <= 0) {
                    continue;
                }
                Category category = contribution.habit().getCategory();
                String name = category == null ? "Other" : category.getName();
                earned.merge(name, contribution.earnedWeight(), Double::sum);
                possible.merge(name, contribution.possibleWeight(), Double::sum);
                if (category != null) {
                    ids.put(name, category.getId());
                    colors.put(name, category.getColor());
                }
            }
        }
        List<AnalyticsDtos.NamedScore> result = new ArrayList<>();
        for (String name : possible.keySet()) {
            double score = earned.getOrDefault(name, 0.0) / possible.get(name);
            result.add(new AnalyticsDtos.NamedScore(ids.get(name), name, colors.get(name), round(score), pct(score)));
        }
        result.sort(Comparator.comparingInt(AnalyticsDtos.NamedScore::percent).reversed());
        return result;
    }

    private List<AnalyticsDtos.HeatCell> heatmap(List<DailyScore> days) {
        List<AnalyticsDtos.HeatCell> cells = new ArrayList<>();
        for (DailyScore day : days) {
            int percent = day.percent();
            int level = day.score() == null && day.scheduled() == 0 ? 0 : levelFor(percent);
            cells.add(new AnalyticsDtos.HeatCell(day.date(), day.score(), percent, level));
        }
        return cells;
    }

    static int levelFor(int percent) {
        if (percent <= 0) {
            return 0;
        }
        if (percent <= 20) {
            return 1;
        }
        if (percent <= 40) {
            return 2;
        }
        if (percent <= 60) {
            return 3;
        }
        if (percent <= 80) {
            return 4;
        }
        return 5;
    }

    private static List<DailyScore> filter(List<DailyScore> days, LocalDate from, LocalDate to) {
        return days.stream().filter(d -> !d.date().isBefore(from) && !d.date().isAfter(to)).toList();
    }

    private static Double average(List<DailyScore> days) {
        return ConsistencyCalculator.average(days);
    }

    private static int pct(Double score) {
        return score == null ? 0 : (int) Math.round(score * 100);
    }

    private static double round(double value) {
        return ConsistencyCalculator.round(value);
    }

    private static String color(Category category) {
        return category == null ? "#94a3b8" : category.getColor();
    }

    public long daysBetweenInclusive(LocalDate start, LocalDate end) {
        return ChronoUnit.DAYS.between(start, end) + 1;
    }

    public DayOfWeek firstDay() {
        return DayOfWeek.MONDAY;
    }
}
