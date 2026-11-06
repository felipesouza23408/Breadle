package com.breadle.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthenticationInterceptor authenticationInterceptor;

    @Value("${breadle.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    public WebSocketConfig(WebSocketAuthenticationInterceptor authenticationInterceptor) {
        this.authenticationInterceptor = authenticationInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOrigins(resolveAllowedOrigins(frontendUrl).toArray(String[]::new))
            .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authenticationInterceptor);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    static List<String> resolveAllowedOrigins(String configuredFrontendUrls) {
        if (configuredFrontendUrls == null || configuredFrontendUrls.isBlank()) {
            throw new IllegalArgumentException("breadle.frontend-url deve informar ao menos uma origem.");
        }

        Set<String> origins = new LinkedHashSet<>();
        boolean localDevelopment = false;
        for (String configuredUrl : configuredFrontendUrls.split(",")) {
            if (configuredUrl.isBlank()) {
                continue;
            }
            String origin = toOrigin(configuredUrl.trim());
            origins.add(origin);
            URI uri = URI.create(origin);
            String host = uri.getHost().toLowerCase(Locale.ROOT);
            localDevelopment |= "http".equals(uri.getScheme())
                && ("localhost".equals(host) || "127.0.0.1".equals(host));
        }

        if (origins.isEmpty()) {
            throw new IllegalArgumentException("breadle.frontend-url deve informar ao menos uma origem válida.");
        }
        if (localDevelopment) {
            origins.addAll(List.of(
                "http://localhost:4200",
                "http://127.0.0.1:4200",
                "http://localhost:3000",
                "http://127.0.0.1:3000"
            ));
        }
        return new ArrayList<>(origins);
    }

    private static String toOrigin(String configuredUrl) {
        URI uri;
        try {
            uri = URI.create(configuredUrl);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Origem WebSocket inválida em breadle.frontend-url.", exception);
        }
        String scheme = uri.getScheme();
        if (scheme == null || uri.getHost() == null || uri.getRawUserInfo() != null
            || uri.getRawQuery() != null || uri.getRawFragment() != null
            || !("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))) {
            throw new IllegalArgumentException("Origem WebSocket inválida em breadle.frontend-url.");
        }

        StringBuilder origin = new StringBuilder(scheme.toLowerCase(Locale.ROOT))
            .append("://")
            .append(uri.getHost().toLowerCase(Locale.ROOT));
        if (uri.getPort() >= 0) {
            origin.append(':').append(uri.getPort());
        }
        return origin.toString();
    }
}
