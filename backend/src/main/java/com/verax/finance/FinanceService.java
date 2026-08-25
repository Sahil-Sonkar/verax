package com.verax.finance;

import com.verax.common.ApiException;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class FinanceService {

    private final HoldingRepository holdings;
    private final MonthlyBudgetRepository budgets;
    private final UserRepository users;

    public FinanceService(HoldingRepository holdings, MonthlyBudgetRepository budgets, UserRepository users) {
        this.holdings = holdings;
        this.budgets = budgets;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<FinanceDtos.HoldingView> listHoldings(UUID userId) {
        return holdings.findByUserIdOrderByNameAsc(userId).stream().map(FinanceDtos.HoldingView::from).toList();
    }

    @Transactional
    public FinanceDtos.HoldingView createHolding(UUID userId, FinanceDtos.HoldingUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        User user = users.getReferenceById(userId);
        Holding holding = new Holding();
        holding.setUser(user);
        apply(holding, request);
        holdings.save(holding);
        return FinanceDtos.HoldingView.from(holding);
    }

    @Transactional
    public FinanceDtos.HoldingView updateHolding(UUID userId, UUID id, FinanceDtos.HoldingUpsert request) {
        Holding holding = holdings.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Holding not found"));
        apply(holding, request);
        return FinanceDtos.HoldingView.from(holding);
    }

    @Transactional
    public void deleteHolding(UUID userId, UUID id) {
        Holding holding = holdings.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Holding not found"));
        holdings.delete(holding);
    }

    @Transactional
    public FinanceDtos.BudgetView budget(UUID userId, String yearMonth) {
        MonthlyBudget budget = budgets.findByUserIdAndYearMonth(userId, yearMonth).orElseGet(() -> {
            User user = users.getReferenceById(userId);
            MonthlyBudget created = new MonthlyBudget();
            created.setUser(user);
            created.setYearMonth(yearMonth);
            return budgets.save(created);
        });
        budget.getLines().size();
        return toBudget(userId, budget);
    }

    @Transactional
    public FinanceDtos.BudgetView saveBudget(UUID userId, String yearMonth, FinanceDtos.BudgetUpsert request) {
        MonthlyBudget budget = budgets.findByUserIdAndYearMonth(userId, yearMonth).orElseGet(() -> {
            User user = users.getReferenceById(userId);
            MonthlyBudget created = new MonthlyBudget();
            created.setUser(user);
            created.setYearMonth(yearMonth);
            return created;
        });
        if (request.income() != null) {
            budget.setIncome(request.income());
        }
        if (request.plannedInvest() != null) {
            budget.setPlannedInvest(request.plannedInvest());
        }
        if (request.notes() != null) {
            budget.setNotes(request.notes());
        }
        if (request.lines() != null) {
            budget.getLines().clear();
            int order = 0;
            for (FinanceDtos.LineUpsert line : request.lines()) {
                if (line.name() == null || line.name().isBlank()) {
                    continue;
                }
                BudgetLine row = new BudgetLine();
                row.setBudget(budget);
                row.setName(line.name().trim());
                row.setPlanned(line.planned() == null ? BigDecimal.ZERO : line.planned());
                row.setSpent(line.spent() == null ? BigDecimal.ZERO : line.spent());
                row.setSortOrder(order++);
                budget.getLines().add(row);
            }
        }
        budgets.save(budget);
        return toBudget(userId, budget);
    }

    private FinanceDtos.BudgetView toBudget(UUID userId, MonthlyBudget budget) {
        BigDecimal total = holdings.findByUserIdOrderByNameAsc(userId).stream()
                .map(Holding::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new FinanceDtos.BudgetView(
                budget.getId(),
                budget.getYearMonth(),
                budget.getIncome(),
                budget.getPlannedInvest(),
                budget.getNotes(),
                total,
                budget.getLines().stream().map(FinanceDtos.LineView::from).toList()
        );
    }

    private void apply(Holding holding, FinanceDtos.HoldingUpsert request) {
        if (request.name() != null) {
            holding.setName(request.name().trim());
        }
        if (request.kind() != null) {
            holding.setKind(request.kind().trim().toUpperCase());
        }
        if (request.amount() != null) {
            holding.setAmount(request.amount());
        }
        if (request.currency() != null && !request.currency().isBlank()) {
            holding.setCurrency(request.currency().trim());
        }
        if (request.notes() != null) {
            holding.setNotes(request.notes());
        }
        if (request.asOf() != null) {
            holding.setAsOf(request.asOf());
        }
    }
}
