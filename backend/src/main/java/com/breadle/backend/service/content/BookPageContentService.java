package com.breadle.backend.service.content;

import com.breadle.backend.common.ResourceNotFoundException;
import com.breadle.backend.entity.Livro;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class BookPageContentService {

    private final EpubReaderService epubReaderService;
    private final BookPaginationService bookPaginationService;
    private final Path storageRoot;

    public BookPageContentService(EpubReaderService epubReaderService,
                                  BookPaginationService bookPaginationService,
                                  @Value("${breadle.storage.local-path:./storage}") String storagePath) {
        this.epubReaderService = epubReaderService;
        this.bookPaginationService = bookPaginationService;
        this.storageRoot = Paths.get(storagePath).toAbsolutePath().normalize();
    }

    public List<BookPage> loadPages(Livro livro) {
        try {
            return bookPaginationService.paginate(epubReaderService.extractSections(resolveEpubPath(livro)));
        } catch (IOException e) {
            throw new IllegalStateException("Erro ao ler o EPUB do livro: " + livro.getTitulo(), e);
        }
    }

    public BookPage loadPage(Livro livro, int pageNumber) {
        List<BookPage> pages = loadPages(livro);
        if (pageNumber < 1 || pageNumber > pages.size()) {
            throw new IllegalArgumentException("A página solicitada não existe no conteúdo oficial do livro.");
        }
        return pages.get(pageNumber - 1);
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
        return normalized.startsWith(storageRoot) ? normalized : null;
    }

    private String sanitizeName(String value) {
        return value == null ? "livro" : value
            .replaceAll("[^a-zA-Z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .toLowerCase();
    }
}
