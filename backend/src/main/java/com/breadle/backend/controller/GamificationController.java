package com.breadle.backend.controller;

import com.breadle.backend.entity.Usuario;
import com.breadle.backend.gamification.GamificationDashboardResponse;
import com.breadle.backend.gamification.GamificationDashboardService;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/gamification")
public class GamificationController {

    private final GamificationDashboardService gamificationDashboardService;
    private final UsuarioRepository usuarioRepository;

    public GamificationController(GamificationDashboardService gamificationDashboardService,
                                 UsuarioRepository usuarioRepository) {
        this.gamificationDashboardService = gamificationDashboardService;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<GamificationDashboardResponse> dashboard() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        return ResponseEntity.ok(gamificationDashboardService.buildDashboard(usuario.getId()));
    }
}
