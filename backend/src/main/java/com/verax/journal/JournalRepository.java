package com.verax.journal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JournalRepository extends JpaRepository<JournalEntry, UUID> {

    Optional<JournalEntry> findByUserIdAndDate(UUID userId, LocalDate date);

    List<JournalEntry> findByUserIdAndDateBetweenOrderByDateDesc(UUID userId, LocalDate start, LocalDate end);
}
