package com.breadle.backend.config;

import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import com.breadle.backend.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.security.Principal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthenticationInterceptorTest {

    private static final String EMAIL = "reader@example.com";
    private static final String TOKEN = "valid.jwt";
    private static final long USER_ID = 42L;

    @Mock
    private JwtService jwtService;
    @Mock
    private UserDetailsService userDetailsService;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private MessageChannel channel;

    private WebSocketAuthenticationInterceptor interceptor;
    private UserDetails userDetails;
    private Usuario user;

    @BeforeEach
    void setUp() {
        interceptor = new WebSocketAuthenticationInterceptor(jwtService, userDetailsService, usuarioRepository);
        userDetails = User.withUsername(EMAIL).password("unused").roles("LEITOR").build();
        user = new Usuario();
        user.setId(USER_ID);
        user.setEmail(EMAIL);
    }

    @Test
    void rejectsConnectWithoutJwt() {
        MessageDeliveryException exception = assertThrows(MessageDeliveryException.class,
            () -> interceptor.preSend(stompMessage(StompCommand.CONNECT, null, null), channel));

        assertTrue(exception.getMessage().contains("JWT"));
    }

    @Test
    void acceptsSubscriptionToAuthenticatedUsersNotificationTopic() {
        authenticate();
        Message<?> connected = interceptor.preSend(
            stompMessage(StompCommand.CONNECT, null, "Bearer " + TOKEN), channel);
        StompHeaderAccessor connectedAccessor = StompHeaderAccessor.wrap(connected);
        Message<?> subscription = stompMessage(StompCommand.SUBSCRIBE,
            "/topic/notifications/" + USER_ID, null, connectedAccessor.getUser());

        assertDoesNotThrow(() -> interceptor.preSend(subscription, channel));
    }

    @Test
    void rejectsSubscriptionToAnotherUsersNotificationTopic() {
        authenticate();
        Message<?> connected = interceptor.preSend(
            stompMessage(StompCommand.CONNECT, null, "Bearer " + TOKEN), channel);
        StompHeaderAccessor connectedAccessor = StompHeaderAccessor.wrap(connected);
        Message<?> subscription = stompMessage(StompCommand.SUBSCRIBE,
            "/topic/notifications/" + (USER_ID + 1), null, connectedAccessor.getUser());

        MessageDeliveryException exception = assertThrows(MessageDeliveryException.class,
            () -> interceptor.preSend(subscription, channel));

        assertTrue(exception.getMessage().contains("outra conta"));
    }

    private void authenticate() {
        when(jwtService.extractUsername(TOKEN)).thenReturn(EMAIL);
        when(userDetailsService.loadUserByUsername(EMAIL)).thenReturn(userDetails);
        when(jwtService.isTokenValid(TOKEN, userDetails)).thenReturn(true);
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
    }

    private Message<?> stompMessage(StompCommand command, String destination, String authorization) {
        return stompMessage(command, destination, authorization, null);
    }

    private Message<?> stompMessage(StompCommand command,
                                    String destination,
                                    String authorization,
                                    Principal principal) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (authorization != null) {
            accessor.setNativeHeader("Authorization", authorization);
        }
        if (principal != null) {
            accessor.setUser(principal);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
