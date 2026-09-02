CREATE TABLE finance_loan_payments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id            UUID NOT NULL REFERENCES finance_loans(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    due_date           DATE NOT NULL,
    kind               VARCHAR(16) NOT NULL,
    source             VARCHAR(16) NOT NULL,
    emi                NUMERIC(14, 2) NOT NULL DEFAULT 0,
    interest           NUMERIC(14, 2) NOT NULL DEFAULT 0,
    principal          NUMERIC(14, 2) NOT NULL DEFAULT 0,
    outstanding_after  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_loan_payments_loan ON finance_loan_payments(loan_id, due_date DESC, created_at DESC);
