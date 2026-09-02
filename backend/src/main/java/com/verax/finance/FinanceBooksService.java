package com.verax.finance;

import com.verax.common.ApiException;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class FinanceBooksService {

    private final FinanceAccountRepository accounts;
    private final FinanceLoanRepository loans;
    private final FinanceLoanPaymentRepository loanPayments;
    private final FinanceLoanInstallmentRepository installments;
    private final FinanceTaxItemRepository taxItems;
    private final BudgetItemRepository budgetItems;
    private final UserRepository users;
    private final PriceQuoteService prices;
    private final FinanceService finance;

    public FinanceBooksService(
            FinanceAccountRepository accounts,
            FinanceLoanRepository loans,
            FinanceLoanPaymentRepository loanPayments,
            FinanceLoanInstallmentRepository installments,
            FinanceTaxItemRepository taxItems,
            BudgetItemRepository budgetItems,
            UserRepository users,
            PriceQuoteService prices,
            FinanceService finance
    ) {
        this.accounts = accounts;
        this.loans = loans;
        this.loanPayments = loanPayments;
        this.installments = installments;
        this.taxItems = taxItems;
        this.budgetItems = budgetItems;
        this.users = users;
        this.prices = prices;
        this.finance = finance;
    }

    @Transactional(readOnly = true)
    public List<FinanceDtos.AccountView> listAccounts(UUID userId) {
        return accounts.findByUserIdOrderByNameAsc(userId).stream().map(FinanceDtos.AccountView::from).toList();
    }

    @Transactional
    public FinanceDtos.AccountView saveAccount(UUID userId, UUID id, FinanceDtos.AccountUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        User user = users.getReferenceById(userId);
        FinanceAccount account = id == null
                ? newAccount(user)
                : accounts.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Account not found"));
        account.setName(request.name().trim());
        account.setKind(kind(request.kind(), "BANK"));
        account.setBalance(nvl(request.balance()));
        account.setCurrency(blank(request.currency(), "INR"));
        accounts.save(account);
        return FinanceDtos.AccountView.from(account);
    }

    @Transactional
    public void deleteAccount(UUID userId, UUID id) {
        FinanceAccount account = accounts.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Account not found"));
        accounts.delete(account);
    }

    @Transactional
    public List<FinanceDtos.LoanView> listLoans(UUID userId) {
        catchUpDue(userId);
        return loans.findByUserIdOrderByNameAsc(userId).stream().map(this::toView).toList();
    }

    @Transactional
    public FinanceDtos.LoanView saveLoan(UUID userId, UUID id, FinanceDtos.LoanUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        User user = users.getReferenceById(userId);
        FinanceLoan loan = id == null
                ? newLoan(user)
                : loans.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Loan not found"));
        loan.setName(request.name().trim());
        loan.setKind(kind(request.kind(), "PERSONAL"));
        loan.setPrincipal(nvl(request.principal()));
        loan.setRemaining(nvl(request.remaining()));
        loan.setEmi(nvl(request.emi()));
        loan.setRate(request.rate());
        loan.setTenureMonths(request.tenureMonths());
        loan.setNextDueDate(request.nextDueDate());
        loan.setTermMonths(request.termMonths());
        loan.setDisbursed(request.disbursed());
        loan.setCurrentRoi(request.currentRoi());
        loan.setRepaymentMode(
                request.repaymentMode() == null || request.repaymentMode().isBlank()
                        ? null
                        : kind(request.repaymentMode(), "NACH")
        );
        loan.setPrincipalBalance(request.principalBalance());
        loan.setAccruedInterest(request.accruedInterest());
        loan.setInterestAsOf(request.interestAsOf());
        loan.setFeeRefund(request.feeRefund());
        loan.setFeeRefundUntil(request.feeRefundUntil());
        loan.setEarlyPayoffSavings(request.earlyPayoffSavings());
        boolean statement = "STATEMENT".equalsIgnoreCase(request.plan())
                || (request.schedule() != null && !request.schedule().isEmpty());
        loan.setPlan(statement ? "STATEMENT" : "EMI");
        loans.save(loan);
        replaceSchedule(loan, request.schedule());
        if (statement) {
            syncStatement(loan);
        }
        ensureOrigin(loan);
        loans.save(loan);
        return toView(loan);
    }

    @Transactional
    public FinanceDtos.LoanView addPayment(UUID userId, UUID loanId, FinanceDtos.LoanPaymentUpsert request) {
        FinanceLoan loan = loans.findByIdAndUserId(loanId, userId).orElseThrow(() -> ApiException.notFound("Loan not found"));
        ensureOrigin(loan);
        LocalDate due = request.dueDate() == null ? LoanSchedule.periodDue(loan.getNextDueDate(), LocalDate.now()) : request.dueDate();
        FinanceLoanPayment row = new FinanceLoanPayment();
        row.setLoan(loan);
        row.setUser(loan.getUser());
        row.setDueDate(due);
        row.setSource("MANUAL");
        applyPaymentAmount(row, request.emi());
        loanPayments.save(row);
        rebuild(loan, null);
        loans.save(loan);
        return toView(loan);
    }

    @Transactional
    public FinanceDtos.LoanView updatePayment(UUID userId, UUID loanId, UUID paymentId, FinanceDtos.LoanPaymentUpsert request) {
        FinanceLoan loan = loans.findByIdAndUserId(loanId, userId).orElseThrow(() -> ApiException.notFound("Loan not found"));
        FinanceLoanPayment row = paymentOn(loan, paymentId);
        if (request.dueDate() != null) {
            row.setDueDate(request.dueDate());
        }
        if (request.emi() != null) {
            applyPaymentAmount(row, request.emi());
        }
        row.setSource("MANUAL");
        loanPayments.save(row);
        rebuild(loan, null);
        loans.save(loan);
        return toView(loan);
    }

    @Transactional
    public FinanceDtos.LoanView deletePayment(UUID userId, UUID loanId, UUID paymentId) {
        FinanceLoan loan = loans.findByIdAndUserId(loanId, userId).orElseThrow(() -> ApiException.notFound("Loan not found"));
        FinanceLoanPayment row = paymentOn(loan, paymentId);
        LocalDate removedDue = row.getDueDate();
        loanPayments.delete(row);
        loanPayments.flush();
        rebuild(loan, removedDue);
        loans.save(loan);
        return toView(loan);
    }

    @Transactional
    public FinanceDtos.LoanView addInstallment(UUID userId, UUID loanId, FinanceDtos.InstallmentUpsert request) {
        FinanceLoan loan = loans.findByIdAndUserId(loanId, userId).orElseThrow(() -> ApiException.notFound("Loan not found"));
        if (request == null || request.dueDate() == null || request.amount() == null) {
            throw ApiException.badRequest("Due date and amount are required");
        }
        FinanceLoanInstallment row = new FinanceLoanInstallment();
        row.setLoan(loan);
        row.setDueDate(request.dueDate());
        row.setAmount(request.amount());
        row.setSortOrder(installments.findByLoanIdOrderByDueDateAscSortOrderAsc(loan.getId()).size());
        installments.save(row);
        loan.setPlan("STATEMENT");
        afterScheduleChange(loan);
        loans.save(loan);
        return toView(loan);
    }

    @Transactional
    public FinanceDtos.LoanView updateInstallment(UUID userId, UUID loanId, UUID installmentId, FinanceDtos.InstallmentUpsert request) {
        FinanceLoan loan = loans.findByIdAndUserId(loanId, userId).orElseThrow(() -> ApiException.notFound("Loan not found"));
        FinanceLoanInstallment row = installmentOn(loan, installmentId);
        if (request.dueDate() != null) {
            row.setDueDate(request.dueDate());
        }
        if (request.amount() != null) {
            row.setAmount(request.amount());
        }
        installments.save(row);
        afterScheduleChange(loan);
        loans.save(loan);
        return toView(loan);
    }

    @Transactional
    public FinanceDtos.LoanView deleteInstallment(UUID userId, UUID loanId, UUID installmentId) {
        FinanceLoan loan = loans.findByIdAndUserId(loanId, userId).orElseThrow(() -> ApiException.notFound("Loan not found"));
        FinanceLoanInstallment row = installmentOn(loan, installmentId);
        installments.delete(row);
        installments.flush();
        afterScheduleChange(loan);
        loans.save(loan);
        return toView(loan);
    }

    @Transactional
    public FinanceDtos.LoanView payLoan(UUID userId, UUID id) {
        FinanceLoan loan = loans.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Loan not found"));
        applyPaid(loan, "MANUAL", LocalDate.now());
        loans.save(loan);
        return toView(loan);
    }

    @Transactional
    public FinanceDtos.LoanView skipLoan(UUID userId, UUID id) {
        FinanceLoan loan = loans.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Loan not found"));
        applySkip(loan, LocalDate.now());
        loans.save(loan);
        return toView(loan);
    }

    @Transactional
    public void deleteLoan(UUID userId, UUID id) {
        FinanceLoan loan = loans.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Loan not found"));
        loans.delete(loan);
    }

    @Transactional(readOnly = true)
    public List<FinanceDtos.TaxItemView> listTax(UUID userId, int year) {
        return taxItems.findByUserIdAndTaxYearOrderByNameAsc(userId, year).stream().map(FinanceDtos.TaxItemView::from).toList();
    }

    @Transactional
    public FinanceDtos.TaxItemView saveTax(UUID userId, UUID id, FinanceDtos.TaxItemUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        int year = request.taxYear() == null ? LocalDate.now().getYear() : request.taxYear();
        User user = users.getReferenceById(userId);
        FinanceTaxItem item = id == null
                ? newTax(user, year)
                : taxItems.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Tax item not found"));
        item.setTaxYear(year);
        item.setName(request.name().trim());
        item.setKind(kind(request.kind(), "OTHER"));
        item.setAmount(nvl(request.amount()));
        taxItems.save(item);
        return FinanceDtos.TaxItemView.from(item);
    }

    @Transactional
    public void deleteTax(UUID userId, UUID id) {
        FinanceTaxItem item = taxItems.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Tax item not found"));
        taxItems.delete(item);
    }

    @Transactional(readOnly = true)
    public FinanceDtos.TaxCompareView compareTax(UUID userId, int year, BigDecimal income) {
        List<FinanceTaxItem> items = taxItems.findByUserIdAndTaxYearOrderByNameAsc(userId, year);
        TaxCalculator.Compare compare = TaxCalculator.compare(nvl(income), items);
        return new FinanceDtos.TaxCompareView(
                compare.income(),
                compare.oldTaxable(),
                compare.newTaxable(),
                compare.oldTax(),
                compare.newTax(),
                compare.oldCess(),
                compare.newCess(),
                compare.oldTotal(),
                compare.newTotal(),
                compare.cheaper(),
                compare.section80c(),
                compare.otherDeductions(),
                items.stream().map(FinanceDtos.TaxItemView::from).toList()
        );
    }

    @Transactional
    public FinanceDtos.PortfolioView portfolio(UUID userId) {
        catchUpDue(userId);
        BigDecimal holdingsTotal = finance.holdingsCurrentInr(userId);
        BigDecimal accountsTotal = accounts.findByUserIdOrderByNameAsc(userId).stream()
                .map(FinanceAccount::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal loanTotal = loans.findByUserIdOrderByNameAsc(userId).stream()
                .map(FinanceLoan::getRemaining)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netWorth = holdingsTotal.add(accountsTotal).subtract(loanTotal);

        String month = YearMonth.now().toString();
        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
        Map<String, BigDecimal> sources = new LinkedHashMap<>();
        Map<String, BigDecimal> sinks = new LinkedHashMap<>();
        for (BudgetItem item : budgetItems.findByUserIdOrderBySortOrderAscNameAsc(userId)) {
            BigDecimal value = item.getAmounts().stream()
                    .filter(cell -> month.equals(cell.getYearMonth()))
                    .map(BudgetAmount::getAmount)
                    .filter(amount -> amount != null)
                    .findFirst()
                    .orElse(null);
            if (value == null) {
                continue;
            }
            if ("INCOME".equals(item.getKind())) {
                income = income.add(value);
                sources.merge(item.getName(), value, BigDecimal::add);
            } else {
                expenses = expenses.add(value);
                sinks.merge(blank(item.getCategory(), item.getName()), value, BigDecimal::add);
            }
        }
        BigDecimal leftover = income.subtract(expenses);
        if (leftover.signum() > 0) {
            sinks.merge("Left this month", leftover, BigDecimal::add);
        } else if (leftover.signum() < 0) {
            sources.merge("Drawn from cash", leftover.abs(), BigDecimal::add);
        }

        List<FinanceDtos.FlowNode> nodes = new ArrayList<>();
        List<FinanceDtos.FlowLink> links = new ArrayList<>();
        int index = 0;
        Map<String, Integer> sourceIndex = new LinkedHashMap<>();
        for (String name : sources.keySet()) {
            sourceIndex.put(name, index);
            nodes.add(new FinanceDtos.FlowNode(index++, name, "IN"));
        }
        int mid = index;
        nodes.add(new FinanceDtos.FlowNode(mid, "This month", "MID"));
        index++;
        Map<String, Integer> sinkIndex = new LinkedHashMap<>();
        for (String name : sinks.keySet()) {
            sinkIndex.put(name, index);
            nodes.add(new FinanceDtos.FlowNode(index++, name, "OUT"));
        }
        for (Map.Entry<String, BigDecimal> entry : sources.entrySet()) {
            links.add(new FinanceDtos.FlowLink(sourceIndex.get(entry.getKey()), mid, entry.getValue()));
        }
        for (Map.Entry<String, BigDecimal> entry : sinks.entrySet()) {
            links.add(new FinanceDtos.FlowLink(mid, sinkIndex.get(entry.getKey()), entry.getValue()));
        }

        return new FinanceDtos.PortfolioView(
                accountsTotal,
                holdingsTotal,
                loanTotal,
                netWorth,
                income,
                expenses,
                leftover,
                month,
                nodes,
                links
        );
    }

    public FinanceDtos.QuoteView quote(String kind, String query) {
        return prices.quote(kind, query);
    }

    private static FinanceAccount newAccount(User user) {
        FinanceAccount account = new FinanceAccount();
        account.setUser(user);
        return account;
    }

    private void catchUpDue(UUID userId) {
        LocalDate today = LocalDate.now();
        for (FinanceLoan loan : loans.findByUserIdOrderByNameAsc(userId)) {
            int guard = 0;
            while (dueBefore(loan, today) && guard++ < 36) {
                if (loanPayments.existsByLoanIdAndDueDate(loan.getId(), loan.getNextDueDate())) {
                    loan.setNextDueDate(LoanSchedule.advance(loan.getNextDueDate()));
                    continue;
                }
                applyPaid(loan, "AUTO", today);
            }
            loans.save(loan);
        }
    }

    private void applyPaid(FinanceLoan loan, String source, LocalDate today) {
        if (nvl(loan.getRemaining()).signum() <= 0) {
            throw ApiException.badRequest("Loan is already closed");
        }
        ensureOrigin(loan);
        if (statement(loan)) {
            applyStatementPaid(loan, source, today);
            return;
        }
        if (nvl(loan.getEmi()).signum() <= 0) {
            throw ApiException.badRequest("Set a current EMI before recording a payment");
        }
        LocalDate due = LoanSchedule.periodDue(loan.getNextDueDate(), today);
        LoanSchedule.Installment step = LoanSchedule.pay(
                loan.getRemaining(),
                loan.getEmi(),
                LoanSchedule.annualRate(loan.getCurrentRoi(), loan.getRate()),
                due
        );
        loan.setRemaining(step.outstandingAfter());
        if (loan.getTenureMonths() != null) {
            loan.setTenureMonths(Math.max(0, loan.getTenureMonths() - 1));
        }
        loan.setNextDueDate(LoanSchedule.advance(due));
        recordPayment(loan, due, "PAID", source, step.emi(), step.interest(), step.principal(), step.outstandingAfter());
    }

    private void applySkip(FinanceLoan loan, LocalDate today) {
        if (nvl(loan.getRemaining()).signum() <= 0) {
            throw ApiException.badRequest("Loan is already closed");
        }
        ensureOrigin(loan);
        LocalDate due = LoanSchedule.periodDue(loan.getNextDueDate(), today);
        if (statement(loan)) {
            FinanceLoanInstallment next = nextInstallment(loan, due);
            loan.setNextDueDate(next == null ? LoanSchedule.advance(due) : followingDue(loan, next.getDueDate()));
            recordPayment(loan, due, "SKIPPED", "MANUAL", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, nvl(loan.getRemaining()));
            syncStatement(loan);
            return;
        }
        loan.setNextDueDate(LoanSchedule.advance(due));
        recordPayment(loan, due, "SKIPPED", "MANUAL", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, nvl(loan.getRemaining()));
    }

    private void recordPayment(
            FinanceLoan loan,
            LocalDate due,
            String kind,
            String source,
            BigDecimal emi,
            BigDecimal interest,
            BigDecimal principal,
            BigDecimal outstandingAfter
    ) {
        FinanceLoanPayment row = new FinanceLoanPayment();
        row.setLoan(loan);
        row.setUser(loan.getUser());
        row.setDueDate(due);
        row.setKind(kind);
        row.setSource(source);
        row.setEmi(emi);
        row.setInterest(interest);
        row.setPrincipal(principal);
        row.setOutstandingAfter(outstandingAfter);
        loanPayments.save(row);
    }

    private FinanceDtos.LoanView toView(FinanceLoan loan) {
        List<FinanceLoanPayment> chronological = loanPayments.findByLoanIdOrderByDueDateAscCreatedAtAsc(loan.getId());
        List<FinanceDtos.LoanPaymentView> history = new ArrayList<>();
        for (int i = chronological.size() - 1; i >= 0; i--) {
            history.add(FinanceDtos.LoanPaymentView.from(chronological.get(i)));
        }
        return FinanceDtos.LoanView.from(loan, scheduleView(loan), history, forecast(loan, chronological));
    }

    private List<FinanceDtos.ForecastPoint> forecast(FinanceLoan loan, List<FinanceLoanPayment> chronological) {
        if (statement(loan)) {
            LocalDate start = LoanSchedule.periodDue(loan.getNextDueDate(), LocalDate.now());
            List<LoanSchedule.Installment> remaining = upcoming(loan).stream()
                    .map(row -> new LoanSchedule.Installment(row.getDueDate(), row.getAmount(), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO))
                    .toList();
            LocalDate chartStart = remaining.isEmpty() ? start : remaining.getFirst().dueDate().minusMonths(1);
            return LoanSchedule.forecastStatement(loan.getRemaining(), chartStart, remaining).stream()
                    .map(point -> new FinanceDtos.ForecastPoint(point.period(), point.remaining()))
                    .toList();
        }
        BigDecimal origin = originOf(loan, chronological);
        LocalDate start = chronological.isEmpty()
                ? LoanSchedule.periodDue(loan.getNextDueDate(), LocalDate.now())
                : chronological.getFirst().getDueDate().minusMonths(1);
        List<LoanSchedule.Installment> history = chronological.stream()
                .map(row -> new LoanSchedule.Installment(
                        row.getDueDate(),
                        row.getEmi(),
                        row.getInterest(),
                        row.getPrincipal(),
                        row.getOutstandingAfter()
                ))
                .toList();
        int cap = 360;
        return LoanSchedule.forecast(
                origin,
                loan.getRemaining(),
                loan.getEmi(),
                LoanSchedule.annualRate(loan.getCurrentRoi(), loan.getRate()),
                start,
                history,
                loan.getNextDueDate(),
                cap
        ).stream().map(point -> new FinanceDtos.ForecastPoint(point.period(), point.remaining())).toList();
    }

    private void rebuild(FinanceLoan loan, LocalDate removedDue) {
        if (statement(loan)) {
            rebuildStatement(loan, removedDue);
            return;
        }
        List<FinanceLoanPayment> rows = loanPayments.findByLoanIdOrderByDueDateAscCreatedAtAsc(loan.getId());
        ensureOrigin(loan);
        BigDecimal origin = originOf(loan, rows);
        BigDecimal rate = LoanSchedule.annualRate(loan.getCurrentRoi(), loan.getRate());
        BigDecimal balance = origin;
        LocalDate lastDue = null;
        int paid = 0;
        for (FinanceLoanPayment row : rows) {
            lastDue = row.getDueDate();
            if ("SKIPPED".equals(row.getKind()) || nvl(row.getEmi()).signum() <= 0) {
                row.setKind("SKIPPED");
                row.setEmi(BigDecimal.ZERO);
                row.setInterest(BigDecimal.ZERO);
                row.setPrincipal(BigDecimal.ZERO);
                row.setOutstandingAfter(balance);
                loanPayments.save(row);
                continue;
            }
            LoanSchedule.Installment step = LoanSchedule.pay(balance, row.getEmi(), rate, row.getDueDate());
            row.setKind("PAID");
            row.setEmi(step.emi());
            row.setInterest(step.interest());
            row.setPrincipal(step.principal());
            row.setOutstandingAfter(step.outstandingAfter());
            balance = step.outstandingAfter();
            paid++;
            loanPayments.save(row);
        }
        loan.setRemaining(balance);
        loan.setTenureMonths(LoanSchedule.monthsToClear(balance, loan.getEmi(), rate));
        LocalDate next = lastDue == null ? loan.getNextDueDate() : LoanSchedule.advance(lastDue);
        if (removedDue != null) {
            LocalDate afterRemoved = LoanSchedule.advance(removedDue);
            if (next == null || next.isBefore(afterRemoved)) {
                next = afterRemoved;
            }
        }
        if (next == null) {
            next = LocalDate.now();
        }
        loan.setNextDueDate(next);
        if (paid == 0 && rows.isEmpty() && loan.getTermMonths() != null) {
            loan.setTenureMonths(loan.getTermMonths());
        }
    }

    private void applyPaymentAmount(FinanceLoanPayment row, BigDecimal emi) {
        if (emi == null || emi.signum() <= 0) {
            row.setKind("SKIPPED");
            row.setEmi(BigDecimal.ZERO);
            return;
        }
        row.setKind("PAID");
        row.setEmi(emi);
    }

    private FinanceLoanPayment paymentOn(FinanceLoan loan, UUID paymentId) {
        FinanceLoanPayment row = loanPayments.findById(paymentId).orElseThrow(() -> ApiException.notFound("Payment not found"));
        if (!row.getLoan().getId().equals(loan.getId())) {
            throw ApiException.notFound("Payment not found");
        }
        return row;
    }

    private void ensureOrigin(FinanceLoan loan) {
        if (loan.getOriginBalance() == null || loan.getOriginBalance().signum() <= 0) {
            loan.setOriginBalance(originOf(loan, loanPayments.findByLoanIdOrderByDueDateAscCreatedAtAsc(loan.getId())));
        }
    }

    private static BigDecimal originOf(FinanceLoan loan, List<FinanceLoanPayment> rows) {
        if (loan.getOriginBalance() != null && loan.getOriginBalance().signum() > 0) {
            return loan.getOriginBalance();
        }
        if (!rows.isEmpty()) {
            FinanceLoanPayment first = rows.getFirst();
            if ("PAID".equals(first.getKind())) {
                return nvl(first.getOutstandingAfter()).add(nvl(first.getPrincipal()));
            }
            return nvl(first.getOutstandingAfter());
        }
        if (loan.getRemaining() != null && loan.getRemaining().signum() > 0) {
            return loan.getRemaining();
        }
        if (loan.getDisbursed() != null && loan.getDisbursed().signum() > 0) {
            return loan.getDisbursed();
        }
        return nvl(loan.getPrincipal());
    }

    private void afterScheduleChange(FinanceLoan loan) {
        List<FinanceLoanInstallment> rows = installments.findByLoanIdOrderByDueDateAscSortOrderAsc(loan.getId());
        if (rows.isEmpty()) {
            loan.setTenureMonths(0);
            return;
        }
        LocalDate next = loan.getNextDueDate();
        boolean nextStillValid = next != null && rows.stream().anyMatch(row -> !row.getDueDate().isBefore(next));
        if (!nextStillValid) {
            loan.setNextDueDate(rows.getFirst().getDueDate());
        }
        syncStatement(loan);
    }

    private FinanceLoanInstallment installmentOn(FinanceLoan loan, UUID installmentId) {
        return installments.findByIdAndLoanId(installmentId, loan.getId())
                .orElseThrow(() -> ApiException.notFound("Installment not found"));
    }

    private void applyStatementPaid(FinanceLoan loan, String source, LocalDate today) {
        LocalDate due = LoanSchedule.periodDue(loan.getNextDueDate(), today);
        FinanceLoanInstallment slot = nextInstallment(loan, due);
        BigDecimal amount = slot == null ? nvl(loan.getEmi()) : slot.getAmount();
        if (amount.signum() <= 0) {
            throw ApiException.badRequest("Set the next installment amount");
        }
        LocalDate paidOn = slot == null ? due : slot.getDueDate();
        BigDecimal after = nvl(loan.getRemaining()).subtract(amount);
        if (after.signum() < 0) {
            after = BigDecimal.ZERO;
        }
        loan.setRemaining(after);
        loan.setNextDueDate(followingDue(loan, paidOn));
        recordPayment(loan, paidOn, "PAID", source, amount, BigDecimal.ZERO, amount, after);
        syncStatement(loan);
    }

    private void rebuildStatement(FinanceLoan loan, LocalDate removedDue) {
        List<FinanceLoanPayment> rows = loanPayments.findByLoanIdOrderByDueDateAscCreatedAtAsc(loan.getId());
        ensureOrigin(loan);
        BigDecimal balance = originOf(loan, rows);
        LocalDate lastDue = null;
        for (FinanceLoanPayment row : rows) {
            lastDue = row.getDueDate();
            if ("SKIPPED".equals(row.getKind()) || nvl(row.getEmi()).signum() <= 0) {
                row.setOutstandingAfter(balance);
                loanPayments.save(row);
                continue;
            }
            balance = balance.subtract(nvl(row.getEmi()));
            if (balance.signum() < 0) {
                balance = BigDecimal.ZERO;
            }
            row.setOutstandingAfter(balance);
            loanPayments.save(row);
        }
        loan.setRemaining(balance);
        LocalDate next = lastDue == null ? loan.getNextDueDate() : followingDue(loan, lastDue);
        if (removedDue != null) {
            LocalDate afterRemoved = followingDue(loan, removedDue);
            if (next == null || (afterRemoved != null && next.isBefore(afterRemoved))) {
                next = afterRemoved;
            }
        }
        loan.setNextDueDate(next);
        syncStatement(loan);
    }

    private void replaceSchedule(FinanceLoan loan, List<FinanceDtos.InstallmentUpsert> schedule) {
        installments.deleteByLoanId(loan.getId());
        installments.flush();
        if (schedule == null) {
            return;
        }
        int order = 0;
        for (FinanceDtos.InstallmentUpsert row : schedule) {
            if (row == null || row.dueDate() == null || row.amount() == null) {
                continue;
            }
            FinanceLoanInstallment item = new FinanceLoanInstallment();
            item.setLoan(loan);
            item.setDueDate(row.dueDate());
            item.setAmount(row.amount());
            item.setSortOrder(order++);
            installments.save(item);
        }
    }

    private void syncStatement(FinanceLoan loan) {
        List<FinanceLoanInstallment> rows = upcoming(loan);
        loan.setTenureMonths(rows.size());
        loan.setTermMonths(installments.findByLoanIdOrderByDueDateAscSortOrderAsc(loan.getId()).size());
        if (loan.getNextDueDate() == null && !rows.isEmpty()) {
            loan.setNextDueDate(rows.getFirst().getDueDate());
        }
        if (!rows.isEmpty() && (loan.getEmi() == null || loan.getEmi().signum() <= 0)) {
            loan.setEmi(rows.getFirst().getAmount());
        }
    }

    private List<FinanceLoanInstallment> upcoming(FinanceLoan loan) {
        LocalDate from = loan.getNextDueDate();
        return installments.findByLoanIdOrderByDueDateAscSortOrderAsc(loan.getId()).stream()
                .filter(row -> from == null || !row.getDueDate().isBefore(from))
                .toList();
    }

    private FinanceLoanInstallment nextInstallment(FinanceLoan loan, LocalDate due) {
        return installments.findByLoanIdOrderByDueDateAscSortOrderAsc(loan.getId()).stream()
                .filter(row -> !row.getDueDate().isBefore(due))
                .findFirst()
                .orElse(null);
    }

    private LocalDate followingDue(FinanceLoan loan, LocalDate due) {
        return installments.findByLoanIdOrderByDueDateAscSortOrderAsc(loan.getId()).stream()
                .map(FinanceLoanInstallment::getDueDate)
                .filter(date -> date.isAfter(due))
                .findFirst()
                .orElse(LoanSchedule.advance(due));
    }

    private List<FinanceDtos.InstallmentView> scheduleView(FinanceLoan loan) {
        return installments.findByLoanIdOrderByDueDateAscSortOrderAsc(loan.getId()).stream()
                .map(FinanceDtos.InstallmentView::from)
                .toList();
    }

    private boolean statement(FinanceLoan loan) {
        return "STATEMENT".equals(loan.getPlan())
                || !installments.findByLoanIdOrderByDueDateAscSortOrderAsc(loan.getId()).isEmpty();
    }

    private boolean dueBefore(FinanceLoan loan, LocalDate today) {
        return loan.getNextDueDate() != null
                && loan.getNextDueDate().isBefore(today)
                && nvl(loan.getRemaining()).signum() > 0
                && (statement(loan) || nvl(loan.getEmi()).signum() > 0);
    }

    private static FinanceLoan newLoan(User user) {
        FinanceLoan loan = new FinanceLoan();
        loan.setUser(user);
        return loan;
    }

    private static FinanceTaxItem newTax(User user, int year) {
        FinanceTaxItem item = new FinanceTaxItem();
        item.setUser(user);
        item.setTaxYear(year);
        return item;
    }

    private static String kind(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
    }

    private static String blank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
