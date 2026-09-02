package com.verax.finance;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class LoanSchedule {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
    private static final BigDecimal MONTHS = BigDecimal.valueOf(1200);

    private LoanSchedule() {
    }

    record Installment(
            LocalDate dueDate,
            BigDecimal emi,
            BigDecimal interest,
            BigDecimal principal,
            BigDecimal outstandingAfter
    ) {
    }

    static BigDecimal annualRate(BigDecimal currentRoi, BigDecimal rate) {
        if (currentRoi != null) {
            return currentRoi;
        }
        return rate == null ? BigDecimal.ZERO : rate;
    }

    static Installment pay(BigDecimal remaining, BigDecimal emi, BigDecimal annualPct, LocalDate dueDate) {
        BigDecimal balance = scale(remaining);
        if (balance.signum() <= 0) {
            return new Installment(dueDate, ZERO, ZERO, ZERO, ZERO);
        }
        BigDecimal installment = scale(emi);
        BigDecimal interest = balance.multiply(nvl(annualPct)).divide(MONTHS, 2, RoundingMode.HALF_EVEN);
        if (installment.signum() <= 0) {
            return new Installment(dueDate, ZERO, interest, ZERO, balance);
        }
        BigDecimal after = balance.add(interest).subtract(installment);
        if (after.signum() <= 0) {
            BigDecimal principal = balance;
            return new Installment(dueDate, principal.add(interest), interest, principal, ZERO);
        }
        return new Installment(dueDate, installment, interest, installment.subtract(interest), after);
    }

    static LocalDate periodDue(LocalDate nextDue, LocalDate today) {
        return nextDue == null ? today : nextDue;
    }

    static LocalDate advance(LocalDate due) {
        return due.plusMonths(1);
    }

    record Point(String period, BigDecimal remaining) {
    }

    static String monthKey(LocalDate date) {
        return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
    }

    static int monthsToClear(BigDecimal remaining, BigDecimal emi, BigDecimal annualPct) {
        BigDecimal balance = scale(remaining);
        int months = 0;
        while (balance.signum() > 0 && months < 360) {
            Installment step = pay(balance, emi, annualPct, LocalDate.of(2020, 1, 1).plusMonths(months));
            if (step.principal().signum() <= 0 && step.outstandingAfter().compareTo(balance) >= 0) {
                break;
            }
            balance = step.outstandingAfter();
            months++;
        }
        return months;
    }

    static List<Point> forecast(
            BigDecimal origin,
            BigDecimal current,
            BigDecimal emi,
            BigDecimal annualPct,
            LocalDate start,
            List<Installment> history,
            LocalDate nextDue,
            int cap
    ) {
        Map<String, BigDecimal> byMonth = new LinkedHashMap<>();
        if (start != null) {
            byMonth.put(monthKey(start), scale(origin));
        }
        for (Installment row : history) {
            byMonth.put(monthKey(row.dueDate()), scale(row.outstandingAfter()));
        }
        BigDecimal balance = scale(current);
        LocalDate cursor = nextDue == null ? LocalDate.now() : nextDue;
        if (byMonth.isEmpty()) {
            byMonth.put(monthKey(cursor), balance);
        }
        int guard = 0;
        while (balance.signum() > 0 && guard++ < cap) {
            Installment step = pay(balance, emi, annualPct, cursor);
            if (step.principal().signum() <= 0 && step.outstandingAfter().compareTo(balance) >= 0) {
                break;
            }
            balance = step.outstandingAfter();
            byMonth.put(monthKey(cursor), balance);
            if (balance.signum() <= 0) {
                break;
            }
            cursor = cursor.plusMonths(1);
        }
        List<Point> points = new ArrayList<>();
        if (byMonth.isEmpty()) {
            return points;
        }
        String firstPeriod = byMonth.keySet().iterator().next();
        String lastPeriod = firstPeriod;
        for (String period : byMonth.keySet()) {
            lastPeriod = period;
        }
        BigDecimal carried = byMonth.get(firstPeriod);
        LocalDate month = LocalDate.parse(firstPeriod + "-01");
        LocalDate end = LocalDate.parse(lastPeriod + "-01");
        while (!month.isAfter(end)) {
            String period = monthKey(month);
            if (byMonth.containsKey(period)) {
                carried = byMonth.get(period);
            }
            points.add(new Point(period, carried));
            month = month.plusMonths(1);
        }
        return points;
    }

    static List<Point> forecastStatement(BigDecimal current, LocalDate start, List<Installment> remaining) {
        Map<String, BigDecimal> drops = new LinkedHashMap<>();
        BigDecimal balance = scale(current);
        LocalDate first = start;
        LocalDate last = start;
        if (start != null) {
            drops.put(monthKey(start), balance);
        }
        for (Installment row : remaining) {
            if (first == null || row.dueDate().isBefore(first)) {
                first = row.dueDate();
            }
            last = row.dueDate();
            balance = balance.subtract(scale(row.emi()));
            if (balance.signum() < 0) {
                balance = ZERO;
            }
            drops.put(monthKey(row.dueDate()), balance);
            if (balance.signum() <= 0) {
                break;
            }
        }
        if (first == null) {
            return List.of();
        }
        List<Point> points = new ArrayList<>();
        BigDecimal carried = scale(current);
        LocalDate cursor = first.withDayOfMonth(1);
        LocalDate end = last.withDayOfMonth(1);
        while (!cursor.isAfter(end)) {
            String period = monthKey(cursor);
            if (drops.containsKey(period)) {
                carried = drops.get(period);
            }
            points.add(new Point(period, carried));
            cursor = cursor.plusMonths(1);
        }
        return points;
    }

    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal scale(BigDecimal value) {
        return nvl(value).setScale(2, RoundingMode.HALF_EVEN);
    }
}
