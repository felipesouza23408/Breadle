package com.breadle.backend.service;

import com.breadle.backend.common.ResourceNotFoundException;
import com.breadle.backend.dto.BookResponse;
import com.breadle.backend.entity.Livro;
import com.breadle.backend.repository.LivroRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LivroService {

    private final LivroRepository livroRepository;

    public LivroService(LivroRepository livroRepository) {
        this.livroRepository = livroRepository;
    }

    public List<BookResponse> buscar(String q, Pageable pageable) {
        String termo = q == null ? "" : q.trim();
        return livroRepository.buscar(termo, pageable)
            .map(this::toResponse)
            .getContent();
    }

    public BookResponse buscarPorId(Long id) {
        Livro livro = livroRepository.findById(id)
            .filter(Livro::getAtivo)
            .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado: " + id));
        return toResponse(livro);
    }

    private BookResponse toResponse(Livro livro) {
        return new BookResponse(
            livro.getId(),
            livro.getTitulo(),
            livro.getAutor(),
            livro.getSinopse(),
            livro.getOrigem(),
            livro.getTipo(),
            livro.getDificuldade(),
            livro.getTotalPaginas(),
            livro.getPontuacaoBase(),
            livro.getCapaUrl()
        );
    }
}