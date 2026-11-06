package com.breadle.backend.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WebSocketConfigTest {

    @Test
    void allowsConfiguredFrontendAndLocalDevelopmentOriginsWithoutWildcard() {
        List<String> origins = WebSocketConfig.resolveAllowedOrigins("http://localhost:4200");

        assertTrue(origins.contains("http://localhost:4200"));
        assertTrue(origins.contains("http://127.0.0.1:3000"));
        assertFalse(origins.contains("*"));
    }

    @Test
    void productionConfigurationDoesNotAllowUnconfiguredOrLocalOrigins() {
        List<String> origins = WebSocketConfig.resolveAllowedOrigins("https://app.example.com/path");

        assertTrue(origins.contains("https://app.example.com"));
        assertFalse(origins.contains("https://attacker.example.com"));
        assertFalse(origins.contains("http://localhost:4200"));
        assertFalse(origins.contains("*"));
    }

    @Test
    void rejectsWildcardOriginConfiguration() {
        assertThrows(IllegalArgumentException.class,
            () -> WebSocketConfig.resolveAllowedOrigins("*"));
    }
}
