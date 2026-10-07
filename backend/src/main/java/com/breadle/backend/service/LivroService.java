package com.breadle.backend.service;

import com.breadle.backend.dto.BookResponse;
import com.breadle.backend.entity.Livro;
import com.breadle.backend.repository.LivroRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LivroService {

    private final LivroRepository livroRepository;

    public LivroService(LivroRepository livroRepository) {
        this.livroRepository = livroRepository;
    }

    public List<BookResponse> listarLivros() {
        return livroRepository.findByAtivoTrueOrderByTituloAsc()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public BookResponse buscarPorId(Long id) {
        Livro livro = livroRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Livro não encontrado: " + id));
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
            livro.getTotalPaginas(),
            livro.getPontuacaoBase()
        );
    }
}
