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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;

@Service
public class AuthService {
    private static final String DUMMY_PASSWORD_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    private static final String INVALID_CREDENTIALS_MESSAGE = "Credenciais inválidas.";

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GuardianConsentService guardianConsentService;

    public AuthService(AuthenticationManager authenticationManager,
                       UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       GuardianConsentService guardianConsentService) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.guardianConsentService = guardianConsentService;
    }

    public LoginResponse login(LoginRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase(Locale.ROOT);
        String senha = request.getSenha();

        if (email.isBlank()) {
            throw new IllegalArgumentException("O e-mail é obrigatório.");
        }

        if (senha == null || senha.isBlank()) {
            throw new IllegalArgumentException("A senha é obrigatória.");
        }

        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);
        if (usuario == null) {
            passwordEncoder.matches(senha, DUMMY_PASSWORD_HASH);
            throw new IllegalArgumentException(INVALID_CREDENTIALS_MESSAGE);
        }

        if (!passwordEncoder.matches(senha, usuario.getSenhaHash())) {
            throw new IllegalArgumentException(INVALID_CREDENTIALS_MESSAGE);
        }
        if (Boolean.TRUE.equals(usuario.getConsentimentoResponsavelPendente())) {
            throw new IllegalArgumentException("A conta aguarda a confirmação do responsável por e-mail.");
        }

        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(email, senha)
        );

        UserDetails principal = (UserDetails) authentication.getPrincipal();
        String token = jwtService.generateToken(principal);
        return new LoginResponse(token, usuario.getNome(), usuario.getEmail(), usuario.getTipo().name());
    }

    @Transactional
    public RegistrationResult register(RegisterRequest request) {
        String email = request.getEmail() == null ? null : request.getEmail().trim();
        String nome = request.getNome() == null ? null : request.getNome().trim();
        String senha = request.getSenha();
        LocalDate dataNascimento = request.getDataNascimento();

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("O e-mail é obrigatório.");
        }
        if (nome == null || nome.isBlank()) {
            throw new IllegalArgumentException("O nome é obrigatório.");
        }
        if (senha == null || !senha.matches("^(?=.*[A-Z])(?=.*\\d)[A-Za-z0-9]{8,}$")) {
            throw new IllegalArgumentException("A senha deve ter pelo menos 8 caracteres, incluir ao menos uma letra maiúscula, ao menos um número e usar apenas caracteres alfanuméricos.");
        }
        if (request.getTipo() == null) {
            throw new IllegalArgumentException("O tipo de usuário é obrigatório.");
        }
        if (dataNascimento == null || dataNascimento.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Informe uma data de nascimento válida.");
        }
        String normalizedEmail = email.toLowerCase(Locale.ROOT);
        String emailResponsavel = request.getEmailResponsavel() == null
            ? ""
            : request.getEmailResponsavel().trim().toLowerCase(Locale.ROOT);
        boolean menor = dataNascimento.plusYears(18).isAfter(LocalDate.now());
        if (menor && emailResponsavel.isBlank()) {
            throw new IllegalArgumentException("Informe o e-mail do responsável.");
        }
        if (menor && normalizedEmail.equals(emailResponsavel)) {
            throw new IllegalArgumentException("O e-mail do responsável deve ser diferente do e-mail do estudante.");
        }
        if (usuarioRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("Já existe um usuário cadastrado com este e-mail.");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(nome);
        usuario.setEmail(normalizedEmail);
        usuario.setSenhaHash(passwordEncoder.encode(senha));
        usuario.setTipo(TipoUsuario.LEITOR);
        usuario.setConsentimentoResponsavelPendente(menor);
        usuario.setAtivo(!menor);
        usuario.setEmailResponsavel(menor ? emailResponsavel : null);
        Usuario savedUser = usuarioRepository.save(usuario);
        if (menor) {
            guardianConsentService.sendInitialConsent(savedUser);
        }
        return new RegistrationResult(menor);
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

    public record RegistrationResult(boolean consentPending) {}
}
