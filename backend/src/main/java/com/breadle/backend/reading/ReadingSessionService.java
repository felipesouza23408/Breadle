package com.breadle.backend.reading;

import com.breadle.backend.ai.AiService;
import com.breadle.backend.ai.AiUsageService;
import com.breadle.backend.common.ConflictException;
import com.breadle.backend.entity.Leitura;
import com.breadle.backend.entity.Livro;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.gamification.GamificationService;
import com.breadle.backend.notification.NotificationService;
import com.breadle.backend.repository.LeituraRepository;
import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.repository.UsuarioRepository;
import com.breadle.backend.service.content.BookPage;
import com.breadle.backend.service.content.BookPageContentService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final ReadingSessionPageRepository readingSessionPageRepository;
    private final ReadingProgressEventRepository readingProgressEventRepository;
    private final ReadingRewardLedgerRepository readingRewardLedgerRepository;
    private final UsuarioRepository usuarioRepository;
    private final LivroRepository livroRepository;
    private final LeituraRepository leituraRepository;
    private final GamificationService gamificationService;
    private final AiService aiService;
    private final AiUsageService aiUsageService;
    private final NotificationService notificationService;
    private final BookPageContentService bookPageContentService;
    private ReadingAssessmentService assessmentService;

    @Autowired
    public void setAssessmentService(ReadingAssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    public ReadingAssessmentDto createAssessment(Long sessionId) {
        return assessmentService.createOrGet(sessionId);
    }

    public AssessmentAnswerDto submitAssessmentAnswer(
            Long sessionId,
            Long questionId,
            AssessmentAnswerRequest request) {
        return assessmentService.submitAnswer(sessionId, questionId, request);
    }

    public ReadingSessionService(ReadingSessionRepository readingSessionRepository,
                                ReadingSessionPageRepository readingSessionPageRepository,
                                ReadingProgressEventRepository readingProgressEventRepository,
                                ReadingRewardLedgerRepository readingRewardLedgerRepository,
                                UsuarioRepository usuarioRepository,
                                LivroRepository livroRepository,
                                LeituraRepository leituraRepository,
                                GamificationService gamificationService,
                                AiService aiService,
                                AiUsageService aiUsageService,
                                NotificationService notificationService,
                                BookPageContentService bookPageContentService) {
        this.readingSessionRepository = readingSessionRepository;
        this.readingSessionPageRepository = readingSessionPageRepository;
        this.readingProgressEventRepository = readingProgressEventRepository;
        this.readingRewardLedgerRepository = readingRewardLedgerRepository;
        this.usuarioRepository = usuarioRepository;
        this.livroRepository = livroRepository;
        this.leituraRepository = leituraRepository;
        this.gamificationService = gamificationService;
        this.aiService = aiService;
        this.aiUsageService = aiUsageService;
        this.notificationService = notificationService;
        this.bookPageContentService = bookPageContentService;
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

        if (request.getPagesDefined() == null || request.getPagesDefined() < 1
                || livro.getTotalPaginas() == null || request.getPagesDefined() > livro.getTotalPaginas()) {
            throw new IllegalArgumentException("A quantidade de páginas da sessão deve estar entre 1 e o total real do livro.");
        }

        ReadingSession session = new ReadingSession();
        session.setUserId(usuario.getId());
        session.setBookId(livro.getId());
        session.setPagesDefined(request.getPagesDefined());
        session.setPagesRead(0);
        session.setStatus("ACTIVE");
        session.setAlreadyAwarded(false);
        session.setPageTrackingStarted(true);
        return readingSessionRepository.save(session);
    }

    @Transactional
    public BookPage openPage(Long sessionId, Integer pageNumber) {
        ReadingSession session = readingSessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Sessão de leitura não encontrada."));
        ensureSessionOwner(session);

        if (!"ACTIVE".equals(session.getStatus()) && !"COMPLETED".equals(session.getStatus())) {
            throw new ConflictException("Esta sessão de leitura não está disponível para navegação.");
        }
        if (pageNumber == null || pageNumber < 1 || session.getPagesDefined() == null
                || pageNumber > session.getPagesDefined()) {
            throw new IllegalArgumentException("A página solicitada está fora do intervalo da sessão.");
        }

        Livro livro = livroRepository.findById(session.getBookId())
                .filter(book -> Boolean.TRUE.equals(book.getAtivo()))
                .orElseThrow(() -> new EntityNotFoundException("Livro da sessão não encontrado ou inativo."));
        if (livro.getTotalPaginas() == null || session.getPagesDefined() > livro.getTotalPaginas()) {
            throw new IllegalArgumentException("A sessão excede o total real de páginas do livro.");
        }

        BookPage page = bookPageContentService.loadPage(livro, pageNumber);
        if (readingSessionPageRepository.findBySessionIdAndPageNumber(sessionId, pageNumber).isPresent()) {
            return page;
        }
        if ("COMPLETED".equals(session.getStatus())) {
            return page;
        }

        boolean trackingStarted = Boolean.TRUE.equals(session.getPageTrackingStarted());
        Integer highestTrackedPage = readingSessionPageRepository.findHighestPageNumber(sessionId);
        int expectedPage;
        if (trackingStarted) {
            expectedPage = highestTrackedPage == null ? 1 : highestTrackedPage + 1;
        } else {
            int priorProgress = session.getPagesRead() == null ? 0 : session.getPagesRead();
            if (pageNumber <= priorProgress) {
                return page;
            }
            expectedPage = priorProgress + 1;
        }
        if (pageNumber != expectedPage) {
            throw new ConflictException("Abra as páginas em sequência antes de continuar.");
        }

        ReadingSessionPage openedPage = new ReadingSessionPage();
        openedPage.setSessionId(sessionId);
        openedPage.setPageNumber(pageNumber);
        openedPage.setOpenedAt(java.time.Instant.now());
        readingSessionPageRepository.save(openedPage);
        session.setPageTrackingStarted(true);
        readingSessionRepository.save(session);
        return page;
    }

    @Transactional
    public ReadingSession registerProgress(Long sessionId, ReadingProgressRequest request) {
        ReadingSession session = readingSessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Sessão de leitura não encontrada."));
        ensureSessionOwner(session);

        if (request.getPagesRead() == null || request.getPagesRead() < 0) {
            throw new IllegalArgumentException("A quantidade de páginas lidas é inválida.");
        }

        if (session.getPagesDefined() == null || session.getPagesDefined() < 1
                || request.getPagesRead() > session.getPagesDefined()) {
            throw new IllegalArgumentException("A leitura não pode exceder o número de páginas definido para a sessão.");
        }

        Livro livro = livroRepository.findById(session.getBookId())
                .orElseThrow(() -> new EntityNotFoundException("Livro da sessão não encontrado."));
        if (livro.getTotalPaginas() == null || session.getPagesDefined() > livro.getTotalPaginas()) {
            throw new IllegalArgumentException("A sessão excede o total real de páginas do livro.");
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
        ReadingSession session = readingSessionRepository.findByIdForUpdate(sessionId)
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
        if (session.getPagesDefined() == null || session.getPagesDefined() < 1 || session.getPagesRead() == null
            || session.getPagesRead() < session.getPagesDefined()) {
            throw new IllegalArgumentException("Conclua todas as páginas da sessão antes de finalizar a leitura.");
        }

        Livro livro = livroRepository.findById(session.getBookId())
                .orElseThrow(() -> new EntityNotFoundException("Livro da sessão não encontrado."));
        if (livro.getTotalPaginas() == null || session.getPagesDefined() > livro.getTotalPaginas()
                || session.getPagesRead() > livro.getTotalPaginas()) {
            throw new IllegalArgumentException("A sessão excede o total real de páginas do livro.");
        }
        if ("COMPLETED".equals(session.getStatus()) && Boolean.TRUE.equals(session.getAlreadyAwarded())) {
            return session;
        }

        var existingReward = readingRewardLedgerRepository
                .findFirstBySessionIdAndRewardType(session.getId(), REWARD_TYPE_COMPLETION);
        if (existingReward.isPresent()) {
            session.setPointsAwarded(existingReward.get().getPointsAwarded());
            session.setAlreadyAwarded(true);
            session.setStatus("COMPLETED");
            if (session.getFinishedAt() == null) {
                session.setFinishedAt(java.time.Instant.now());
            }
            session.setLastProgressAt(session.getFinishedAt());
            return readingSessionRepository.save(session);
        }

        int basePoints = livro.getPontuacaoBase() == null ? 10 : livro.getPontuacaoBase();
        int awardedPoints = gamificationService.calculateReadingPoints(
                session.getPagesRead(),
                basePoints,
                true
        );
        ReadingRewardLedger ledger = new ReadingRewardLedger();
        ledger.setUserId(session.getUserId());
        ledger.setSessionId(session.getId());
        ledger.setRewardType(REWARD_TYPE_COMPLETION);
        ledger.setPointsAwarded(awardedPoints);
        ledger.setReferenceHash(session.getExcerptHash() == null ? "reading-session-" + session.getId() : session.getExcerptHash());
        readingRewardLedgerRepository.save(ledger);

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
