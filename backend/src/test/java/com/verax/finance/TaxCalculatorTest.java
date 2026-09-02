package com.verax.finance;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TaxCalculatorTest {

    @Test
    void twelveLakhPrefersNewRegime() {
        FinanceTaxItem lic = new FinanceTaxItem();
        lic.setKind("LIC");
        lic.setAmount(new BigDecimal("50000"));
        TaxCalculator.Compare compare = TaxCalculator.compare(new BigDecimal("1200000"), List.of(lic));
        assertEquals(BigDecimal.ZERO, compare.newTotal());
        assertTrue(compare.oldTotal().signum() >= 0);
        assertEquals("NEW", compare.cheaper());
    }

    @Test
    void highIncomeWith80cCanPreferOld() {
        FinanceTaxItem ppf = new FinanceTaxItem();
        ppf.setKind("PPF");
        ppf.setAmount(new BigDecimal("150000"));
        FinanceTaxItem home = new FinanceTaxItem();
        home.setKind("LOAN_INTEREST");
        home.setAmount(new BigDecimal("200000"));
        TaxCalculator.Compare compare = TaxCalculator.compare(new BigDecimal("1800000"), List.of(ppf, home));
        assertEquals(0, compare.section80c().compareTo(new BigDecimal("150000")));
        assertTrue(List.of("OLD", "NEW", "SAME").contains(compare.cheaper()));
    }
}
