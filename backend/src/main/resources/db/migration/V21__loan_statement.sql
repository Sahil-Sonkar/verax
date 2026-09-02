ALTER TABLE finance_loans
    ADD COLUMN plan VARCHAR(16) NOT NULL DEFAULT 'EMI',
    ADD COLUMN principal_balance NUMERIC(14, 2),
    ADD COLUMN accrued_interest NUMERIC(14, 2),
    ADD COLUMN interest_as_of DATE,
    ADD COLUMN fee_refund NUMERIC(14, 2),
    ADD COLUMN fee_refund_until DATE,
    ADD COLUMN early_payoff_savings NUMERIC(14, 2);

CREATE TABLE finance_loan_installments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id     UUID NOT NULL REFERENCES finance_loans(id) ON DELETE CASCADE,
    due_date    DATE NOT NULL,
    amount      NUMERIC(14, 2) NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_finance_loan_installments_loan ON finance_loan_installments(loan_id, due_date);
