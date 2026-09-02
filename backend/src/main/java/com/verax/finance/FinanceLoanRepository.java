package com.verax.finance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinanceLoanRepository extends JpaRepository<FinanceLoan, UUID> {

    List<FinanceLoan> findByUserIdOrderByNameAsc(UUID userId);

    Optional<FinanceLoan> findByIdAndUserId(UUID id, UUID userId);
}
