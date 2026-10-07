package com.breadle.backend.service;

import com.breadle.backend.dto.LoginRequest;
import com.breadle.backend.dto.LoginResponse;
import com.breadle.backend.dto.RegisterRequest;
import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager,
                       UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail().trim(), request.getSenha())
        );

        UserDetails principal = (UserDetails) authentication.getPrincipal();
        Usuario usuario = usuarioRepository.findByEmail(principal.getUsername())
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        String token = jwtService.generateToken(principal);
        return new LoginResponse(token, usuario.getNome(), usuario.getEmail(), usuario.getTipo().name());
    }

    public Optional<Usuario> register(RegisterRequest request) {
        String email = request.getEmail() == null ? null : request.getEmail().trim();
        String nome = request.getNome() == null ? null : request.getNome().trim();
        String senha = request.getSenha();
        TipoUsuario tipo = request.getTipo();

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("O e-mail é obrigatório.");
        }
        if (nome == null || nome.isBlank()) {
            throw new IllegalArgumentException("O nome é obrigatório.");
        }
        if (senha == null || senha.length() < 8) {
            throw new IllegalArgumentException("A senha deve ter no mínimo 8 caracteres.");
        }
        if (tipo == null) {
            throw new IllegalArgumentException("O tipo de usuário é obrigatório.");
        }
        if (usuarioRepository.findByEmail(email.toLowerCase(Locale.ROOT)).isPresent()) {
            throw new IllegalArgumentException("Já existe um usuário cadastrado com este e-mail.");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(nome);
        usuario.setEmail(email.toLowerCase(Locale.ROOT));
        usuario.setSenhaHash(passwordEncoder.encode(senha));
        usuario.setTipo(tipo);
        usuario.setAtivo(true);
        return Optional.of(usuarioRepository.save(usuario));
    }
}
