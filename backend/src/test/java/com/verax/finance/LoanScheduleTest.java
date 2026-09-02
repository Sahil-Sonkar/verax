package com.verax.finance;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LoanScheduleTest {

    @Test
    void reducingBalanceSplitsInterestAndPrincipal() {
        LoanSchedule.Installment step = LoanSchedule.pay(
                new BigDecimal("1000000"),
                new BigDecimal("42180"),
                new BigDecimal("8.40"),
                LocalDate.of(2026, 9, 5)
        );
        assertEquals(new BigDecimal("7000.00"), step.interest());
        assertEquals(new BigDecimal("35180.00"), step.principal());
        assertEquals(new BigDecimal("964820.00"), step.outstandingAfter());
        assertEquals(new BigDecimal("42180.00"), step.emi());
    }

    @Test
    void lastInstallmentClearsTheBalance() {
        LoanSchedule.Installment step = LoanSchedule.pay(
                new BigDecimal("1000.00"),
                new BigDecimal("42180"),
                new BigDecimal("8.40"),
                LocalDate.of(2026, 9, 5)
        );
        assertEquals(new BigDecimal("1000.00"), step.principal());
        assertEquals(new BigDecimal("7.00"), step.interest());
        assertEquals(new BigDecimal("1007.00"), step.emi());
        assertEquals(new BigDecimal("0.00"), step.outstandingAfter());
    }

    @Test
    void prefersCurrentRoiOverOriginalRate() {
        assertEquals(new BigDecimal("8.35"), LoanSchedule.annualRate(new BigDecimal("8.35"), new BigDecimal("8.40")));
        assertEquals(new BigDecimal("8.40"), LoanSchedule.annualRate(null, new BigDecimal("8.40")));
    }

    @Test
    void extraPaymentShortensTheForecast() {
        BigDecimal rate = new BigDecimal("8.40");
        BigDecimal emi = new BigDecimal("42180");
        BigDecimal opening = new BigDecimal("1000000");
        java.util.List<LoanSchedule.Point> scheduled = LoanSchedule.forecast(
                opening, opening, emi, rate, LocalDate.of(2026, 8, 1), java.util.List.of(), LocalDate.of(2026, 9, 5), 360
        );
        LoanSchedule.Installment extra = LoanSchedule.pay(opening, new BigDecimal("200000"), rate, LocalDate.of(2026, 9, 5));
        java.util.List<LoanSchedule.Point> prepaid = LoanSchedule.forecast(
                opening,
                extra.outstandingAfter(),
                emi,
                rate,
                LocalDate.of(2026, 8, 1),
                java.util.List.of(extra),
                LocalDate.of(2026, 10, 5),
                360
        );
        assertEquals(true, prepaid.size() < scheduled.size());
        assertEquals(0, prepaid.get(prepaid.size() - 1).remaining().signum());
    }

    @Test
    void statementScheduleEndsWhenInstallmentsRunOut() {
        java.util.List<LoanSchedule.Installment> rows = java.util.List.of(
                new LoanSchedule.Installment(java.time.LocalDate.of(2026, 10, 5), new java.math.BigDecimal("56608.52"), java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO),
                new LoanSchedule.Installment(java.time.LocalDate.of(2026, 11, 5), new java.math.BigDecimal("53897.91"), java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO)
        );
        java.util.List<LoanSchedule.Point> points = LoanSchedule.forecastStatement(
                new java.math.BigDecimal("110506.43"),
                java.time.LocalDate.of(2026, 9, 5),
                rows
        );
        assertEquals(3, points.size());
        assertEquals(0, points.get(points.size() - 1).remaining().signum());
    }
}
