package com.breadle.backend.service.content;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BookPaginationServiceTest {

    private final BookPaginationService service = new BookPaginationService();

    @Test
    void shouldCreateSinglePageForShortSection() {
        List<String> sections = List.of("Texto curto para validar que uma seção pequena gera uma página única.");

        List<BookPage> pages = service.paginate(sections);

        assertEquals(1, pages.size());
        assertEquals(1, pages.get(0).number());
        assertFalse(pages.get(0).content().isBlank());
    }

    @Test
    void shouldCreateMultiplePagesForLongSection() {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < 2000; i++) {
            builder.append("palavra ");
        }

        List<BookPage> pages = service.paginate(List.of(builder.toString()));

        assertTrue(pages.size() > 1, "Uma seção longa deve gerar várias páginas");
        assertEquals(1, pages.get(0).number());
        assertEquals(pages.size(), pages.get(pages.size() - 1).number());
    }

    @Test
    void shouldNeverMixDifferentSectionsInSamePage() {
        String firstSection = String.join(" ", Collections.nCopies(400, "alpha"));
        String secondSection = String.join(" ", Collections.nCopies(400, "beta"));

        List<BookPage> pages = service.paginate(List.of(firstSection, secondSection));

        assertFalse(pages.stream().anyMatch(page -> page.content().contains("beta") && page.content().contains("alpha")));
        assertTrue(pages.stream().anyMatch(page -> page.content().contains("alpha")));
        assertTrue(pages.stream().anyMatch(page -> page.content().contains("beta")));
    }

    @Test
    void shouldStartAtOneAndKeepContinuousNumbering() {
        String longText = String.join(" ", Collections.nCopies(3000, "numero"));

        List<BookPage> pages = service.paginate(List.of(longText, "Apêndice curto."));

        assertEquals(1, pages.get(0).number());
        assertEquals(pages.size(), pages.get(pages.size() - 1).number());
        assertTrue(pages.stream().map(BookPage::number).distinct().count() == pages.size());
    }

    @Test
    void shouldNotBreakWordsWhenSpaceExistsBeforeLimit() {
        StringBuilder builder = new StringBuilder();
        builder.append("x ".repeat(300));
        String targetWord = "palavraespecial";
        while (builder.length() + targetWord.length() + 1 < 1500) {
            builder.append("letra ");
        }
        builder.append(" ").append(targetWord);

        List<BookPage> pages = service.paginate(List.of(builder.toString()));

        assertFalse(pages.isEmpty());
        String joined = String.join("\n", pages.stream().map(BookPage::content).toList());

        assertTrue(joined.contains(targetWord), "A palavra completa deve aparecer em uma única página.");
        assertFalse(joined.contains(targetWord.substring(0, 5) + " " + targetWord.substring(5)), "A palavra não deve ser dividida entre duas páginas.");
        assertTrue(pages.stream().noneMatch(page -> page.content().matches(".*\\w+" + targetWord.substring(0, 3) + ".*")));
    }

    @Test
    void shouldPreserveParagraphBreaksInsidePageContent() {
        String section = "Primeiro parágrafo com muito conteúdo para validar a preservação do texto.\n\nSegundo parágrafo com mais conteúdo para confirmar que a quebra de parágrafo será mantida corretamente.";

        List<BookPage> pages = service.paginate(List.of(section));

        assertFalse(pages.isEmpty());
        assertTrue(pages.stream().anyMatch(page -> page.content().contains("\n\n")));
        assertTrue(pages.stream().anyMatch(page -> page.content().contains("Primeiro parágrafo") && page.content().contains("Segundo parágrafo")));
    }

    @Test
    void shouldIgnoreEmptySections() {
        List<String> sections = new ArrayList<>();
        sections.add("   ");
        sections.add("\n\n");
        sections.add("Texto válido para garantir que a seção non-empty seja mantida.");
        sections.add("  ");

        List<BookPage> pages = service.paginate(sections);

        assertEquals(1, pages.size());
        assertEquals(1, pages.get(0).number());
        assertTrue(pages.get(0).content().contains("Texto válido"));
    }

    @Test
    void shouldPreserveSectionOrder() {
        List<String> sections = List.of(
            "Primeira seção com conteúdo de leitura organizada.",
            "Segunda seção com conteúdo de leitura organizada.",
            "Terceira seção com conteúdo de leitura organizada."
        );

        List<BookPage> pages = service.paginate(sections);

        assertNotNull(pages);
        assertTrue(pages.stream().allMatch(page -> !page.content().isBlank()));
        assertTrue(pages.get(0).content().contains("Primeira"));
        assertTrue(pages.get(pages.size() - 1).content().contains("Terceira"));
    }

    @Test
    void shouldKeepOriginalContentOrderWithinEachSection() {
        String section = "Primeiro trecho para garantir a ordem. Segundo trecho para garantir a ordem. Terceiro trecho para garantir a ordem.";
        List<BookPage> pages = service.paginate(List.of(section));

        String combined = String.join(" ", pages.stream().map(BookPage::content).toList());
        assertTrue(combined.contains("Primeiro trecho"));
        assertTrue(combined.contains("Segundo trecho"));
        assertTrue(combined.contains("Terceiro trecho"));
        assertTrue(combined.indexOf("Primeiro trecho") < combined.indexOf("Segundo trecho"));
        assertTrue(combined.indexOf("Segundo trecho") < combined.indexOf("Terceiro trecho"));
    }
}
