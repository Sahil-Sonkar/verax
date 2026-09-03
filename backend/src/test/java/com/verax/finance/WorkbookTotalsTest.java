package com.verax.finance;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WorkbookTotalsTest {

    @Test
    void runningIsZeroOnFirstLoggedMonthNotOnWindowStart() {
        BudgetItem pay = income("Pay", cell("2026-09", "10"), cell("2026-10", "10"), cell("2027-02", "10"));
        FinanceDtos.WorkbookView window = FinanceService.toWorkbook(List.of(pay), List.of("2027-02", "2027-03"));
        assertEquals(0, FinanceService.toWorkbook(List.of(pay), List.of("2026-09")).totals().get("2026-09").running().intValue());
        assertEquals(20, window.totals().get("2027-02").running().intValue());
        assertEquals(20, window.totals().get("2027-03").running().intValue());
    }

    @Test
    void windowBeforeFirstLogStaysZero() {
        BudgetItem pay = income("Pay", cell("2026-09", "10"));
        FinanceDtos.WorkbookView window = FinanceService.toWorkbook(List.of(pay), List.of("2026-02", "2026-03"));
        assertEquals(0, window.totals().get("2026-02").running().intValue());
        assertEquals(0, window.totals().get("2026-03").running().intValue());
    }

    private static BudgetItem income(String name, BudgetAmount... cells) {
        BudgetItem item = new BudgetItem();
        item.setName(name);
        item.setKind("INCOME");
        for (BudgetAmount cell : cells) {
            cell.setItem(item);
            item.getAmounts().add(cell);
        }
        return item;
    }

    private static BudgetAmount cell(String month, String amount) {
        BudgetAmount row = new BudgetAmount();
        row.setYearMonth(month);
        row.setAmount(new BigDecimal(amount));
        return row;
    }
}
