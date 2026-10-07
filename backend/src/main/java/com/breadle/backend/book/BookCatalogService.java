package com.breadle.backend.book;

import com.breadle.backend.entity.Livro;
import com.breadle.backend.repository.LivroRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookCatalogService {

    private final LivroRepository livroRepository;

    public BookCatalogService(LivroRepository livroRepository) {
        this.livroRepository = livroRepository;
    }

    public List<Livro> listAvailableBooks() {
        return livroRepository.findByAtivoTrueOrderByTituloAsc();
    }
}
