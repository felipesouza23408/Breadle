package com.breadle.backend.service;

import com.breadle.backend.common.ApiError;
import com.breadle.backend.common.GlobalExceptionHandler;
import com.breadle.backend.dto.LoginRequest;
import com.breadle.backend.dto.RegisterRequest;
import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private GuardianConsentService guardianConsentService;

    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(authenticationManager, usuarioRepository, passwordEncoder, jwtService, guardianConsentService);
    }

    @Test
    void registerAlwaysCreatesReaderWhenPrivilegedRoleIsRequested() {
        when(usuarioRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password1")).thenReturn("encoded-password");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.register(registration("professor@example.com", TipoUsuario.PROFESSOR));
        service.register(registration("admin@example.com", TipoUsuario.ADMINISTRADOR));

        ArgumentCaptor<Usuario> userCaptor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository, times(2)).save(userCaptor.capture());
        assertEquals(2, userCaptor.getAllValues().size());
        userCaptor.getAllValues().forEach(user -> assertEquals(TipoUsuario.LEITOR, user.getTipo()));
    }

    private RegisterRequest registration(String email, TipoUsuario tipo) {
        RegisterRequest request = new RegisterRequest();
        request.setNome("Leitor");
        request.setEmail(email);
        request.setSenha("Password1");
        request.setTipo(tipo);
        request.setDataNascimento(LocalDate.of(1990, 1, 1));
        return request;
    }

    @Test
    void adultRegistrationKeepsNormalActiveReaderAccount() {
        when(usuarioRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password1")).thenReturn("encoded-password");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthService.RegistrationResult result = service.register(registration("adult@example.com", TipoUsuario.LEITOR));

        ArgumentCaptor<Usuario> userCaptor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(userCaptor.capture());
        Usuario savedUser = userCaptor.getValue();
        assertEquals(false, result.consentPending());
        assertEquals(true, savedUser.getAtivo());
        assertEquals(false, savedUser.getConsentimentoResponsavelPendente());
        assertEquals(null, savedUser.getEmailResponsavel());
        verify(guardianConsentService, never()).sendInitialConsent(any());
    }

    @Test
    void minorRegistrationRemainsPendingAndDoesNotIssueLoginToken() {
        RegisterRequest request = registration("child@example.com", TipoUsuario.LEITOR);
        request.setDataNascimento(LocalDate.now().minusYears(12));
        request.setEmailResponsavel("guardian@example.com");
        when(usuarioRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password1")).thenReturn("encoded-password");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthService.RegistrationResult result = service.register(request);

        ArgumentCaptor<Usuario> userCaptor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(userCaptor.capture());
        Usuario savedUser = userCaptor.getValue();
        assertEquals(true, result.consentPending());
        assertEquals(false, savedUser.getAtivo());
        assertEquals(true, savedUser.getConsentimentoResponsavelPendente());
        assertEquals("guardian@example.com", savedUser.getEmailResponsavel());
        verify(guardianConsentService).sendInitialConsent(savedUser);
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    void pendingMinorCannotLoginOrReceiveJwt() {
        Usuario user = new Usuario();
        user.setEmail("child@example.com");
        user.setSenhaHash("encoded-password");
        user.setConsentimentoResponsavelPendente(true);
        when(usuarioRepository.findByEmail("child@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password1", "encoded-password")).thenReturn(true);

        com.breadle.backend.dto.LoginRequest loginRequest = new com.breadle.backend.dto.LoginRequest();
        loginRequest.setEmail("child@example.com");
        loginRequest.setSenha("Password1");
        org.junit.jupiter.api.Assertions.assertThrows(
            IllegalArgumentException.class,
            () -> service.login(loginRequest)
        );

        verify(authenticationManager, never()).authenticate(any());
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    void unknownEmailAndIncorrectPasswordReturnSamePublicError() {
        when(usuarioRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());
        IllegalArgumentException unknownEmailError = assertThrows(
            IllegalArgumentException.class,
            () -> service.login(login("missing@example.com", "Password1"))
        );

        Usuario user = new Usuario();
        user.setEmail("known@example.com");
        user.setSenhaHash("encoded-password");
        when(usuarioRepository.findByEmail("known@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPass1", "encoded-password")).thenReturn(false);
        IllegalArgumentException wrongPasswordError = assertThrows(
            IllegalArgumentException.class,
            () -> service.login(login("known@example.com", "WrongPass1"))
        );

        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();
        ResponseEntity<ApiError> unknownEmailResponse =
            exceptionHandler.handleIllegalArgument(unknownEmailError, request);
        ResponseEntity<ApiError> wrongPasswordResponse =
            exceptionHandler.handleIllegalArgument(wrongPasswordError, request);

        assertEquals(unknownEmailResponse.getStatusCode(), wrongPasswordResponse.getStatusCode());
        assertEquals(400, unknownEmailResponse.getStatusCode().value());
        assertEquals("Credenciais inválidas.", unknownEmailResponse.getBody().getMessage());
        assertEquals(unknownEmailResponse.getBody().getMessage(), wrongPasswordResponse.getBody().getMessage());
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void validLoginStillReturnsJwt() {
        Usuario user = new Usuario();
        user.setNome("Leitor");
        user.setEmail("reader@example.com");
        user.setSenhaHash("encoded-password");
        user.setTipo(TipoUsuario.LEITOR);
        user.setConsentimentoResponsavelPendente(false);
        when(usuarioRepository.findByEmail("reader@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password1", "encoded-password")).thenReturn(true);
        UserDetails principal = User.withUsername("reader@example.com")
            .password("encoded-password")
            .roles("LEITOR")
            .build();
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
            principal,
            null,
            principal.getAuthorities()
        );
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
            .thenReturn(authentication);
        when(jwtService.generateToken(principal)).thenReturn("valid-jwt");

        var response = service.login(login("reader@example.com", "Password1"));

        assertNotNull(response);
        assertEquals("valid-jwt", response.getToken());
    }

    private LoginRequest login(String email, String senha) {
        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setSenha(senha);
        return request;
    }
}
