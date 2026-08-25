package com.verax.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByAuthProviderAndProviderSubject(String authProvider, String providerSubject);

    boolean existsByEmailIgnoreCase(String email);
}
