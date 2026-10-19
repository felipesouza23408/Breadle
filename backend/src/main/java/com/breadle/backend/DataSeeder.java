package com.breadle.backend;

import com.breadle.backend.entity.Livro;
import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.group.ReadingGroup;
import com.breadle.backend.group.ReadingGroupRepository;
import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.repository.UsuarioRepository;
import com.breadle.backend.service.content.BookPaginationService;
import com.breadle.backend.service.content.EpubMetadata;
import com.breadle.backend.service.content.EpubReaderService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

@Component
public class DataSeeder implements CommandLineRunner {

    private final LivroRepository livroRepository;
    private final UsuarioRepository usuarioRepository;
    private final ReadingGroupRepository readingGroupRepository;
    private final EpubReaderService epubReaderService;
    private final BookPaginationService bookPaginationService;
    private final PasswordEncoder passwordEncoder;
    private final Path storageRoot;
    private final boolean seedAdminEnabled;
    private final String seedAdminEmail;
    private final String seedAdminPassword;

    public DataSeeder(LivroRepository livroRepository,
                      UsuarioRepository usuarioRepository,
                      ReadingGroupRepository readingGroupRepository,
                      EpubReaderService epubReaderService,
                      BookPaginationService bookPaginationService,
                      PasswordEncoder passwordEncoder,
                      @Value("${breadle.storage.local-path:./storage}") String storagePath,
                      @Value("${breadle.seed.admin.enabled:false}") boolean seedAdminEnabled,
                      @Value("${breadle.seed.admin.email:}") String seedAdminEmail,
                      @Value("${breadle.seed.admin.password:}") String seedAdminPassword) {
        this.livroRepository = livroRepository;
        this.usuarioRepository = usuarioRepository;
        this.readingGroupRepository = readingGroupRepository;
        this.epubReaderService = epubReaderService;
        this.bookPaginationService = bookPaginationService;
        this.passwordEncoder = passwordEncoder;
        this.storageRoot = Paths.get(storagePath).toAbsolutePath().normalize();
        this.seedAdminEnabled = seedAdminEnabled;
        this.seedAdminEmail = seedAdminEmail == null ? "" : seedAdminEmail.trim();
        this.seedAdminPassword = seedAdminPassword == null ? "" : seedAdminPassword;
    }

    @Override
    public void run(String... args) {
        ensureAdmin();
        ensureStarterGroups();
        seedLibraryFromDownloads();
    }

    private void ensureAdmin() {
        if (!seedAdminEnabled || seedAdminEmail.isBlank() || seedAdminPassword.isBlank()) {
            return;
        }

        String normalizedEmail = seedAdminEmail.toLowerCase(Locale.ROOT);
        if (usuarioRepository.findByEmail(normalizedEmail).isEmpty()) {
            Usuario admin = new Usuario();
            admin.setNome("Admin Breadle");
            admin.setEmail(normalizedEmail);
            admin.setSenhaHash(passwordEncoder.encode(seedAdminPassword));
            admin.setTipo(TipoUsuario.ADMINISTRADOR);
            admin.setAtivo(true);
            usuarioRepository.save(admin);
        }
    }

    private void ensureStarterGroups() {
        if (readingGroupRepository.count() > 0) {
            return;
        }

        String normalizedEmail = seedAdminEmail.toLowerCase(Locale.ROOT);
        if (normalizedEmail.isBlank() || !seedAdminEnabled) {
            return;
        }

        Usuario admin = usuarioRepository.findByEmail(normalizedEmail)
            .orElse(null);
        if (admin == null) {
            return;
        }

        ReadingGroup classics = new ReadingGroup();
        classics.setName("Clube de clássicos");
        classics.setDescription("Leitura coletiva com foco em autores brasileiros e europeus fundamentais.");
        classics.setOwnerId(admin.getId());
        classics.setChallengeName("Leitura clássica");
        classics.setChallengeTargetPages(220);
        readingGroupRepository.save(classics);

        ReadingGroup fantasy = new ReadingGroup();
        fantasy.setName("Leitores de fantasia");
        fantasy.setDescription("Grupo para explorar mundos imaginários, mitos e ficções profundas.");
        fantasy.setOwnerId(admin.getId());
        fantasy.setChallengeName("Ficção em movimento");
        fantasy.setChallengeTargetPages(180);
        readingGroupRepository.save(fantasy);

        ReadingGroup practice = new ReadingGroup();
        practice.setName("Leitura em rotina");
        practice.setDescription("Grupo com objetivo de manter disciplina, constância e desafios semanais de leitura.");
        practice.setOwnerId(admin.getId());
        practice.setChallengeName("Rotina mensal");
        practice.setChallengeTargetPages(260);
        readingGroupRepository.save(practice);
    }

