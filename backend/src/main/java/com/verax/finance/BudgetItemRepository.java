package com.verax.finance;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BudgetItemRepository extends JpaRepository<BudgetItem, UUID> {

    @Query("SELECT DISTINCT i FROM BudgetItem i LEFT JOIN FETCH i.amounts WHERE i.user.id = :userId")
    List<BudgetItem> findByUserIdOrderBySortOrderAscNameAsc(@Param("userId") UUID userId);

    @EntityGraph(attributePaths = "amounts")
    Optional<BudgetItem> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);
}
