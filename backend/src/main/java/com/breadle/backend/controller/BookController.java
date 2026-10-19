package com.breadle.backend.controller;

import com.breadle.backend.common.ResourceNotFoundException;
import com.breadle.backend.dto.BookResponse;
import com.breadle.backend.entity.Livro;
import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.service.LivroService;
import com.breadle.backend.service.content.BookPage;
import com.breadle.backend.service.content.BookPaginationService;
import com.breadle.backend.service.content.EpubReaderService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/books")
public class BookController {

    private final LivroService livroService;
    private final LivroRepository livroRepository;
    private final EpubReaderService epubReaderService;
    private final BookPaginationService bookPaginationService;
    private final Path storageRoot;

    public BookController(LivroService livroService,
                         LivroRepository livroRepository,
                         EpubReaderService epubReaderService,
                         BookPaginationService bookPaginationService,
                         @Value("${breadle.storage.local-path:./storage}") String storagePath) {
        this.livroService = livroService;
        this.livroRepository = livroRepository;
        this.epubReaderService = epubReaderService;
        this.bookPaginationService = bookPaginationService;
        this.storageRoot = Paths.get(storagePath).toAbsolutePath().normalize();
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

        Path epubPath = resolveEpubPath(livro);
        try {
            List<String> sections = epubReaderService.extractSections(epubPath);
            return ResponseEntity.ok(bookPaginationService.paginate(sections));
        } catch (IOException e) {
            throw new IllegalStateException("Erro ao ler o EPUB do livro: " + livro.getTitulo(), e);
        }
    }

    private Path resolveEpubPath(Livro livro) {
        if (livro.getArquivoUrl() != null && !livro.getArquivoUrl().isBlank()) {
            Path direct = resolveStoragePath(livro.getArquivoUrl());
            if (direct != null && Files.isRegularFile(direct)) {
                return direct;
            }
        }

        Path fallback = storageRoot.resolve("books").resolve(sanitizeName(livro.getTitulo()) + ".epub").normalize();
        if (fallback.startsWith(storageRoot) && Files.isRegularFile(fallback)) {
            return fallback;
        }

        throw new ResourceNotFoundException("Arquivo EPUB não encontrado para o livro: " + livro.getTitulo());
    }

    private Path resolveStoragePath(String pathValue) {
        if (pathValue == null || pathValue.isBlank()) {
            return null;
        }

        Path candidate = Paths.get(pathValue);
        if (candidate.isAbsolute()) {
            return null;
        }

        Path normalized = storageRoot.resolve(pathValue).normalize();
        if (!normalized.startsWith(storageRoot)) {
            return null;
        }
        return normalized;
    }

    private String sanitizeName(String value) {
        return value == null ? "livro" : value
            .replaceAll("[^a-zA-Z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .toLowerCase();
    }
}