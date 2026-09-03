package com.verax.finance;

import com.verax.common.ApiException;
import com.verax.user.User;
import com.verax.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class FinanceService {

    private final HoldingRepository holdings;
    private final MonthlyBudgetRepository budgets;
    private final BudgetItemRepository items;
    private final UserRepository users;
    private final PriceQuoteService prices;
    private final ExecutorService quotes = Executors.newFixedThreadPool(6);

    public FinanceService(
            HoldingRepository holdings,
            MonthlyBudgetRepository budgets,
            BudgetItemRepository items,
            UserRepository users,
            PriceQuoteService prices
    ) {
        this.holdings = holdings;
        this.budgets = budgets;
        this.items = items;
        this.users = users;
        this.prices = prices;
    }

    @Transactional
    public List<FinanceDtos.HoldingView> listHoldings(UUID userId) {
        List<Holding> rows = holdings.findByUserIdOrderByNameAsc(userId);
        boolean needsFx = rows.stream().anyMatch(row -> {
            String kind = row.getKind() == null ? "" : row.getKind();
            String currency = row.getCurrency() == null ? "" : row.getCurrency();
            return kind.contains("US") || kind.contains("CRYPTO") || kind.contains("COM") || kind.contains("GOLD")
                    || "USD".equalsIgnoreCase(currency);
        });
        BigDecimal usdInr = needsFx ? prices.usdInr() : null;
        Map<UUID, FinanceDtos.MarketQuote> live = new ConcurrentHashMap<>();
        CompletableFuture.allOf(rows.stream()
                .map(row -> CompletableFuture.runAsync(() -> {
                    FinanceDtos.MarketQuote quote = prices.quoteHolding(row);
                    if (quote != null) {
                        live.put(row.getId(), quote);
                    }
                }, quotes))
                .toArray(CompletableFuture[]::new)).join();
        BigDecimal totalInr = rows.stream()
                .map(row -> FinanceDtos.HoldingView.from(row, live.get(row.getId()), usdInr, BigDecimal.ONE).currentValueInr())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return rows.stream()
                .map(row -> FinanceDtos.HoldingView.from(row, live.get(row.getId()), usdInr, totalInr))
                .sorted(byMarketCap())
                .toList();
    }

    private static Comparator<FinanceDtos.HoldingView> byMarketCap() {
        return Comparator
                .comparing((FinanceDtos.HoldingView row) -> {
                    if (row.quote() == null || row.quote().marketCap() == null) {
                        return BigDecimal.ZERO;
                    }
                    return row.quote().marketCap();
                }, Comparator.reverseOrder())
                .thenComparing(row -> row.ticker() == null ? row.name() : row.ticker());
    }

    public BigDecimal holdingsCurrentInr(UUID userId) {
        return listHoldings(userId).stream()
                .map(row -> row.currentValueInr() == null ? BigDecimal.ZERO : row.currentValueInr())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional
    public FinanceDtos.HoldingView createHolding(UUID userId, FinanceDtos.HoldingUpsert request) {
        String name = blankToNull(request.name());
        String ticker = blankToNull(request.ticker());
        if (name == null && ticker == null) {
            throw ApiException.badRequest("Ticker is required");
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
        String ticker = blankToNull(request.ticker());
        if (ticker != null) {
            holding.setTicker(ticker.toUpperCase());
        }
        if (request.exchange() != null) {
            holding.setExchange(blankToNull(request.exchange()) == null ? null : request.exchange().trim().toUpperCase());
        }
        String name = blankToNull(request.name());
        if (name != null) {
            holding.setName(name);
        } else if (holding.getName() == null && holding.getTicker() != null) {
            holding.setName(holding.getTicker());
        }
        if (request.kind() != null) {
            String kind = request.kind().trim().toUpperCase();
            if ("GOLD".equals(kind) || "SILVER".equals(kind)) {
                kind = "COMMODITY";
            }
            holding.setKind(kind);
        }
        if (request.quantity() != null) {
            holding.setQuantity(request.quantity());
        }
        if (request.avgBuy() != null) {
            holding.setAvgBuy(request.avgBuy());
        }
        if (holding.getQuantity() != null && holding.getAvgBuy() != null
                && holding.getQuantity().signum() > 0 && holding.getAvgBuy().signum() > 0) {
            holding.setAmount(holding.getQuantity().multiply(holding.getAvgBuy()).setScale(2, RoundingMode.HALF_UP));
        } else if (request.amount() != null) {
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
        if (holding.getName() == null || holding.getName().isBlank()) {
            throw ApiException.badRequest("Ticker is required");
        }
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    @Transactional
    public FinanceDtos.WorkbookView workbook(UUID userId, String from, String to) {
        List<String> months = monthsBetween(from, to);
        List<BudgetItem> rows = loadItems(userId);
        return toWorkbook(rows, months);
    }

    @Transactional
    public FinanceDtos.WorkbookItemView addItem(UUID userId, FinanceDtos.ItemUpsert request) {
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("Name is required");
        }
        User user = users.getReferenceById(userId);
        int next = loadItems(userId).stream()
                .mapToInt(BudgetItem::getSortOrder)
                .max()
                .orElse(-1) + 1;
        BudgetItem item = new BudgetItem();
        item.setUser(user);
        item.setCategory(request.category() == null ? "" : request.category().trim());
        item.setName(request.name().trim());
        item.setKind(request.kind() == null || request.kind().isBlank() ? "EXPENSE" : request.kind().trim().toUpperCase());
        item.setSortOrder(next);
        items.save(item);
        return toItemView(item, List.of());
    }

    @Transactional
    public FinanceDtos.WorkbookItemView updateItem(UUID userId, UUID itemId, FinanceDtos.ItemUpsert request) {
        BudgetItem item = items.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> ApiException.notFound("Line not found"));
        if (request.name() != null) {
            String name = request.name().trim();
            if (name.isEmpty()) {
                throw ApiException.badRequest("Name is required");
            }
            item.setName(name);
        }
        if (request.category() != null) {
            item.setCategory(request.category().trim());
        }
        if (request.kind() != null && !request.kind().isBlank()) {
            item.setKind(request.kind().trim().toUpperCase());
        }
        return toItemView(item, List.of());
    }

    @Transactional
    public void renameCategory(UUID userId, FinanceDtos.CategoryRename request) {
        String from = request.from() == null ? "" : request.from();
        String to = request.to() == null ? "" : request.to().trim();
        if (to.isEmpty()) {
            throw ApiException.badRequest("Category is required");
        }
        if (from.equals(to)) {
            return;
        }
        for (BudgetItem item : loadItems(userId)) {
            if (from.equals(item.getCategory())) {
                item.setCategory(to);
            }
        }
    }

    @Transactional
    public void deleteItem(UUID userId, UUID itemId) {
        BudgetItem item = items.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> ApiException.notFound("Line not found"));
        items.delete(item);
    }

    @Transactional
    public void saveCell(UUID userId, FinanceDtos.CellUpsert request) {
        BudgetItem item = items.findByIdAndUserId(request.itemId(), userId)
                .orElseThrow(() -> ApiException.notFound("Line not found"));
        if (request.month() == null || !request.month().matches("\\d{4}-\\d{2}")) {
            throw ApiException.badRequest("Month must be YYYY-MM");
        }
        BudgetAmount cell = item.getAmounts().stream()
                .filter(row -> request.month().equals(row.getYearMonth()))
                .findFirst()
                .orElse(null);
        if (request.amount() == null) {
            if (cell != null) {
                item.getAmounts().remove(cell);
            }
            return;
        }
        if (cell == null) {
            cell = new BudgetAmount();
            cell.setItem(item);
            cell.setYearMonth(request.month());
            item.getAmounts().add(cell);
        }
        cell.setAmount(request.amount());
    }

    private List<BudgetItem> loadItems(UUID userId) {
        List<BudgetItem> rows = new java.util.ArrayList<>(items.findByUserIdOrderBySortOrderAscNameAsc(userId));
        rows.sort(java.util.Comparator.comparingInt(BudgetItem::getSortOrder).thenComparing(BudgetItem::getName));
        return rows;
    }

    static String earliestAmountMonth(List<BudgetItem> rows) {
        return rows.stream()
                .flatMap(row -> row.getAmounts().stream())
                .map(BudgetAmount::getYearMonth)
                .filter(month -> month != null && !month.isBlank())
                .min(String::compareTo)
                .orElse(null);
    }

    static FinanceDtos.WorkbookView toWorkbook(List<BudgetItem> rows, List<String> months) {
        List<FinanceDtos.WorkbookItemView> views = rows.stream().map(row -> toItemView(row, months)).toList();
        java.util.Map<String, FinanceDtos.MonthTotal> totals = new java.util.LinkedHashMap<>();
        if (months.isEmpty()) {
            return new FinanceDtos.WorkbookView(months, views, totals);
        }
        String origin = earliestAmountMonth(rows);
        if (origin == null) {
            origin = months.getFirst();
        }
        String walkFrom = origin.compareTo(months.getFirst()) < 0 ? origin : months.getFirst();
        java.util.Set<String> visible = new java.util.HashSet<>(months);
        BigDecimal running = BigDecimal.ZERO;
        boolean passedOrigin = false;
        for (String month : monthsBetween(walkFrom, months.getLast())) {
            BigDecimal expenses = BigDecimal.ZERO;
            BigDecimal income = BigDecimal.ZERO;
            for (BudgetItem row : rows) {
                BigDecimal value = amountFor(row, month);
                if (value == null) {
                    continue;
                }
                if ("INCOME".equals(row.getKind())) {
                    income = income.add(value);
                } else {
                    expenses = expenses.add(value);
                }
            }
            BigDecimal balance = income.subtract(expenses);
            boolean isOrigin = month.equals(origin);
            if (isOrigin) {
                passedOrigin = true;
            } else if (passedOrigin) {
                running = running.add(balance);
            }
            if (visible.contains(month)) {
                totals.put(month, new FinanceDtos.MonthTotal(
                        expenses,
                        income,
                        balance,
                        isOrigin || !passedOrigin ? BigDecimal.ZERO : running
                ));
            }
        }
        return new FinanceDtos.WorkbookView(months, views, totals);
    }

    private static FinanceDtos.WorkbookItemView toItemView(BudgetItem item, List<String> months) {
        java.util.Map<String, BigDecimal> map = new java.util.LinkedHashMap<>();
        for (String month : months) {
            map.put(month, amountFor(item, month));
        }
        return new FinanceDtos.WorkbookItemView(
                item.getId(),
                item.getCategory(),
                item.getName(),
                item.getKind(),
                item.getSortOrder(),
                map
        );
    }

    private static BigDecimal amountFor(BudgetItem item, String month) {
        return item.getAmounts().stream()
                .filter(cell -> month.equals(cell.getYearMonth()))
                .map(BudgetAmount::getAmount)
                .findFirst()
                .orElse(null);
    }

    private static List<String> monthsBetween(String from, String to) {
        java.time.YearMonth start;
        java.time.YearMonth end;
        try {
            start = java.time.YearMonth.parse(from);
            end = java.time.YearMonth.parse(to);
        } catch (RuntimeException ex) {
            throw ApiException.badRequest("Month must be YYYY-MM");
        }
        if (end.isBefore(start)) {
            throw ApiException.badRequest("End month is before start month");
        }
        List<String> months = new java.util.ArrayList<>();
        java.time.YearMonth cursor = start;
        int guard = 0;
        while (!cursor.isAfter(end) && guard++ < 72) {
            months.add(cursor.toString());
            cursor = cursor.plusMonths(1);
        }
        return months;
    }
}
