package com.verax.calendar;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GoogleCalendarAccountRepository extends JpaRepository<GoogleCalendarAccount, UUID> {
}
