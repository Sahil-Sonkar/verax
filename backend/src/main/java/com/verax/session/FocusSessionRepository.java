package com.verax.session;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface FocusSessionRepository extends JpaRepository<FocusSession, UUID> {

    @Query("""
            select s from FocusSession s
            left join fetch s.habit
            where s.user.id = :userId and s.date = :date
            order by s.createdAt
            """)
    List<FocusSession> findByUserIdAndDateOrderByCreatedAtAsc(@Param("userId") UUID userId, @Param("date") LocalDate date);
}
