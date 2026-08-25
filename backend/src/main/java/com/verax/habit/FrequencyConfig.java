package com.verax.habit;

import java.util.ArrayList;
import java.util.List;

public class FrequencyConfig {

    private List<Integer> weekdays = new ArrayList<>();
    private Integer timesPerPeriod;
    private Integer intervalDays;

    public List<Integer> getWeekdays() {
        return weekdays;
    }

    public void setWeekdays(List<Integer> weekdays) {
        this.weekdays = weekdays == null ? new ArrayList<>() : weekdays;
    }

    public Integer getTimesPerPeriod() {
        return timesPerPeriod;
    }

    public void setTimesPerPeriod(Integer timesPerPeriod) {
        this.timesPerPeriod = timesPerPeriod;
    }

    public Integer getIntervalDays() {
        return intervalDays;
    }

    public void setIntervalDays(Integer intervalDays) {
        this.intervalDays = intervalDays;
    }

    public static FrequencyConfig daily() {
        return new FrequencyConfig();
    }

    public static FrequencyConfig weekdays(int... days) {
        FrequencyConfig config = new FrequencyConfig();
        for (int day : days) {
            config.weekdays.add(day);
        }
        return config;
    }

    public static FrequencyConfig timesPerPeriod(int times) {
        FrequencyConfig config = new FrequencyConfig();
        config.timesPerPeriod = times;
        return config;
    }
}
