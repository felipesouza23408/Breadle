package com.breadle.backend.controller;

import com.breadle.backend.dto.LoginRequest;
import com.breadle.backend.dto.LoginResponse;
import com.breadle.backend.dto.ForgotPasswordRequest;
import com.breadle.backend.dto.RegisterRequest;
import com.breadle.backend.dto.ResetPasswordRequest;
import com.breadle.backend.dto.UpdateProfileRequest;
import com.breadle.backend.dto.UserProfileResponse;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import com.breadle.backend.service.AuthService;
import com.breadle.backend.service.EmailDeliveryException;
import com.breadle.backend.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final UsuarioRepository usuarioRepository;

    public AuthController(AuthService authService, PasswordResetService passwordResetService, UsuarioRepository usuarioRepository) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(Map.of("message", "Conta criada com sucesso."));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<Map<String, String>> requestPasswordReset(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            passwordResetService.requestReset(request);
        } catch (EmailDeliveryException exception) {
            // Keep the same response for known and unknown addresses to prevent account discovery.
        }
        return ResponseEntity.accepted().body(Map.of(
            "message",
            "Se este e-mail estiver cadastrado, enviaremos um link de redefinição. Verifique também sua pasta de spam."
        ));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Senha redefinida com sucesso. Você já pode entrar."));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me() {
        Usuario usuario = currentUser();
        return ResponseEntity.ok(toProfileResponse(usuario));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        Usuario usuario = currentUser();
        Usuario updated = authService.updateProfile(usuario.getEmail(), request);
        return ResponseEntity.ok(toProfileResponse(updated));
    }

    private Usuario currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
    }

    private UserProfileResponse toProfileResponse(Usuario usuario) {
        return new UserProfileResponse(
            usuario.getId(),
            usuario.getNome(),
            usuario.getEmail(),
            usuario.getTipo().name(),
            usuario.getPontosTotais() == null ? 0 : usuario.getPontosTotais(),
            usuario.getApelido() == null || usuario.getApelido().isBlank() ? usuario.getNome() : usuario.getApelido(),
            usuario.getBiografia() == null || usuario.getBiografia().isBlank() ? "Leitor atento em busca de novas histórias e discussões sobre livros." : usuario.getBiografia(),
            usuario.getFotoUrl(),
            usuario.getGenero() == null || usuario.getGenero().isBlank() ? "Não informado" : usuario.getGenero(),
            usuario.getGeneroLiterarioFavorito() == null || usuario.getGeneroLiterarioFavorito().isBlank() ? "Não informado" : usuario.getGeneroLiterarioFavorito()
        );
    }
}
