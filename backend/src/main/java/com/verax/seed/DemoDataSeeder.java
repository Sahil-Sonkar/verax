package com.verax.seed;

import com.verax.auth.AuthDtos;
import com.verax.auth.AuthService;
import com.verax.category.Category;
import com.verax.category.CategoryRepository;
import com.verax.completion.CompletionStatus;
import com.verax.completion.HabitCompletion;
import com.verax.completion.HabitCompletionRepository;
import com.verax.config.VeraxProperties;
import com.verax.goal.Goal;
import com.verax.goal.GoalMilestone;
import com.verax.goal.GoalRepository;
import com.verax.goal.GoalStatus;
import com.verax.habit.FrequencyConfig;
import com.verax.habit.FrequencyType;
import com.verax.habit.Habit;
import com.verax.habit.HabitRepository;
import com.verax.habit.HabitSection;
import com.verax.habit.Importance;
import com.verax.journal.JournalDtos;
import com.verax.journal.JournalService;
import com.verax.metric.Metric;
import com.verax.metric.MetricEntry;
import com.verax.metric.MetricEntryRepository;
import com.verax.metric.MetricRepository;
import com.verax.transformation.TransformationDtos;
import com.verax.transformation.TransformationService;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@Order(1)
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    public static final String DEMO_EMAIL = "demo@verax.app";
    public static final String DEMO_PASSWORD = "verax-demo";

    private final VeraxProperties properties;
    private final UserRepository users;
    private final AuthService auth;
    private final CategoryRepository categories;
    private final HabitRepository habits;
    private final HabitCompletionRepository completions;
    private final GoalRepository goals;
    private final MetricRepository metrics;
    private final MetricEntryRepository metricEntries;
    private final JournalService journal;
    private final TransformationService transformations;

    public DemoDataSeeder(
            VeraxProperties properties,
            UserRepository users,
            AuthService auth,
            CategoryRepository categories,
            HabitRepository habits,
            HabitCompletionRepository completions,
            GoalRepository goals,
            MetricRepository metrics,
            MetricEntryRepository metricEntries,
            JournalService journal,
            TransformationService transformations
    ) {
        this.properties = properties;
        this.users = users;
        this.auth = auth;
        this.categories = categories;
        this.habits = habits;
        this.completions = completions;
        this.goals = goals;
        this.metrics = metrics;
        this.metricEntries = metricEntries;
        this.journal = journal;
        this.transformations = transformations;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.isSeed() || users.count() > 0) {
            return;
        }
        AuthDtos.AuthResponse created = auth.register(new AuthDtos.RegisterRequest(
                "Sahil",
                DEMO_EMAIL,
                DEMO_PASSWORD,
                "Asia/Kolkata"
        ));
        UUID userId = created.user().id();
        User user = users.getReferenceById(userId);
        Map<String, Category> cats = categories.findByUserIdOrderBySortOrderAscNameAsc(userId).stream()
                .collect(Collectors.toMap(Category::getSystemKey, Function.identity()));

        LocalDate origin = LocalDate.of(2026, 7, 1);
        LocalDate today = LocalDate.of(2026, 8, 24);
        List<Habit> createdHabits = seedHabits(user, cats, origin);
        seedCompletions(user, createdHabits, origin, today.minusDays(1));
        List<Goal> createdGoals = seedGoals(user, cats, origin);
        seedMetrics(user, cats, origin, today);
        seedJournal(userId, today);
        transformations.create(userId, new TransformationDtos.Upsert(
                "8-month transformation",
                LocalDate.of(2026, 8, 1),
                LocalDate.of(2027, 4, 30),
                "Become lean, financially sharper, visible, and someone who ships real software.",
                createdGoals.stream().map(Goal::getId).toList()
        ));
        log.info("Seeded demo workspace for {} / {}", DEMO_EMAIL, DEMO_PASSWORD);
    }

    private List<Habit> seedHabits(User user, Map<String, Category> cats, LocalDate origin) {
        List<Habit> list = new ArrayList<>();
        list.add(habit(user, cats.get("fitness"), "Sleep 7.5–8 hours", "Protect the night so the day can compound.", "moon",
                HabitSection.NON_NEGOTIABLE, FrequencyType.DAILY, FrequencyConfig.daily(),
                BigDecimal.valueOf(8), "hours", Importance.CRITICAL, origin));
        list.add(habit(user, cats.get("fitness"), "Exercise", "Strength, boxing, or a real training session.", "dumbbell",
                HabitSection.NON_NEGOTIABLE, FrequencyType.DAILY, FrequencyConfig.daily(),
                BigDecimal.ONE, "session", Importance.CRITICAL, origin));
        list.add(habit(user, cats.get("fitness"), "Follow nutrition plan", "Eat to the plan. No negotiation on weekdays.", "utensils",
                HabitSection.NON_NEGOTIABLE, FrequencyType.DAILY, FrequencyConfig.daily(),
                null, null, Importance.CRITICAL, origin));
        list.add(habit(user, cats.get("fitness"), "7,000+ steps", "Daily movement floor.", "footprints",
                HabitSection.NON_NEGOTIABLE, FrequencyType.DAILY, FrequencyConfig.daily(),
                BigDecimal.valueOf(7000), "steps", Importance.IMPORTANT, origin));
        list.add(habit(user, cats.get("appearance"), "Hair / health routine", "Treatment, scalp care, non-negotiable sequence.", "sparkles",
                HabitSection.NON_NEGOTIABLE, FrequencyType.DAILY, FrequencyConfig.daily(),
                null, null, Importance.IMPORTANT, origin));
        list.add(habit(user, cats.get("career"), "2 hours deep work", "Build software. No shallow morning.", "code",
                HabitSection.GROWTH, FrequencyType.DAILY, FrequencyConfig.daily(),
                BigDecimal.valueOf(2), "hours", Importance.CRITICAL, origin));
        list.add(habit(user, cats.get("content"), "Content creation", "One block toward being visible.", "video",
                HabitSection.GROWTH, FrequencyType.DAILY, FrequencyConfig.daily(),
                null, null, Importance.IMPORTANT, origin));
        list.add(habit(user, cats.get("learning"), "Reading", "Pages over perfection.", "book",
                HabitSection.GROWTH, FrequencyType.DAILY, FrequencyConfig.daily(),
                BigDecimal.valueOf(20), "pages", Importance.OPTIONAL, origin));
        list.add(habit(user, cats.get("personal"), "Meditation", "Ten quiet minutes.", "lotus",
                HabitSection.GROWTH, FrequencyType.DAILY, FrequencyConfig.daily(),
                BigDecimal.TEN, "minutes", Importance.OPTIONAL, origin));
        list.add(habit(user, cats.get("health"), "Supplements", "A stack, not a single tick.", "pill",
                HabitSection.GROWTH, FrequencyType.DAILY, FrequencyConfig.daily(),
                null, null, Importance.IMPORTANT, origin));
        list.add(habit(user, cats.get("health"), "3L water", "Hydration floor. Slide what you drank.", "droplet",
                HabitSection.OTHER, FrequencyType.DAILY, FrequencyConfig.daily(),
                BigDecimal.valueOf(3), "L", Importance.OPTIONAL, origin));
        list.add(habit(user, cats.get("fitness"), "Boxing", "Three sessions a week. Skill and engine.", "glove",
                HabitSection.GROWTH, FrequencyType.WEEKLY, FrequencyConfig.timesPerPeriod(3),
                BigDecimal.valueOf(3), "sessions", Importance.IMPORTANT, origin));
        list.add(habit(user, cats.get("content"), "YouTube", "One video shipped every week.", "play",
                HabitSection.GROWTH, FrequencyType.WEEKLY, FrequencyConfig.timesPerPeriod(1),
                BigDecimal.ONE, "video", Importance.IMPORTANT, origin));
        list.add(habit(user, cats.get("personal"), "Toastmasters", "Saturday stage time.", "mic",
                HabitSection.GROWTH, FrequencyType.WEEKDAYS, FrequencyConfig.weekdays(6),
                BigDecimal.ONE, "session", Importance.IMPORTANT, origin));
        list.add(habit(user, cats.get("finance"), "Invest", "Move money into assets once a month.", "coins",
                HabitSection.OTHER, FrequencyType.MONTHLY, FrequencyConfig.timesPerPeriod(1),
                null, "INR", Importance.IMPORTANT, origin));
        return habits.saveAll(list);
    }

    private Habit habit(
            User user,
            Category category,
            String name,
            String description,
            String icon,
            HabitSection section,
            FrequencyType frequency,
            FrequencyConfig config,
            BigDecimal target,
            String unit,
            Importance importance,
            LocalDate start
    ) {
        Habit habit = new Habit();
        habit.setUser(user);
        habit.setCategory(category);
        habit.setName(name);
        habit.setDescription(description);
        habit.setIcon(icon);
        habit.setSection(section);
        habit.setFrequencyType(frequency);
        habit.setFrequencyConfig(config);
        habit.setTargetValue(target);
        habit.setUnit(unit);
        habit.setImportance(importance);
        habit.setWeight(importance.defaultWeight());
        habit.setStartDate(start);
        return habit;
    }

    private void seedCompletions(User user, List<Habit> createdHabits, LocalDate from, LocalDate to) {
        Map<String, Habit> byName = createdHabits.stream().collect(Collectors.toMap(Habit::getName, Function.identity()));
        List<HabitCompletion> rows = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            Random random = new Random(date.toEpochDay() * 17);
            boolean rough = date.getDayOfMonth() == 13 || date.getDayOfMonth() == 21;
            boolean weekend = date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY;
            addDaily(rows, user, byName.get("Sleep 7.5–8 hours"), date, bias(random, rough ? 0.72 : 0.94));
            addDaily(rows, user, byName.get("Exercise"), date, bias(random, weekend ? 0.7 : 0.88));
            addDaily(rows, user, byName.get("Follow nutrition plan"), date, bias(random, weekend ? 0.68 : 0.9));
            addDaily(rows, user, byName.get("7,000+ steps"), date, bias(random, 0.9));
            addDaily(rows, user, byName.get("Hair / health routine"), date, bias(random, 0.92));
            addDaily(rows, user, byName.get("2 hours deep work"), date, weekend ? skipOrDo(random, 0.45) : bias(random, rough ? 0.55 : 0.84));
            addDaily(rows, user, byName.get("Content creation"), date, bias(random, weekend ? 0.55 : 0.62));
            addDaily(rows, user, byName.get("Reading"), date, bias(random, 0.6));
            addDaily(rows, user, byName.get("Meditation"), date, bias(random, 0.52));
            addDaily(rows, user, byName.get("Supplements"), date, bias(random, 0.93));
            addDaily(rows, user, byName.get("3L water"), date, bias(random, 0.8));
            if (date.getDayOfWeek() == DayOfWeek.MONDAY || date.getDayOfWeek() == DayOfWeek.WEDNESDAY || date.getDayOfWeek() == DayOfWeek.FRIDAY) {
                addDaily(rows, user, byName.get("Boxing"), date, bias(random, 0.82));
            }
            if (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                addDaily(rows, user, byName.get("YouTube"), date, bias(random, 0.58));
            }
            if (date.getDayOfWeek() == DayOfWeek.SATURDAY) {
                addDaily(rows, user, byName.get("Toastmasters"), date, bias(random, 0.8));
            }
            if (date.getDayOfMonth() == 1) {
                addDaily(rows, user, byName.get("Invest"), date, bias(random, 0.95));
            }
        }
        completions.saveAll(rows);
    }

    private CompletionStatus bias(Random random, double completeRate) {
        double roll = random.nextDouble();
        if (roll < completeRate) {
            return CompletionStatus.COMPLETED;
        }
        if (roll < completeRate + 0.08) {
            return CompletionStatus.PARTIAL;
        }
        if (roll < completeRate + 0.12) {
            return CompletionStatus.SKIPPED;
        }
        return CompletionStatus.MISSED;
    }

    private CompletionStatus skipOrDo(Random random, double completeRate) {
        return random.nextDouble() < 0.4 ? CompletionStatus.SKIPPED : bias(random, completeRate);
    }

    private void addDaily(List<HabitCompletion> rows, User user, Habit habit, LocalDate date, CompletionStatus status) {
        HabitCompletion completion = new HabitCompletion();
        completion.setUser(user);
        completion.setHabit(habit);
        completion.setDate(date);
        completion.setStatus(status);
        rows.add(completion);
    }

    private List<Goal> seedGoals(User user, Map<String, Category> cats, LocalDate origin) {
        List<Goal> list = new ArrayList<>();
        list.add(goal(user, cats.get("fitness"), "Reach 12% body fat", "Lean, athletic, sustainable.",
                BigDecimal.valueOf(12), BigDecimal.valueOf(19.5), BigDecimal.valueOf(21.2), "%",
                origin, LocalDate.of(2027, 4, 30), "Starting point 21%. Trend is the win."));
        Goal youtube = goal(user, cats.get("content"), "Publish 30 YouTube videos", "Become comfortable being visible.",
                BigDecimal.valueOf(30), BigDecimal.valueOf(7), BigDecimal.ZERO, "videos",
                origin, LocalDate.of(2027, 4, 30), "Ship weekly. Quality follows volume.");
        GoalMilestone m1 = new GoalMilestone();
        m1.setName("First 10 videos");
        m1.setTargetValue(BigDecimal.TEN);
        m1.setSortOrder(0);
        m1.setGoal(youtube);
        youtube.getMilestones().add(m1);
        list.add(youtube);
        Goal product = goal(user, cats.get("career"), "Launch production SaaS", "A real product with paying users.",
                BigDecimal.valueOf(3), BigDecimal.ONE, BigDecimal.ZERO, "stage",
                origin, LocalDate.of(2027, 2, 1), "1 = MVP, 2 = beta, 3 = launched.");
        GoalMilestone idea = milestone(product, "MVP", BigDecimal.ONE, LocalDate.of(2026, 8, 1), 0);
        GoalMilestone beta = milestone(product, "Beta", BigDecimal.valueOf(2), null, 1);
        GoalMilestone launch = milestone(product, "Launch", BigDecimal.valueOf(3), null, 2);
        product.getMilestones().add(idea);
        product.getMilestones().add(beta);
        product.getMilestones().add(launch);
        list.add(product);
        list.add(goal(user, cats.get("finance"), "Invest ₹5,00,000", "Build financially independent assets.",
                BigDecimal.valueOf(500_000), BigDecimal.valueOf(185_000), BigDecimal.ZERO, "INR",
                origin, LocalDate.of(2027, 4, 30), "Consistency of transfers matters more than timing."));
        list.add(goal(user, cats.get("fitness"), "80 boxing sessions", "Become someone who spars with composure.",
                BigDecimal.valueOf(80), BigDecimal.valueOf(12), BigDecimal.ZERO, "sessions",
                origin, LocalDate.of(2027, 4, 30), null));
        list.add(goal(user, cats.get("appearance"), "8 months of hair treatment", "Show up for the protocol every day.",
                BigDecimal.valueOf(8), BigDecimal.ONE, BigDecimal.ZERO, "months",
                LocalDate.of(2026, 8, 1), LocalDate.of(2027, 4, 1), null));
        list.add(goal(user, cats.get("personal"), "Speak in 16 Toastmasters meetings", "Comfort on stage, not performance theater.",
                BigDecimal.valueOf(16), BigDecimal.valueOf(3), BigDecimal.ZERO, "meetings",
                origin, LocalDate.of(2027, 4, 30), null));
        return goals.saveAll(list);
    }

    private Goal goal(
            User user,
            Category category,
            String name,
            String description,
            BigDecimal target,
            BigDecimal current,
            BigDecimal baseline,
            String unit,
            LocalDate start,
            LocalDate end,
            String notes
    ) {
        Goal goal = new Goal();
        goal.setUser(user);
        goal.setCategory(category);
        goal.setName(name);
        goal.setDescription(description);
        goal.setTargetValue(target);
        goal.setCurrentValue(current);
        goal.setBaselineValue(baseline);
        goal.setUnit(unit);
        goal.setStartDate(start);
        goal.setTargetDate(end);
        goal.setStatus(GoalStatus.ACTIVE);
        goal.setNotes(notes);
        return goal;
    }

    private GoalMilestone milestone(Goal goal, String name, BigDecimal target, LocalDate reached, int order) {
        GoalMilestone milestone = new GoalMilestone();
        milestone.setGoal(goal);
        milestone.setName(name);
        milestone.setTargetValue(target);
        milestone.setReachedAt(reached);
        milestone.setSortOrder(order);
        return milestone;
    }

    private void seedMetrics(User user, Map<String, Category> cats, LocalDate from, LocalDate today) {
        Metric weight = metric(user, cats.get("fitness"), "Weight", "kg", "Morning weight");
        Metric bf = metric(user, cats.get("fitness"), "Body fat", "%", "Estimate, not diagnosis");
        Metric netWorth = metric(user, cats.get("finance"), "Net worth", "INR", "Assets minus liabilities");
        Metric invested = metric(user, cats.get("finance"), "Invested", "INR", "Deployed capital");
        Metric subs = metric(user, cats.get("content"), "YouTube subscribers", "subs", "Manual snapshot");
        Metric sleep = metric(user, cats.get("health"), "Sleep", "hours", "Last night");
        metrics.saveAll(List.of(weight, bf, netWorth, invested, subs, sleep));

        List<MetricEntry> entries = new ArrayList<>();
        int i = 0;
        for (LocalDate date = from; !date.isAfter(today.minusDays(1)); date = date.plusDays(1)) {
            if (date.getDayOfWeek() == DayOfWeek.MONDAY || date.equals(from)) {
                double w = 82.4 - (i * 0.045);
                entries.add(entry(weight, date, w));
                entries.add(entry(bf, date, 21.2 - (i * 0.028)));
                i++;
            }
            if (date.getDayOfWeek() == DayOfWeek.FRIDAY) {
                entries.add(entry(invested, date, 120_000 + i * 4_800));
                entries.add(entry(netWorth, date, 1_850_000 + i * 12_000));
            }
            if (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                entries.add(entry(subs, date, 120 + i * 6));
            }
            entries.add(entry(sleep, date, 6.8 + ((date.toEpochDay() % 5) * 0.22)));
        }
        metricEntries.saveAll(entries);
    }

    private Metric metric(User user, Category category, String name, String unit, String description) {
        Metric metric = new Metric();
        metric.setUser(user);
        metric.setCategory(category);
        metric.setName(name);
        metric.setUnit(unit);
        metric.setDescription(description);
        return metric;
    }

    private MetricEntry entry(Metric metric, LocalDate date, double value) {
        MetricEntry entry = new MetricEntry();
        entry.setMetric(metric);
        entry.setDate(date);
        entry.setValue(BigDecimal.valueOf(Math.round(value * 10.0) / 10.0));
        return entry;
    }

    private void seedJournal(UUID userId, LocalDate today) {
        journal.upsert(userId, today.minusDays(10), new JournalDtos.Upsert(
                "Training felt heavy but I finished. Deep work was cleaner after sleep.",
                "steady",
                "The person I want is built on ordinary Tuesdays.",
                "Boxed and shipped a small product slice.",
                "Avoided the camera again.",
                "Visibility is a skill, not a personality type."
        ));
        journal.upsert(userId, today.minusDays(3), new JournalDtos.Upsert(
                "Content slipped. Not a character judgment — a calendar problem.",
                "flat",
                "Protect one filming block before noon.",
                "Hit steps and nutrition.",
                "Opened the laptop to 'just check' and lost an hour.",
                "Fewer commitments, more finished things."
        ));
    }
}
