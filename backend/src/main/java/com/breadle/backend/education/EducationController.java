package com.breadle.backend.education;

import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/education")
public class EducationController {

    private final EducationService educationService;
    private final UsuarioRepository usuarioRepository;

    public EducationController(EducationService educationService, UsuarioRepository usuarioRepository) {
        this.educationService = educationService;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/teacher-dashboard")
    public ResponseEntity<TeacherDashboardResponse> teacherDashboard() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        if (usuario.getTipo() != TipoUsuario.PROFESSOR && usuario.getTipo() != TipoUsuario.ADMINISTRADOR) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(educationService.buildTeacherDashboard());
    }
}
