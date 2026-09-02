package com.verax.train;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BodyProfileRepository extends JpaRepository<BodyProfile, UUID> {
}