    private void seedLibraryFromDownloads() {
        Path downloads = Paths.get(System.getProperty("user.home"), "Downloads");
        try {
            Path booksDir = storageRoot.resolve("books");
            Files.createDirectories(booksDir);

            List<Path> epubFiles = new java.util.ArrayList<>();
            epubFiles.addAll(listEpubFiles(downloads));
            epubFiles.addAll(listEpubFiles(booksDir));

            for (Path epubFile : epubFiles.stream().distinct().sorted().toList()) {
                importEpubBook(epubFile, booksDir);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Não foi possível importar ou atualizar os EPUBs do acervo.", e);
        }
    }

    private List<Path> listEpubFiles(Path directory) throws IOException {
        if (!Files.isDirectory(directory)) {
            return List.of();
        }
        try (Stream<Path> files = Files.list(directory)) {
            return files
                .filter(Files::isRegularFile)
                .filter(path -> path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".epub"))
                .toList();
        }
    }

    private void importEpubBook(Path epubFile, Path booksDir) throws IOException {
        String fileName = epubFile.getFileName().toString();
        Path destination = booksDir.resolve(fileName).normalize();
        if (!destination.startsWith(booksDir)) {
            throw new IOException("Nome de arquivo EPUB inválido: " + fileName);
        }
        if (!epubFile.toAbsolutePath().normalize().equals(destination.toAbsolutePath().normalize())) {
            Files.copy(epubFile, destination, StandardCopyOption.REPLACE_EXISTING);
        }

        EpubMetadata epubMetadata = epubReaderService.extractMetadata(destination);
        String[] filenameMetadata = parseEpubMetadata(fileName);
        String title = firstNonBlank(epubMetadata.title(), filenameMetadata[0]);
        String author = firstNonBlank(epubMetadata.author(), filenameMetadata[1]);
        int totalPages = bookPaginationService.paginate(epubReaderService.extractSections(destination)).size();
        if (totalPages < 1) {
            throw new IOException("O EPUB não contém páginas de leitura: " + fileName);
        }

        String relativePath = "books/" + fileName;
        Livro livro = livroRepository.findByArquivoUrl(relativePath).orElseGet(Livro::new);
        livro.setTitulo(title);
        livro.setAutor(author);
        livro.setSinopse(firstNonBlank(
            epubMetadata.description(),
            "Obra em domínio público importada de um arquivo EPUB para leitura no Breadle."
        ));
        livro.setOrigem("DOMINIO_PUBLICO");
        livro.setTipo("LITERATURA");
        livro.setDificuldade(2);
        if (livro.getPontuacaoBase() == null || livro.getPontuacaoBase() < 1) {
            livro.setPontuacaoBase(25);
        }
        livro.setTotalPaginas(totalPages);
        livro.setArquivoUrl(relativePath);
        livro.setAtivo(true);
        livroRepository.save(livro);
    }

    private String firstNonBlank(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred.trim();
    }

    private String[] parseEpubMetadata(String fileName) {
        String withoutExtension = fileName.replaceFirst("(?i)\\.epub$", "")
            .replaceFirst("\\.\\d+$", "");
        int byIndex = withoutExtension.toLowerCase(Locale.ROOT).lastIndexOf("_by_");

        if (byIndex > 0) {
            String titlePart = withoutExtension.substring(0, byIndex);
            String authorPart = withoutExtension.substring(byIndex + 4);
            return new String[] {
                cleanText(titlePart),
                cleanText(authorPart)
            };
        }

        String title = withoutExtension.replace("_", " ").replace(";", ",");
        return new String[] { cleanText(title), "Autor desconhecido" };
    }

    private String cleanText(String text) {
        return text.replace('_', ' ')
            .replace(";", ",")
            .replaceAll("\\s+", " ")
            .trim();
    }

}
