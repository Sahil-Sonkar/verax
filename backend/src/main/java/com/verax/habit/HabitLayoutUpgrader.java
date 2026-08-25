package com.verax.habit;

import com.verax.category.CategoryRepository;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Component
@Order(20)
public class HabitLayoutUpgrader implements ApplicationRunner {

    private final UserRepository users;
    private final HabitRepository habits;
    private final CategoryRepository categories;

    public HabitLayoutUpgrader(UserRepository users, HabitRepository habits, CategoryRepository categories) {
        this.users = users;
        this.habits = habits;
        this.categories = categories;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (User user : users.findAll()) {
            habits.findByUserIdAndNameIgnoreCase(user.getId(), "Invest").ifPresent(habit -> {
                habit.setFrequencyType(FrequencyType.MONTHLY);
                habit.setFrequencyConfig(FrequencyConfig.timesPerPeriod(1));
                habit.setSection(HabitSection.OTHER);
            });
            habits.findByUserIdAndNameIgnoreCase(user.getId(), "Supplements").ifPresent(parent -> {
                if (!habits.findByParentId(parent.getId()).isEmpty()) {
                    return;
                }
                parent.setSection(HabitSection.GROWTH);
                categories.findByUserIdAndSystemKey(user.getId(), "health").ifPresent(parent::setCategory);
                for (String name : List.of("Vitamin D", "Omega-3", "Magnesium", "Creatine")) {
                    Habit child = new Habit();
                    child.setUser(user);
                    child.setParent(parent);
                    child.setCategory(parent.getCategory());
                    child.setName(name);
                    child.setSection(HabitSection.GROWTH);
                    child.setFrequencyType(FrequencyType.DAILY);
                    child.setFrequencyConfig(FrequencyConfig.daily());
                    child.setImportance(Importance.IMPORTANT);
                    child.setWeight(Importance.IMPORTANT.defaultWeight());
                    child.setStartDate(parent.getStartDate());
                    habits.save(child);
                }
            });
        }
    }
}
