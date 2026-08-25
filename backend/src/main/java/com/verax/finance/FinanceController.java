package com.verax.finance;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final FinanceService finance;
    private final CurrentUser currentUser;

    public FinanceController(FinanceService finance, CurrentUser currentUser) {
        this.finance = finance;
        this.currentUser = currentUser;
    }

    @GetMapping("/holdings")
    public List<FinanceDtos.HoldingView> holdings() {
        return finance.listHoldings(currentUser.id());
    }

    @PostMapping("/holdings")
    public FinanceDtos.HoldingView create(@RequestBody FinanceDtos.HoldingUpsert request) {
        return finance.createHolding(currentUser.id(), request);
    }

    @PatchMapping("/holdings/{id}")
    public FinanceDtos.HoldingView update(@PathVariable UUID id, @RequestBody FinanceDtos.HoldingUpsert request) {
        return finance.updateHolding(currentUser.id(), id, request);
    }

    @DeleteMapping("/holdings/{id}")
    public void delete(@PathVariable UUID id) {
        finance.deleteHolding(currentUser.id(), id);
    }

    @GetMapping("/budget")
    public FinanceDtos.BudgetView budget(@RequestParam(required = false) String month) {
        return finance.budget(currentUser.id(), month == null ? YearMonth.now().toString() : month);
    }

    @PutMapping("/budget")
    public FinanceDtos.BudgetView save(
            @RequestParam(required = false) String month,
            @Valid @RequestBody FinanceDtos.BudgetUpsert request
    ) {
        return finance.saveBudget(currentUser.id(), month == null ? YearMonth.now().toString() : month, request);
    }
}
