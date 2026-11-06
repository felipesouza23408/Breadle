package com.breadle.backend.controller;

import com.breadle.backend.common.ResourceNotFoundException;
import com.breadle.backend.dto.BookResponse;
import com.breadle.backend.entity.Livro;
import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.service.LivroService;
import com.breadle.backend.service.content.BookPage;
import com.breadle.backend.service.content.BookPageContentService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/books")
public class BookController {

    private final LivroService livroService;
    private final LivroRepository livroRepository;
    private final BookPageContentService bookPageContentService;

    public BookController(LivroService livroService,
                         LivroRepository livroRepository,
                         BookPageContentService bookPageContentService) {
        this.livroService = livroService;
        this.livroRepository = livroRepository;
        this.bookPageContentService = bookPageContentService;
    }

    @GetMapping
    public ResponseEntity<List<BookResponse>> listar(
            @RequestParam(defaultValue = "") String q,
            @PageableDefault(size = 20, sort = "titulo") Pageable pageable) {
        return ResponseEntity.ok(livroService.buscar(q, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookResponse> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(livroService.buscarPorId(id));
    }

    @GetMapping("/{id}/pages")
    public ResponseEntity<List<BookPage>> paginas(@PathVariable Long id) {
        Livro livro = livroRepository.findById(id)
            .filter(Livro::getAtivo)
            .orElseThrow(() -> new ResourceNotFoundException("Livro não encontrado: " + id));

        return ResponseEntity.ok(bookPageContentService.loadPages(livro));
    }
}