package com.verax.finance;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class FinanceDtos {

    private FinanceDtos() {
    }

    public record HoldingUpsert(
            String name,
            String kind,
            String ticker,
            String exchange,
            BigDecimal quantity,
            BigDecimal avgBuy,
            BigDecimal amount,
            String currency,
            String notes,
            LocalDate asOf
    ) {
    }

    public record MarketQuote(
            String name,
            String ticker,
            String exchange,
            String symbol,
            BigDecimal ltp,
            BigDecimal dayChange,
            BigDecimal dayChangePct,
            BigDecimal lastClose,
            BigDecimal marketCap,
            String marketCapLabel,
            BigDecimal peRatio,
            BigDecimal volume,
            String volumeLabel,
            String currency,
            String source
    ) {
    }

    public record HoldingView(
            UUID id,
            String name,
            String ticker,
            String exchange,
            String kind,
            BigDecimal quantity,
            BigDecimal avgBuy,
            BigDecimal amount,
            BigDecimal buyValue,
            BigDecimal currentValue,
            BigDecimal currentValueInr,
            BigDecimal sliceValueInr,
            BigDecimal weight,
            BigDecimal pnl,
            BigDecimal pnlPct,
            String currency,
            String notes,
            LocalDate asOf,
            MarketQuote quote
    ) {
        public static HoldingView from(Holding holding) {
            return from(holding, null, null, null);
        }

        public static HoldingView from(Holding holding, MarketQuote quote, BigDecimal usdInr, BigDecimal portfolioInr) {
            BigDecimal qty = nvl(holding.getQuantity());
            BigDecimal avg = nvl(holding.getAvgBuy());
            BigDecimal buy = qty.signum() > 0 && avg.signum() > 0
                    ? qty.multiply(avg).setScale(2, RoundingMode.HALF_UP)
                    : nvl(holding.getAmount());
            BigDecimal ltp = quote == null ? null : quote.ltp();
            BigDecimal current = ltp != null && qty.signum() > 0
                    ? qty.multiply(ltp).setScale(2, RoundingMode.HALF_UP)
                    : buy;
            String currency = quote != null && quote.currency() != null ? quote.currency() : holding.getCurrency();
            BigDecimal inr = toInr(current, currency, usdInr);
            BigDecimal markInr = ltp == null ? BigDecimal.ZERO : toInr(ltp, currency, usdInr);
            BigDecimal slice = qty.signum() > 0 ? inr : (markInr.signum() > 0 ? markInr : inr);
            BigDecimal pnl = current.subtract(buy);
            BigDecimal pnlPct = buy.signum() == 0
                    ? null
                    : pnl.multiply(new BigDecimal("100")).divide(buy, 2, RoundingMode.HALF_UP);
            BigDecimal weight = portfolioInr != null && portfolioInr.signum() > 0
                    ? inr.multiply(new BigDecimal("100")).divide(portfolioInr, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            return new HoldingView(
                    holding.getId(),
                    holding.getName(),
                    holding.getTicker(),
                    holding.getExchange(),
                    holding.getKind(),
                    holding.getQuantity(),
                    holding.getAvgBuy(),
                    holding.getAmount(),
                    buy,
                    current,
                    inr,
                    slice,
                    weight,
                    pnl,
                    pnlPct,
                    currency,
                    holding.getNotes(),
                    holding.getAsOf(),
                    quote
            );
        }

        private static BigDecimal nvl(BigDecimal value) {
            return value == null ? BigDecimal.ZERO : value;
        }

        private static BigDecimal toInr(BigDecimal value, String currency, BigDecimal usdInr) {
            if (value == null) {
                return BigDecimal.ZERO;
            }
            if (currency == null || "INR".equalsIgnoreCase(currency)) {
                return value;
            }
            if ("USD".equalsIgnoreCase(currency) && usdInr != null) {
                return value.multiply(usdInr).setScale(2, RoundingMode.HALF_UP);
            }
            return value;
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

    public record WorkbookItemView(
            UUID id,
            String category,
            String name,
            String kind,
            int sortOrder,
            java.util.Map<String, BigDecimal> amounts
    ) {
    }

    public record MonthTotal(
            BigDecimal expenses,
            BigDecimal income,
            BigDecimal balance,
            BigDecimal running
    ) {
    }

    public record WorkbookView(
            List<String> months,
            List<WorkbookItemView> items,
            java.util.Map<String, MonthTotal> totals
    ) {
    }

    public record ItemUpsert(String category, String name, String kind) {
    }

    public record CategoryRename(String from, String to) {
    }

    public record CellUpsert(UUID itemId, String month, BigDecimal amount) {
    }

    public record AccountUpsert(String name, String kind, BigDecimal balance, String currency) {
    }

    public record AccountView(UUID id, String name, String kind, BigDecimal balance, String currency) {
        public static AccountView from(FinanceAccount account) {
            return new AccountView(account.getId(), account.getName(), account.getKind(), account.getBalance(), account.getCurrency());
        }
    }

    public record LoanUpsert(
            String name,
            String kind,
            BigDecimal principal,
            BigDecimal remaining,
            BigDecimal emi,
            BigDecimal rate,
            Integer tenureMonths,
            LocalDate nextDueDate,
            Integer termMonths,
            BigDecimal disbursed,
            BigDecimal currentRoi,
            String repaymentMode,
            String plan,
            BigDecimal principalBalance,
            BigDecimal accruedInterest,
            LocalDate interestAsOf,
            BigDecimal feeRefund,
            LocalDate feeRefundUntil,
            BigDecimal earlyPayoffSavings,
            List<InstallmentUpsert> schedule
    ) {
    }

    public record InstallmentUpsert(LocalDate dueDate, BigDecimal amount) {
    }

    public record InstallmentView(UUID id, LocalDate dueDate, BigDecimal amount) {
        public static InstallmentView from(FinanceLoanInstallment row) {
            return new InstallmentView(row.getId(), row.getDueDate(), row.getAmount());
        }
    }

    public record LoanPaymentUpsert(LocalDate dueDate, BigDecimal emi) {
    }

    public record ForecastPoint(String period, BigDecimal remaining) {
    }

    public record LoanPaymentView(
            UUID id,
            LocalDate dueDate,
            String kind,
            String source,
            BigDecimal emi,
            BigDecimal interest,
            BigDecimal principal,
            BigDecimal outstandingAfter
    ) {
        public static LoanPaymentView from(FinanceLoanPayment row) {
            return new LoanPaymentView(
                    row.getId(),
                    row.getDueDate(),
                    row.getKind(),
                    row.getSource(),
                    row.getEmi(),
                    row.getInterest(),
                    row.getPrincipal(),
                    row.getOutstandingAfter()
            );
        }
    }

    public record LoanView(
            UUID id,
            String name,
            String kind,
            BigDecimal principal,
            BigDecimal remaining,
            BigDecimal emi,
            BigDecimal rate,
            Integer tenureMonths,
            LocalDate nextDueDate,
            Integer termMonths,
            BigDecimal disbursed,
            BigDecimal currentRoi,
            String repaymentMode,
            String plan,
            BigDecimal principalBalance,
            BigDecimal accruedInterest,
            LocalDate interestAsOf,
            BigDecimal feeRefund,
            LocalDate feeRefundUntil,
            BigDecimal earlyPayoffSavings,
            List<InstallmentView> schedule,
            List<LoanPaymentView> payments,
            List<ForecastPoint> forecast
    ) {
        public static LoanView from(
                FinanceLoan loan,
                List<InstallmentView> schedule,
                List<LoanPaymentView> payments,
                List<ForecastPoint> forecast
        ) {
            return new LoanView(
                    loan.getId(),
                    loan.getName(),
                    loan.getKind(),
                    loan.getPrincipal(),
                    loan.getRemaining(),
                    loan.getEmi(),
                    loan.getRate(),
                    loan.getTenureMonths(),
                    loan.getNextDueDate(),
                    loan.getTermMonths(),
                    loan.getDisbursed(),
                    loan.getCurrentRoi(),
                    loan.getRepaymentMode(),
                    loan.getPlan(),
                    loan.getPrincipalBalance(),
                    loan.getAccruedInterest(),
                    loan.getInterestAsOf(),
                    loan.getFeeRefund(),
                    loan.getFeeRefundUntil(),
                    loan.getEarlyPayoffSavings(),
                    schedule,
                    payments,
                    forecast
            );
        }
    }

    public record TaxItemUpsert(Integer taxYear, String name, String kind, BigDecimal amount) {
    }

    public record TaxItemView(UUID id, int taxYear, String name, String kind, BigDecimal amount) {
        public static TaxItemView from(FinanceTaxItem item) {
            return new TaxItemView(item.getId(), item.getTaxYear(), item.getName(), item.getKind(), item.getAmount());
        }
    }

    public record TaxCompareView(
            BigDecimal income,
            BigDecimal oldTaxable,
            BigDecimal newTaxable,
            BigDecimal oldTax,
            BigDecimal newTax,
            BigDecimal oldCess,
            BigDecimal newCess,
            BigDecimal oldTotal,
            BigDecimal newTotal,
            String cheaper,
            BigDecimal section80c,
            BigDecimal otherDeductions,
            List<TaxItemView> items
    ) {
    }

    public record FlowNode(int id, String name, String side) {
    }

    public record FlowLink(int source, int target, BigDecimal value) {
    }

    public record PortfolioView(
            BigDecimal accountsTotal,
            BigDecimal holdingsTotal,
            BigDecimal loansTotal,
            BigDecimal netWorth,
            BigDecimal monthIncome,
            BigDecimal monthExpenses,
            BigDecimal leftover,
            String month,
            List<FlowNode> nodes,
            List<FlowLink> links
    ) {
    }

    public record QuoteView(String name, String symbol, BigDecimal price, String currency, String source, BigDecimal usd) {
    }
}
