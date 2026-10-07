package com.breadle.backend.user;

import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {
    private final UsuarioRepository usuarioRepository;

    public UserService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public List<UserProfileDto> listUsers() {
        return usuarioRepository.findAll().stream()
            .map(user -> new UserProfileDto(
                user.getId(),
                user.getNome(),
                user.getEmail(),
                user.getTipo().name(),
                user.getPontosTotais()))
            .toList();
    }

    public UserProfileDto findProfile(Long userId) {
        Usuario user = usuarioRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
        return new UserProfileDto(user.getId(), user.getNome(), user.getEmail(), user.getTipo().name(), user.getPontosTotais());
    }
}
