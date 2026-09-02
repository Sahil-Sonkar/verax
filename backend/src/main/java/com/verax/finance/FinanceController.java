package com.verax.finance;

import com.verax.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final FinanceService finance;
    private final FinanceBooksService books;
    private final CurrentUser currentUser;

    public FinanceController(FinanceService finance, FinanceBooksService books, CurrentUser currentUser) {
        this.finance = finance;
        this.books = books;
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

    @GetMapping("/workbook")
    public FinanceDtos.WorkbookView workbook(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        return finance.workbook(
                currentUser.id(),
                from == null ? "2027-01" : from,
                to == null ? "2027-12" : to
        );
    }

    @PostMapping("/workbook/items")
    public FinanceDtos.WorkbookItemView addItem(@RequestBody FinanceDtos.ItemUpsert request) {
        return finance.addItem(currentUser.id(), request);
    }

    @PatchMapping("/workbook/items/{id}")
    public FinanceDtos.WorkbookItemView updateItem(
            @PathVariable UUID id,
            @RequestBody FinanceDtos.ItemUpsert request
    ) {
        return finance.updateItem(currentUser.id(), id, request);
    }

    @PatchMapping("/workbook/category")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void renameCategory(@RequestBody FinanceDtos.CategoryRename request) {
        finance.renameCategory(currentUser.id(), request);
    }

    @DeleteMapping("/workbook/items/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@PathVariable UUID id) {
        finance.deleteItem(currentUser.id(), id);
    }

    @PatchMapping("/workbook/cell")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveCell(@RequestBody FinanceDtos.CellUpsert request) {
        finance.saveCell(currentUser.id(), request);
    }

    @GetMapping("/accounts")
    public List<FinanceDtos.AccountView> accounts() {
        return books.listAccounts(currentUser.id());
    }

    @PostMapping("/accounts")
    public FinanceDtos.AccountView createAccount(@RequestBody FinanceDtos.AccountUpsert request) {
        return books.saveAccount(currentUser.id(), null, request);
    }

    @PatchMapping("/accounts/{id}")
    public FinanceDtos.AccountView updateAccount(@PathVariable UUID id, @RequestBody FinanceDtos.AccountUpsert request) {
        return books.saveAccount(currentUser.id(), id, request);
    }

    @DeleteMapping("/accounts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@PathVariable UUID id) {
        books.deleteAccount(currentUser.id(), id);
    }

    @GetMapping("/loans")
    public List<FinanceDtos.LoanView> loans() {
        return books.listLoans(currentUser.id());
    }

    @PostMapping("/loans")
    public FinanceDtos.LoanView createLoan(@RequestBody FinanceDtos.LoanUpsert request) {
        return books.saveLoan(currentUser.id(), null, request);
    }

    @PatchMapping("/loans/{id}")
    public FinanceDtos.LoanView updateLoan(@PathVariable UUID id, @RequestBody FinanceDtos.LoanUpsert request) {
        return books.saveLoan(currentUser.id(), id, request);
    }

    @DeleteMapping("/loans/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLoan(@PathVariable UUID id) {
        books.deleteLoan(currentUser.id(), id);
    }

    @PostMapping("/loans/{id}/pay")
    public FinanceDtos.LoanView payLoan(@PathVariable UUID id) {
        return books.payLoan(currentUser.id(), id);
    }

    @PostMapping("/loans/{id}/skip")
    public FinanceDtos.LoanView skipLoan(@PathVariable UUID id) {
        return books.skipLoan(currentUser.id(), id);
    }

    @PostMapping("/loans/{id}/payments")
    public FinanceDtos.LoanView addPayment(@PathVariable UUID id, @RequestBody FinanceDtos.LoanPaymentUpsert request) {
        return books.addPayment(currentUser.id(), id, request);
    }

    @PatchMapping("/loans/{loanId}/payments/{paymentId}")
    public FinanceDtos.LoanView updatePayment(
            @PathVariable UUID loanId,
            @PathVariable UUID paymentId,
            @RequestBody FinanceDtos.LoanPaymentUpsert request
    ) {
        return books.updatePayment(currentUser.id(), loanId, paymentId, request);
    }

    @DeleteMapping("/loans/{loanId}/payments/{paymentId}")
    public FinanceDtos.LoanView deletePayment(@PathVariable UUID loanId, @PathVariable UUID paymentId) {
        return books.deletePayment(currentUser.id(), loanId, paymentId);
    }

    @PostMapping("/loans/{id}/installments")
    public FinanceDtos.LoanView addInstallment(@PathVariable UUID id, @RequestBody FinanceDtos.InstallmentUpsert request) {
        return books.addInstallment(currentUser.id(), id, request);
    }

    @PatchMapping("/loans/{loanId}/installments/{installmentId}")
    public FinanceDtos.LoanView updateInstallment(
            @PathVariable UUID loanId,
            @PathVariable UUID installmentId,
            @RequestBody FinanceDtos.InstallmentUpsert request
    ) {
        return books.updateInstallment(currentUser.id(), loanId, installmentId, request);
    }

    @DeleteMapping("/loans/{loanId}/installments/{installmentId}")
    public FinanceDtos.LoanView deleteInstallment(@PathVariable UUID loanId, @PathVariable UUID installmentId) {
        return books.deleteInstallment(currentUser.id(), loanId, installmentId);
    }

    @GetMapping("/tax")
    public List<FinanceDtos.TaxItemView> tax(@RequestParam(required = false) Integer year) {
        return books.listTax(currentUser.id(), year == null ? java.time.LocalDate.now().getYear() : year);
    }

    @PostMapping("/tax")
    public FinanceDtos.TaxItemView createTax(@RequestBody FinanceDtos.TaxItemUpsert request) {
        return books.saveTax(currentUser.id(), null, request);
    }

    @PatchMapping("/tax/{id}")
    public FinanceDtos.TaxItemView updateTax(@PathVariable UUID id, @RequestBody FinanceDtos.TaxItemUpsert request) {
        return books.saveTax(currentUser.id(), id, request);
    }

    @DeleteMapping("/tax/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTax(@PathVariable UUID id) {
        books.deleteTax(currentUser.id(), id);
    }

    @GetMapping("/tax/compare")
    public FinanceDtos.TaxCompareView compare(
            @RequestParam(required = false) Integer year,
            @RequestParam java.math.BigDecimal income
    ) {
        return books.compareTax(currentUser.id(), year == null ? java.time.LocalDate.now().getYear() : year, income);
    }

    @GetMapping("/portfolio")
    public FinanceDtos.PortfolioView portfolio() {
        return books.portfolio(currentUser.id());
    }

    @GetMapping("/quote")
    public FinanceDtos.QuoteView quote(@RequestParam String kind, @RequestParam String q) {
        return books.quote(kind, q);
    }
}
