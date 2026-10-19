package com.breadle.backend.reading;

import com.breadle.backend.ai.AiService;
import com.breadle.backend.ai.AiUsageService;
import com.breadle.backend.entity.Leitura;
import com.breadle.backend.entity.Livro;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.gamification.GamificationService;
import com.breadle.backend.notification.NotificationService;
import com.breadle.backend.repository.LeituraRepository;
import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ReadingSessionService {

    private static final String REWARD_TYPE_COMPLETION = "READING_COMPLETION";

    private final ReadingSessionRepository readingSessionRepository;
    private final ReadingProgressEventRepository readingProgressEventRepository;
    private final ReadingRewardLedgerRepository readingRewardLedgerRepository;
    private final UsuarioRepository usuarioRepository;
    private final LivroRepository livroRepository;
    private final LeituraRepository leituraRepository;
    private final GamificationService gamificationService;
    private final AiService aiService;
    private final AiUsageService aiUsageService;
    private final NotificationService notificationService;

    public ReadingSessionService(ReadingSessionRepository readingSessionRepository,
                                ReadingProgressEventRepository readingProgressEventRepository,
                                ReadingRewardLedgerRepository readingRewardLedgerRepository,
                                UsuarioRepository usuarioRepository,
                                LivroRepository livroRepository,
                                LeituraRepository leituraRepository,
                                GamificationService gamificationService,
                                AiService aiService,
                                AiUsageService aiUsageService,
                                NotificationService notificationService) {
        this.readingSessionRepository = readingSessionRepository;
        this.readingProgressEventRepository = readingProgressEventRepository;
        this.readingRewardLedgerRepository = readingRewardLedgerRepository;
        this.usuarioRepository = usuarioRepository;
        this.livroRepository = livroRepository;
        this.leituraRepository = leituraRepository;
        this.gamificationService = gamificationService;
        this.aiService = aiService;
        this.aiUsageService = aiUsageService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<ReadingSessionSummary> listMySessions() {
        List<ReadingSession> sessions = readingSessionRepository.findByUserIdOrderByCreatedAtDesc(currentUserId());
        Map<Long, Livro> booksById = livroRepository.findAllById(
                sessions.stream().map(ReadingSession::getBookId).distinct().toList()
            ).stream()
            .collect(Collectors.toMap(Livro::getId, Function.identity()));

        return sessions.stream()
            .map(session -> {
                Livro livro = booksById.get(session.getBookId());
                if (livro == null) {
                    throw new EntityNotFoundException("Livro da sessão de leitura não encontrado.");
                }
                return new ReadingSessionSummary(
                    session.getId(),
                    livro.getId(),
                    livro.getTitulo(),
                    livro.getAutor(),
                    livro.getCapaUrl(),
                    livro.getTotalPaginas(),
                    session.getPagesDefined(),
                    session.getPagesRead(),
                    session.getStatus(),
                    session.getPointsAwarded(),
                    session.getCreatedAt(),
                    session.getFinishedAt()
                );
            })
            .toList();
    }

    @Transactional
    public ReadingSession createSession(ReadingSessionRequest request) {
        Long authenticatedUserId = currentUserId();
        if (request.getUserId() != null && !request.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Você só pode criar sessões para sua própria conta.");
        }

        Usuario usuario = usuarioRepository.findById(authenticatedUserId)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado."));

        Livro livro = livroRepository.findById(request.getBookId())
                .orElseThrow(() -> new EntityNotFoundException("Livro não encontrado."));

        if (request.getPagesDefined() == null || request.getPagesDefined() < 1) {
            throw new IllegalArgumentException("A sessão precisa declarar pelo menos uma página lida antes do início.");
        }

        ReadingSession session = new ReadingSession();
        session.setUserId(usuario.getId());
        session.setBookId(livro.getId());
        session.setPagesDefined(request.getPagesDefined());
        session.setPagesRead(0);
        session.setStatus("ACTIVE");
        session.setAlreadyAwarded(false);
        return readingSessionRepository.save(session);
    }

    @Transactional
    public ReadingSession registerProgress(Long sessionId, ReadingProgressRequest request) {
        ReadingSession session = readingSessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Sessão de leitura não encontrada."));
        ensureSessionOwner(session);

        if (request.getPagesRead() == null || request.getPagesRead() < 0) {
            throw new IllegalArgumentException("A quantidade de páginas lidas é inválida.");
        }

        if (request.getPagesRead() > session.getPagesDefined()) {
            throw new IllegalArgumentException("A leitura não pode exceder o número de páginas definido para a sessão.");
        }

        if (Boolean.TRUE.equals(session.getAlreadyAwarded()) && "COMPLETED".equals(session.getStatus())) {
            return session;
        }

        int previousPagesRead = session.getPagesRead() == null ? 0 : session.getPagesRead();
        int recordedPagesRead = Math.max(previousPagesRead, request.getPagesRead());
        session.setPagesRead(recordedPagesRead);
        if (recordedPagesRead > previousPagesRead) {
            java.time.Instant progressAt = java.time.Instant.now();
            session.setLastProgressAt(progressAt);
            ReadingProgressEvent event = new ReadingProgressEvent();
            event.setUserId(session.getUserId());
            event.setSessionId(session.getId());
            event.setPagesReadDelta(recordedPagesRead - previousPagesRead);
            event.setCreatedAt(progressAt);
            readingProgressEventRepository.save(event);
        }
        if (request.getExcerptHash() != null && !request.getExcerptHash().isBlank()) {
            session.setExcerptHash(request.getExcerptHash());
        }

        if (recordedPagesRead == session.getPagesDefined()) {
            completeSession(session);
        }

        return readingSessionRepository.save(session);
    }

    @Transactional
    public ReadingSession completeSession(Long sessionId) {
        ReadingSession session = readingSessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Sessão de leitura não encontrada."));
        ensureSessionOwner(session);
        return completeSession(session);
    }

    public String generateQuestionsForExcerpt(Long sessionId, ReadingAiQuestionRequest request) {
        ReadingSession session = readingSessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Sessão de leitura não encontrada."));
        ensureSessionOwner(session);

        Livro livro = livroRepository.findById(session.getBookId())
                .orElseThrow(() -> new EntityNotFoundException("Livro da sessão não encontrado."));

        if (request.getExcerpt() == null || request.getExcerpt().isBlank()) {
            throw new IllegalArgumentException("O trecho lido não pode estar vazio.");
        }

        session.setExcerptHash(String.valueOf(request.getExcerpt().hashCode()));
        readingSessionRepository.save(session);

        return aiUsageService.execute(
                () -> aiService.generateQuestions(livro.getTitulo(), request.getExcerpt()))
                .result();
    }

    private void ensureSessionOwner(ReadingSession session) {
        Long authenticatedUserId = currentUserId();
        if (!session.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Você não tem permissão para acessar esta sessão de leitura.");
        }
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AccessDeniedException("Usuário não autenticado.");
        }

        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Usuário autenticado não encontrado."));
        return usuario.getId();
    }

    private ReadingSession completeSession(ReadingSession session) {
        if ("COMPLETED".equals(session.getStatus()) && Boolean.TRUE.equals(session.getAlreadyAwarded())) {
            return session;
        }
        if (session.getPagesDefined() == null || session.getPagesRead() == null
            || session.getPagesRead() < session.getPagesDefined()) {
            throw new IllegalArgumentException("Conclua todas as páginas da sessão antes de finalizar a leitura.");
        }

        Livro livro = livroRepository.findById(session.getBookId())
                .orElseThrow(() -> new EntityNotFoundException("Livro da sessão não encontrado."));

        int basePoints = livro.getPontuacaoBase() == null ? 10 : livro.getPontuacaoBase();
        int awardedPoints = gamificationService.calculateReadingPoints(
                session.getPagesRead(),
                basePoints,
                true
        );

        if (!readingRewardLedgerRepository.findFirstBySessionIdAndRewardType(session.getId(), REWARD_TYPE_COMPLETION).isPresent()) {
            ReadingRewardLedger ledger = new ReadingRewardLedger();
            ledger.setUserId(session.getUserId());
            ledger.setSessionId(session.getId());
            ledger.setRewardType(REWARD_TYPE_COMPLETION);
            ledger.setPointsAwarded(awardedPoints);
            ledger.setReferenceHash(session.getExcerptHash() == null ? "reading-session-" + session.getId() : session.getExcerptHash());
            readingRewardLedgerRepository.save(ledger);
        }

        Usuario usuario = usuarioRepository.findById(session.getUserId())
            .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado para pontuação."));
        int currentPoints = usuario.getPontosTotais() == null ? 0 : usuario.getPontosTotais();
        usuario.setPontosTotais(currentPoints + awardedPoints);
        usuarioRepository.save(usuario);

        notificationService.createForUser(
            usuario.getId(),
            "Leitura concluída",
            "Você concluiu '" + livro.getTitulo() + "' e ganhou " + awardedPoints + " pontos.",
            "SUCCESS"
        );

        Leitura leitura = new Leitura();
        leitura.setLeitorId(usuario.getId());
        leitura.setLivroId(session.getBookId());
        leitura.setPaginaAtual(session.getPagesRead());
        leitura.setConcluida(true);
        leituraRepository.save(leitura);

        session.setPointsAwarded(awardedPoints);
        session.setAlreadyAwarded(true);
        session.setStatus("COMPLETED");
        session.setFinishedAt(java.time.Instant.now());
        session.setLastProgressAt(session.getFinishedAt());
        return readingSessionRepository.save(session);
    }
}
