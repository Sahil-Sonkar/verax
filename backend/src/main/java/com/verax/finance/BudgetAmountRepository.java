package com.verax.finance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BudgetAmountRepository extends JpaRepository<BudgetAmount, UUID> {

    Optional<BudgetAmount> findByItemIdAndYearMonth(UUID itemId, String yearMonth);
}
