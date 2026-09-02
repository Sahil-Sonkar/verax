package com.verax.finance;

import com.verax.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "finance_loans")
public class FinanceLoan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 24)
    private String kind = "PERSONAL";

    @Column(nullable = false)
    private BigDecimal principal = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal remaining = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal emi = BigDecimal.ZERO;

    private BigDecimal rate;

    @Column(name = "tenure_months")
    private Integer tenureMonths;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Column(name = "term_months")
    private Integer termMonths;

    private BigDecimal disbursed;

    @Column(name = "current_roi")
    private BigDecimal currentRoi;

    @Column(name = "repayment_mode", length = 32)
    private String repaymentMode;

    @Column(name = "origin_balance")
    private BigDecimal originBalance;

    @Column(nullable = false, length = 16)
    private String plan = "EMI";

    @Column(name = "principal_balance")
    private BigDecimal principalBalance;

    @Column(name = "accrued_interest")
    private BigDecimal accruedInterest;

    @Column(name = "interest_as_of")
    private LocalDate interestAsOf;

    @Column(name = "fee_refund")
    private BigDecimal feeRefund;

    @Column(name = "fee_refund_until")
    private LocalDate feeRefundUntil;

    @Column(name = "early_payoff_savings")
    private BigDecimal earlyPayoffSavings;

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public BigDecimal getPrincipal() {
        return principal;
    }

    public void setPrincipal(BigDecimal principal) {
        this.principal = principal;
    }

    public BigDecimal getRemaining() {
        return remaining;
    }

    public void setRemaining(BigDecimal remaining) {
        this.remaining = remaining;
    }

    public BigDecimal getEmi() {
        return emi;
    }

    public void setEmi(BigDecimal emi) {
        this.emi = emi;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public void setRate(BigDecimal rate) {
        this.rate = rate;
    }

    public Integer getTenureMonths() {
        return tenureMonths;
    }

    public void setTenureMonths(Integer tenureMonths) {
        this.tenureMonths = tenureMonths;
    }

    public LocalDate getNextDueDate() {
        return nextDueDate;
    }

    public void setNextDueDate(LocalDate nextDueDate) {
        this.nextDueDate = nextDueDate;
    }

    public Integer getTermMonths() {
        return termMonths;
    }

    public void setTermMonths(Integer termMonths) {
        this.termMonths = termMonths;
    }

    public BigDecimal getDisbursed() {
        return disbursed;
    }

    public void setDisbursed(BigDecimal disbursed) {
        this.disbursed = disbursed;
    }

    public BigDecimal getCurrentRoi() {
        return currentRoi;
    }

    public void setCurrentRoi(BigDecimal currentRoi) {
        this.currentRoi = currentRoi;
    }

    public String getRepaymentMode() {
        return repaymentMode;
    }

    public void setRepaymentMode(String repaymentMode) {
        this.repaymentMode = repaymentMode;
    }

    public BigDecimal getOriginBalance() {
        return originBalance;
    }

    public void setOriginBalance(BigDecimal originBalance) {
        this.originBalance = originBalance;
    }

    public String getPlan() {
        return plan;
    }

    public void setPlan(String plan) {
        this.plan = plan;
    }

    public BigDecimal getPrincipalBalance() {
        return principalBalance;
    }

    public void setPrincipalBalance(BigDecimal principalBalance) {
        this.principalBalance = principalBalance;
    }

    public BigDecimal getAccruedInterest() {
        return accruedInterest;
    }

    public void setAccruedInterest(BigDecimal accruedInterest) {
        this.accruedInterest = accruedInterest;
    }

    public LocalDate getInterestAsOf() {
        return interestAsOf;
    }

    public void setInterestAsOf(LocalDate interestAsOf) {
        this.interestAsOf = interestAsOf;
    }

    public BigDecimal getFeeRefund() {
        return feeRefund;
    }

    public void setFeeRefund(BigDecimal feeRefund) {
        this.feeRefund = feeRefund;
    }

    public LocalDate getFeeRefundUntil() {
        return feeRefundUntil;
    }

    public void setFeeRefundUntil(LocalDate feeRefundUntil) {
        this.feeRefundUntil = feeRefundUntil;
    }

    public BigDecimal getEarlyPayoffSavings() {
        return earlyPayoffSavings;
    }

    public void setEarlyPayoffSavings(BigDecimal earlyPayoffSavings) {
        this.earlyPayoffSavings = earlyPayoffSavings;
    }
}
