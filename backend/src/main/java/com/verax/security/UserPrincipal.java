package com.verax.security;

import java.util.UUID;

public record UserPrincipal(UUID id, String email, String name) {
}
