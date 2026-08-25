package com.verax.finance;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MonthlyBudgetRepository extends JpaRepository<MonthlyBudget, UUID> {

    @EntityGraph(attributePaths = "lines")
    Optional<MonthlyBudget> findByUserIdAndYearMonth(UUID userId, String yearMonth);
}
