package com.breadle.backend.book;

import com.breadle.backend.dto.BookResponse;
import com.breadle.backend.entity.Livro;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/books-catalog")
public class BookCatalogController {

    private final BookCatalogService bookCatalogService;

    public BookCatalogController(BookCatalogService bookCatalogService) {
        this.bookCatalogService = bookCatalogService;
    }

    @GetMapping
    public ResponseEntity<List<BookResponse>> listBooks() {
        List<BookResponse> response = bookCatalogService.listAvailableBooks().stream()
            .map(book -> new BookResponse(
                book.getId(),
                book.getTitulo(),
                book.getAutor(),
                book.getSinopse(),
                book.getOrigem(),
                book.getTipo(),
                book.getTotalPaginas(),
                book.getPontuacaoBase()))
            .toList();
        return ResponseEntity.ok(response);
    }
}
