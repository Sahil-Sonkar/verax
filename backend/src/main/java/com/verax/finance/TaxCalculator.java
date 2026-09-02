package com.verax.finance;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public final class TaxCalculator {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal CESS = new BigDecimal("0.04");

    private TaxCalculator() {
    }

    public record Compare(
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
            BigDecimal otherDeductions
    ) {
    }

    public static Compare compare(BigDecimal income, List<FinanceTaxItem> items) {
        BigDecimal gross = nvl(income);
        BigDecimal eightyC = ZERO;
        BigDecimal otherOld = ZERO;
        for (FinanceTaxItem item : items) {
            BigDecimal amount = nvl(item.getAmount());
            if (is80c(item.getKind())) {
                eightyC = eightyC.add(amount);
            } else if (!"NONE".equalsIgnoreCase(blank(item.getKind()))) {
                otherOld = otherOld.add(amount);
            }
        }
        eightyC = eightyC.min(new BigDecimal("150000"));

        BigDecimal oldStd = new BigDecimal("50000");
        BigDecimal oldTaxable = gross.subtract(oldStd).subtract(eightyC).subtract(otherOld).max(ZERO);
        BigDecimal oldBase = oldSlab(oldTaxable);
        if (gross.compareTo(new BigDecimal("500000")) <= 0) {
            oldBase = ZERO;
        }
        BigDecimal oldCess = oldBase.multiply(CESS).setScale(0, RoundingMode.HALF_UP);
        BigDecimal oldTotal = oldBase.add(oldCess);

        BigDecimal newStd = new BigDecimal("75000");
        BigDecimal newTaxable = gross.subtract(newStd).max(ZERO);
        BigDecimal newBase = newSlab(newTaxable);
        if (gross.compareTo(new BigDecimal("1200000")) <= 0) {
            newBase = ZERO;
        }
        BigDecimal newCess = newBase.multiply(CESS).setScale(0, RoundingMode.HALF_UP);
        BigDecimal newTotal = newBase.add(newCess);

        String cheaper = oldTotal.compareTo(newTotal) < 0 ? "OLD" : newTotal.compareTo(oldTotal) < 0 ? "NEW" : "SAME";
        return new Compare(
                gross,
                oldTaxable,
                newTaxable,
                oldBase,
                newBase,
                oldCess,
                newCess,
                oldTotal,
                newTotal,
                cheaper,
                eightyC,
                otherOld
        );
    }

    static boolean is80c(String kind) {
        String key = blank(kind).toUpperCase();
        return key.equals("LIC") || key.equals("ELSS") || key.equals("PPF") || key.equals("EPF")
                || key.equals("80C") || key.equals("NPS_80C");
    }

    static BigDecimal oldSlab(BigDecimal taxable) {
        return slab(taxable, List.of(
                new long[]{0, 250000, 0},
                new long[]{250000, 500000, 5},
                new long[]{500000, 1000000, 20},
                new long[]{1000000, Long.MAX_VALUE, 30}
        ));
    }

    static BigDecimal newSlab(BigDecimal taxable) {
        return slab(taxable, List.of(
                new long[]{0, 400000, 0},
                new long[]{400000, 800000, 5},
                new long[]{800000, 1200000, 10},
                new long[]{1200000, 1600000, 15},
                new long[]{1600000, 2000000, 20},
                new long[]{2000000, 2400000, 25},
                new long[]{2400000, Long.MAX_VALUE, 30}
        ));
    }

    private static BigDecimal slab(BigDecimal taxable, List<long[]> bands) {
        BigDecimal tax = ZERO;
        BigDecimal remaining = taxable;
        for (long[] band : bands) {
            BigDecimal width = BigDecimal.valueOf(band[1] - band[0]);
            BigDecimal slice = remaining.min(width).max(ZERO);
            tax = tax.add(slice.multiply(BigDecimal.valueOf(band[2])).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
            remaining = remaining.subtract(slice);
        }
        return tax.setScale(0, RoundingMode.HALF_UP);
    }

    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? ZERO : value;
    }

    private static String blank(String value) {
        return value == null ? "" : value;
    }
}
