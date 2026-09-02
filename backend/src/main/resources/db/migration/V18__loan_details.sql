ALTER TABLE finance_loans
    ADD COLUMN tenure_months INTEGER,
    ADD COLUMN next_due_date DATE,
    ADD COLUMN term_months INTEGER,
    ADD COLUMN disbursed NUMERIC(14, 2),
    ADD COLUMN current_roi NUMERIC(6, 2),
    ADD COLUMN repayment_mode VARCHAR(32);
