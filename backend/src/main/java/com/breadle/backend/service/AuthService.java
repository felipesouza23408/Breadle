package com.breadle.backend.service;

import com.breadle.backend.dto.LoginRequest;
import com.breadle.backend.dto.LoginResponse;
import com.breadle.backend.dto.RegisterRequest;
import com.breadle.backend.dto.UpdateProfileRequest;
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
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase(Locale.ROOT);
        String senha = request.getSenha();

        if (email.isBlank()) {
            throw new IllegalArgumentException("O e-mail é obrigatório.");
        }

        Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("E-mail não encontrado."));

        if (senha == null || senha.isBlank()) {
            throw new IllegalArgumentException("A senha é obrigatória.");
        }

        if (!passwordEncoder.matches(senha, usuario.getSenhaHash())) {
            throw new IllegalArgumentException("Senha incorreta.");
        }

        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(email, senha)
        );

        UserDetails principal = (UserDetails) authentication.getPrincipal();
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
        if (senha == null || !senha.matches("^(?=.*[A-Z])(?=.*\\d)[A-Za-z0-9]{8,}$")) {
            throw new IllegalArgumentException("A senha deve ter pelo menos 8 caracteres, incluir ao menos uma letra maiúscula, ao menos um número e usar apenas caracteres alfanuméricos.");
        }
        if (tipo == null) {
            throw new IllegalArgumentException("O tipo de usuário é obrigatório.");
        }
        if (tipo == TipoUsuario.ADMINISTRADOR) {
            throw new IllegalArgumentException("Tipo de usuário não permitido no cadastro.");
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

    public Usuario updateProfile(String email, UpdateProfileRequest request) {
        Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("E-mail não encontrado."));

        if (request == null) {
            return usuario;
        }

        usuario.setApelido(normalizeField(request.getApelido(), usuario.getApelido(), 80));
        usuario.setBiografia(normalizeField(request.getBiografia(), usuario.getBiografia(), 500));
        usuario.setFotoUrl(normalizeField(request.getFotoUrl(), usuario.getFotoUrl(), 255));
        usuario.setGenero(normalizeField(request.getGenero(), usuario.getGenero(), 40));
        usuario.setGeneroLiterarioFavorito(normalizeField(request.getGeneroLiterarioFavorito(), usuario.getGeneroLiterarioFavorito(), 80));

        return usuarioRepository.save(usuario);
    }

    private String normalizeField(String value, String currentValue, int maxLength) {
        if (value == null) {
            return currentValue;
        }

        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException("Campo com tamanho acima do permitido.");
        }
        return normalized;
    }
}
