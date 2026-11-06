package com.breadle.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    @Test
    void rejectsSecretShorterThan256BitsAtConstruction() {
        String secret = "too-short-secret";

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> new JwtService(secret, 60_000)
        );

        assertTrue(exception.getMessage().contains("jwt.secret"));
        assertTrue(exception.getMessage().contains("256 bits"));
        assertTrue(exception.getMessage().contains("32 bytes"));
        assertFalse(exception.getMessage().contains(secret));
    }

    @Test
    void acceptsSecretOfAtLeast256BitsAndSignsTokens() {
        JwtService jwtService = new JwtService("12345678901234567890123456789012", 60_000);
        UserDetails user = User.withUsername("reader@example.com")
            .password("unused")
            .roles("LEITOR")
            .build();

        String token = jwtService.generateToken(user);

        assertEquals("reader@example.com", jwtService.extractUsername(token));
    }
}
