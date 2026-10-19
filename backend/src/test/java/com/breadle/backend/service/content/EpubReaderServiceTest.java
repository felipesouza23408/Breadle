package com.breadle.backend.service.content;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.CRC32;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EpubReaderServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldExtractReadableTextInOrder() throws IOException {
        Path epubPath = tempDir.resolve("sample.epub");
        writeEpub(epubPath,
            "chapter1.xhtml",
            "Primeira frase de teste para validar a leitura.",
            "Segunda frase de teste para manter a ordem.",
            "chapter2.xhtml",
            "Terceira frase de teste para confirmar a sequência final."
        );

        EpubReaderService service = new EpubReaderService();

        List<String> sections = service.extractSections(epubPath);
        assertNotNull(sections);
        assertTrue(sections.size() >= 2, "Deve existir mais de um capítulo no EPUB");
        assertTrue(sections.get(0).contains("Primeira frase"), "O primeiro capítulo deve manter a ordem correta");
        assertTrue(sections.get(1).contains("Terceira frase"), "O segundo capítulo deve aparecer depois do primeiro");

        String text = service.extractText(epubPath);
        assertFalse(text.contains("<p>"), "O texto extraído não deve conter tags HTML");
        assertFalse(text.contains("<html>"), "O texto extraído não deve conter marcadores XHTML");
        assertTrue(text.indexOf("Primeira frase") < text.indexOf("Terceira frase"), "A ordem do conteúdo deve ser preservada");

        EpubMetadata metadata = service.extractMetadata(epubPath);
        assertEquals("Sample EPUB", metadata.title());
        assertEquals("Test Author", metadata.author());
        assertEquals("Sample description", metadata.description());
    }

    private void writeEpub(Path epubPath, String chapterName, String firstParagraph, String secondParagraph, String secondChapterName, String finalParagraph) throws IOException {
        try (ZipOutputStream zipOutputStream = new ZipOutputStream(Files.newOutputStream(epubPath))) {
            byte[] mimetypeBytes = "application/epub+zip".getBytes(StandardCharsets.UTF_8);
            ZipEntry mimetypeEntry = new ZipEntry("mimetype");
            mimetypeEntry.setMethod(ZipEntry.STORED);
            mimetypeEntry.setSize(mimetypeBytes.length);
            CRC32 crc32 = new CRC32();
            crc32.update(mimetypeBytes);
            mimetypeEntry.setCrc(crc32.getValue());
            zipOutputStream.putNextEntry(mimetypeEntry);
            zipOutputStream.write(mimetypeBytes);
            zipOutputStream.closeEntry();

            writeFile(zipOutputStream, "META-INF/container.xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">\n" +
                "  <rootfiles>\n" +
                "    <rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/>\n" +
                "  </rootfiles>\n" +
                "</container>\n"
            );

            writeFile(zipOutputStream, "OEBPS/content.opf",
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<package xmlns=\"http://www.idpf.org/2007/opf\" version=\"3.0\" unique-identifier=\"BookId\">\n" +
                "  <metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n" +
                "    <dc:identifier id=\"BookId\">sample-epub</dc:identifier>\n" +
                "    <dc:title>Sample EPUB</dc:title>\n" +
                "    <dc:creator>Test Author</dc:creator>\n" +
                "    <dc:description>Sample description</dc:description>\n" +
                "    <dc:language>pt-BR</dc:language>\n" +
                "  </metadata>\n" +
                "  <manifest>\n" +
                "    <item id=\"chapter1\" href=\"chapter1.xhtml\" media-type=\"application/xhtml+xml\"/>\n" +
                "    <item id=\"chapter2\" href=\"chapter2.xhtml\" media-type=\"application/xhtml+xml\"/>\n" +
                "  </manifest>\n" +
                "  <spine>\n" +
                "    <itemref idref=\"chapter1\"/>\n" +
                "    <itemref idref=\"chapter2\"/>\n" +
                "  </spine>\n" +
                "</package>\n"
            );

            writeFile(zipOutputStream, "OEBPS/" + chapterName,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<html xmlns=\"http://www.w3.org/1999/xhtml\">\n" +
                "  <body>\n" +
                "    <p>" + firstParagraph + "</p>\n" +
                "    <p>" + secondParagraph + "</p>\n" +
                "  </body>\n" +
                "</html>\n"
            );

            writeFile(zipOutputStream, "OEBPS/" + secondChapterName,
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<html xmlns=\"http://www.w3.org/1999/xhtml\">\n" +
                "  <body>\n" +
                "    <p>" + finalParagraph + "</p>\n" +
                "  </body>\n" +
                "</html>\n"
            );
        }
    }

    private void writeFile(ZipOutputStream zipOutputStream, String entryName, String contents) throws IOException {
        zipOutputStream.putNextEntry(new ZipEntry(entryName));
        zipOutputStream.write(contents.getBytes(StandardCharsets.UTF_8));
        zipOutputStream.closeEntry();
    }
}
