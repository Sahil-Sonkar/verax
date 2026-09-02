package com.verax.finance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinanceLoanInstallmentRepository extends JpaRepository<FinanceLoanInstallment, UUID> {

    List<FinanceLoanInstallment> findByLoanIdOrderByDueDateAscSortOrderAsc(UUID loanId);

    Optional<FinanceLoanInstallment> findByIdAndLoanId(UUID id, UUID loanId);

    void deleteByLoanId(UUID loanId);
}
