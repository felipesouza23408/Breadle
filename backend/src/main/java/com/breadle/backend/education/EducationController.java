package com.breadle.backend.education;

import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
    public ResponseEntity<TeacherDashboardResponse> teacherDashboard(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        Usuario usuario = currentUser();
        if (usuario.getTipo() != TipoUsuario.PROFESSOR
            && usuario.getTipo() != TipoUsuario.ADMINISTRADOR) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (page < 0 || size < 1 || size > 50) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(educationService.buildTeacherDashboard(usuario, page, size));
    }

    @GetMapping("/classes")
    public ResponseEntity<List<TeacherClassDto>> listClasses() {
        Usuario usuario = currentUser();
        if (usuario.getTipo() != TipoUsuario.PROFESSOR) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(educationService.listClasses(usuario));
    }

    @PostMapping("/classes")
    public ResponseEntity<CreatedTeacherClassDto> createClass(
        @Valid @RequestBody CreateTeacherClassRequest request
    ) {
        Usuario usuario = currentUser();
        if (usuario.getTipo() != TipoUsuario.PROFESSOR) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(educationService.createClass(usuario, request.name()));
    }

    @PostMapping("/classes/join")
    public ResponseEntity<JoinTeacherClassResponse> joinClass(
        @Valid @RequestBody JoinTeacherClassRequest request
    ) {
        Usuario usuario = currentUser();
        if (usuario.getTipo() != TipoUsuario.LEITOR) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(educationService.joinClass(usuario, request.invitationCode()));
    }

    private Usuario currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return usuarioRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
    }
}
