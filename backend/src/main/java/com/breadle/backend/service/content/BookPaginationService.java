package com.breadle.backend.service.content;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class BookPaginationService {

    private static final int PAGE_TARGET_CHARS = 1500;

    public List<BookPage> paginate(List<String> sections) {
        List<BookPage> pages = new ArrayList<>();
        int pageNumber = 1;

        if (sections == null || sections.isEmpty()) {
            return pages;
        }

        for (String section : sections) {
            if (section == null || section.isBlank()) {
                continue;
            }

            String normalizedSection = normalize(section);
            if (normalizedSection.isBlank()) {
                continue;
            }

            List<String> sectionPages = splitSection(normalizedSection);
            for (String pageContent : sectionPages) {
                pages.add(new BookPage(pageNumber++, pageContent));
            }
        }

        return pages;
    }

    private List<String> splitSection(String section) {
        List<String> pages = new ArrayList<>();
        String remaining = section;

        while (!remaining.isBlank()) {
            int limit = Math.min(PAGE_TARGET_CHARS, remaining.length());
            int cutIndex = findCutIndex(remaining, limit);
            String pageText = remaining.substring(0, cutIndex).trim();

            if (pageText.isEmpty()) {
                pageText = remaining.substring(0, limit).trim();
                if (pageText.isEmpty()) {
                    break;
                }
                cutIndex = Math.min(limit, pageText.length());
            }

            pages.add(pageText);
            remaining = remaining.substring(cutIndex).trim();
            if (remaining.isEmpty()) {
                break;
            }
        }

        return pages;
    }

    private int findCutIndex(String text, int limit) {
        if (text.length() <= limit) {
            return text.length();
        }

        int lastSpace = text.lastIndexOf(' ', limit);
        if (lastSpace > 0) {
            return lastSpace;
        }

        int lastLineBreak = text.lastIndexOf('\n', limit);
        if (lastLineBreak > 0) {
            return lastLineBreak;
        }

        int nextSpace = text.indexOf(' ', limit);
        if (nextSpace > limit) {
            return nextSpace;
        }

        return text.length();
    }

    private String normalize(String text) {
        String normalized = text.replace("\r\n", "\n").replace('\r', '\n');
        String[] lines = normalized.split("\\n", -1);
        StringBuilder builder = new StringBuilder();

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].replaceAll("[ \\t]+", " ").trim();
            if (line.isEmpty()) {
                if (builder.length() > 0 && builder.charAt(builder.length() - 1) != '\n') {
                    builder.append('\n');
                }
                if (i < lines.length - 1) {
                    builder.append('\n');
                }
                continue;
            }

            if (builder.length() > 0 && builder.charAt(builder.length() - 1) != '\n') {
                builder.append('\n');
            }
            builder.append(line);
        }

        return builder.toString().replaceAll("\\n{3,}", "\\n\\n").trim();
    }
}
