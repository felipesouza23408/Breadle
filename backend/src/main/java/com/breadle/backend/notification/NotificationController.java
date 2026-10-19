package com.breadle.backend.notification;

import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UsuarioRepository usuarioRepository;

    public NotificationController(NotificationService notificationService, UsuarioRepository usuarioRepository) {
        this.notificationService = notificationService;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> list() {
        Long userId = currentUserId();
        return ResponseEntity.ok(notificationService.listForUser(userId));
    }

    @PostMapping("/read")
    public ResponseEntity<String> markAllAsRead() {
        Long userId = currentUserId();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok("Notificações marcadas como lidas.");
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("Usuário não autenticado.");
        }

        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
        return usuario.getId();
    }
}
