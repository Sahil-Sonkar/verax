package com.verax.finance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface FinanceLoanPaymentRepository extends JpaRepository<FinanceLoanPayment, UUID> {

    List<FinanceLoanPayment> findByLoanIdOrderByDueDateDescCreatedAtDesc(UUID loanId);

    List<FinanceLoanPayment> findByLoanIdOrderByDueDateAscCreatedAtAsc(UUID loanId);

    boolean existsByLoanIdAndDueDate(UUID loanId, LocalDate dueDate);
}
