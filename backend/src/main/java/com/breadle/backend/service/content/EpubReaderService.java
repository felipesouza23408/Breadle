package com.breadle.backend.service.content;

import io.documentnode.epub4j.domain.Book;
import io.documentnode.epub4j.domain.Author;
import io.documentnode.epub4j.domain.Resource;
import io.documentnode.epub4j.epub.EpubReader;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class EpubReaderService {

    public EpubMetadata extractMetadata(Path path) throws IOException {
        try (InputStream inputStream = Files.newInputStream(path)) {
            Book book = new EpubReader().readEpub(inputStream);
            if (book == null || book.getMetadata() == null) {
                return new EpubMetadata(null, null, null);
            }

            String author = book.getMetadata().getAuthors().stream()
                .map(EpubReaderService::formatAuthor)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
            String description = book.getMetadata().getDescriptions().stream()
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
            return new EpubMetadata(book.getMetadata().getFirstTitle(), author, description);
        }
    }

    private static String formatAuthor(Author author) {
        if (author == null) {
            return null;
        }
        String firstName = author.getFirstname();
        String lastName = author.getLastname();
        if (firstName == null || firstName.isBlank()) {
            return lastName;
        }
        if (lastName == null || lastName.isBlank()) {
            return firstName;
        }
        return firstName.trim() + " " + lastName.trim();
    }

    public String extractText(Path path) throws IOException {
        try (InputStream inputStream = Files.newInputStream(path)) {
            return extractText(inputStream);
        }
    }

    public String extractText(InputStream inputStream) throws IOException {
        List<String> sections = extractSections(inputStream);
        return String.join("\n\n", sections);
    }

    public List<String> extractSections(Path path) throws IOException {
        try (InputStream inputStream = Files.newInputStream(path)) {
            return extractSections(inputStream);
        }
    }

    public List<String> extractSections(InputStream inputStream) throws IOException {
        Book book = new EpubReader().readEpub(inputStream);
        List<String> sections = new ArrayList<>();

        if (book == null || book.getContents() == null) {
            return sections;
        }

        for (Resource resource : book.getContents()) {
            if (resource == null) {
                continue;
            }

            String href = resource.getHref();
            if (href == null) {
                continue;
            }

            String lowerHref = href.toLowerCase(Locale.ROOT);
            if (!lowerHref.endsWith(".xhtml") && !lowerHref.endsWith(".html")
                && !lowerHref.endsWith(".htm") && !lowerHref.endsWith(".xml")) {
                continue;
            }

            String html = new String(resource.getData(), StandardCharsets.UTF_8);
            String text = stripHtml(html);
            if (!text.isBlank()) {
                sections.add(text.trim());
            }
        }

        return sections;
    }

    private String stripHtml(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }

        String cleaned = html;
        cleaned = cleaned.replaceAll("(?is)<!DOCTYPE.*?>", " ");
        cleaned = cleaned.replaceAll("(?is)<script.*?</script>", " ");
        cleaned = cleaned.replaceAll("(?is)<style.*?</style>", " ");
        cleaned = cleaned.replaceAll("(?is)<br\\s*/?>", "\n");
        cleaned = cleaned.replaceAll("(?is)</(p|div|section|article|li|h[1-6]|blockquote|title)>", "\n\n");
        cleaned = cleaned.replaceAll("(?is)</(tr|td|th|ul|ol)>", "\n");
        cleaned = cleaned.replaceAll("(?is)<[^>]+>", " ");
        cleaned = cleaned.replace("&nbsp;", " ");
        cleaned = cleaned.replace("&amp;", "&");
        cleaned = cleaned.replace("&lt;", "<");
        cleaned = cleaned.replace("&gt;", ">");
        cleaned = cleaned.replace("&#39;", "'");
        cleaned = cleaned.replace("&quot;", "\"");
        cleaned = Normalizer.normalize(cleaned, Normalizer.Form.NFC);
        cleaned = cleaned.replaceAll("[\\r\\n]+", "\n");
        cleaned = cleaned.replaceAll("\\s*\\n\\s*", "\n");
        cleaned = cleaned.replaceAll("[ \\t]+", " ");
        cleaned = cleaned.replaceAll("\\n{3,}", "\n\n");
        return cleaned.trim();
    }
}
