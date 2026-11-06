package com.breadle.backend.config;

import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import com.breadle.backend.service.JwtService;
import io.jsonwebtoken.JwtException;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class WebSocketAuthenticationInterceptor implements ChannelInterceptor {

    private static final Pattern NOTIFICATION_DESTINATION =
        Pattern.compile("^/topic/notifications/(\\d+)$");

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UsuarioRepository usuarioRepository;

    public WebSocketAuthenticationInterceptor(JwtService jwtService,
                                              UserDetailsService userDetailsService,
                                              UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command)) {
            authenticate(accessor);
            return MessageBuilder.createMessage(message.getPayload(), accessor.getMessageHeaders());
        }
        if (StompCommand.SUBSCRIBE.equals(command)) {
            authorizeSubscription(accessor);
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String authorization = accessor.getFirstNativeHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")
            || authorization.substring(7).isBlank()) {
            throw new MessageDeliveryException("Autenticação WebSocket obrigatória: envie o JWT no cabeçalho STOMP Authorization.");
        }

        String token = authorization.substring(7).trim();
        try {
            String username = jwtService.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (!jwtService.isTokenValid(token, userDetails)) {
                throw new MessageDeliveryException("JWT inválido ou expirado para a conexão WebSocket.");
            }
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
            accessor.setUser(authentication);
        } catch (JwtException | IllegalArgumentException | AuthenticationException exception) {
            throw new MessageDeliveryException("JWT inválido ou expirado para a conexão WebSocket.");
        }
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        Authentication authentication = authenticatedUser(accessor);
        String destination = accessor.getDestination();
        Matcher matcher = destination == null ? null : NOTIFICATION_DESTINATION.matcher(destination);
        if (matcher == null || !matcher.matches()) {
            throw new MessageDeliveryException("Assinatura STOMP não permitida; somente o tópico de notificações da própria conta está disponível.");
        }

        long requestedUserId;
        try {
            requestedUserId = Long.parseLong(matcher.group(1));
        } catch (NumberFormatException exception) {
            throw new MessageDeliveryException("Identificador inválido no tópico de notificações.");
        }

        Usuario user = usuarioRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new MessageDeliveryException("Identidade autenticada não encontrada."));
        if (user.getId() == null || user.getId() != requestedUserId) {
            throw new MessageDeliveryException("Assinatura negada: o tópico de notificações pertence a outra conta.");
        }
    }

    private Authentication authenticatedUser(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof Authentication authentication && authentication.isAuthenticated()) {
            return authentication;
        }
        throw new MessageDeliveryException("Assinatura STOMP exige uma conexão autenticada.");
    }
}
