package com.breadle.backend.controller;

import com.breadle.backend.dto.BookResponse;
import com.breadle.backend.service.LivroService;
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

    public BookController(LivroService livroService) {
        this.livroService = livroService;
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
}