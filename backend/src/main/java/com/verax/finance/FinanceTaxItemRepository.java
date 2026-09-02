package com.verax.finance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinanceTaxItemRepository extends JpaRepository<FinanceTaxItem, UUID> {

    List<FinanceTaxItem> findByUserIdAndTaxYearOrderByNameAsc(UUID userId, int taxYear);

    Optional<FinanceTaxItem> findByIdAndUserId(UUID id, UUID userId);
}
