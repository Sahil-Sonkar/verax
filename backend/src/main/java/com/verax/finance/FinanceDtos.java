package com.verax.finance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class FinanceDtos {

    private FinanceDtos() {
    }

    public record HoldingUpsert(
            String name,
            String kind,
            BigDecimal amount,
            String currency,
            String notes,
            LocalDate asOf
    ) {
    }

    public record HoldingView(
            UUID id,
            String name,
            String kind,
            BigDecimal amount,
            String currency,
            String notes,
            LocalDate asOf
    ) {
        public static HoldingView from(Holding holding) {
            return new HoldingView(
                    holding.getId(),
                    holding.getName(),
                    holding.getKind(),
                    holding.getAmount(),
                    holding.getCurrency(),
                    holding.getNotes(),
                    holding.getAsOf()
            );
        }
    }

    public record LineUpsert(String name, BigDecimal planned, BigDecimal spent) {
    }

    public record BudgetUpsert(BigDecimal income, BigDecimal plannedInvest, String notes, List<LineUpsert> lines) {
    }

    public record LineView(UUID id, String name, BigDecimal planned, BigDecimal spent) {
        public static LineView from(BudgetLine line) {
            return new LineView(line.getId(), line.getName(), line.getPlanned(), line.getSpent());
        }
    }

    public record BudgetView(
            UUID id,
            String yearMonth,
            BigDecimal income,
            BigDecimal plannedInvest,
            String notes,
            BigDecimal holdingsTotal,
            List<LineView> lines
    ) {
    }
}
