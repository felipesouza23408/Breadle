package com.breadle.backend.service;

import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class DashboardService {

    private final LivroRepository livroRepository;
    private final UsuarioRepository usuarioRepository;

    public DashboardService(LivroRepository livroRepository, UsuarioRepository usuarioRepository) {
        this.livroRepository = livroRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public Map<String, Object> resumo() {
        long livros = livroRepository.count();
        long usuarios = usuarioRepository.count();

        return Map.of(
            "livros", livros,
            "usuarios", usuarios,
            "status", "ativo",
            "mensagem", "Breadle pronto para leitura e aprendizagem."
        );
    }
}
