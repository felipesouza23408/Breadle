package com.breadle.backend.reading;

import com.breadle.backend.ai.AiService;
import com.breadle.backend.entity.Livro;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.gamification.GamificationService;
import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReadingSessionService {

    private static final String REWARD_TYPE_COMPLETION = "READING_COMPLETION";

    private final ReadingSessionRepository readingSessionRepository;
    private final ReadingRewardLedgerRepository readingRewardLedgerRepository;
    private final UsuarioRepository usuarioRepository;
    private final LivroRepository livroRepository;
    private final GamificationService gamificationService;
    private final AiService aiService;

    public ReadingSessionService(ReadingSessionRepository readingSessionRepository,
                                ReadingRewardLedgerRepository readingRewardLedgerRepository,
                                UsuarioRepository usuarioRepository,
                                LivroRepository livroRepository,
                                GamificationService gamificationService,
                                AiService aiService) {
        this.readingSessionRepository = readingSessionRepository;
        this.readingRewardLedgerRepository = readingRewardLedgerRepository;
        this.usuarioRepository = usuarioRepository;
        this.livroRepository = livroRepository;
        this.gamificationService = gamificationService;
        this.aiService = aiService;
    }

    @Transactional
    public ReadingSession createSession(ReadingSessionRequest request) {
        Usuario usuario = usuarioRepository.findById(request.getUserId())
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

        if (request.getPagesRead() == null || request.getPagesRead() < 0) {
            throw new IllegalArgumentException("A quantidade de páginas lidas é inválida.");
        }

        if (request.getPagesRead() > session.getPagesDefined()) {
            throw new IllegalArgumentException("A leitura não pode exceder o número de páginas definido para a sessão.");
        }

        if (Boolean.TRUE.equals(session.getAlreadyAwarded()) && "COMPLETED".equals(session.getStatus())) {
            session.setPagesRead(request.getPagesRead());
            return session;
        }

        session.setPagesRead(request.getPagesRead());
        if (request.getExcerptHash() != null && !request.getExcerptHash().isBlank()) {
            session.setExcerptHash(request.getExcerptHash());
        }

        if (request.getPagesRead().equals(session.getPagesDefined())) {
            completeSession(session);
        }

        return readingSessionRepository.save(session);
    }

    @Transactional
    public ReadingSession completeSession(Long sessionId) {
        ReadingSession session = readingSessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Sessão de leitura não encontrada."));
        return completeSession(session);
    }

    @Transactional
    public String generateQuestionsForExcerpt(Long sessionId, ReadingAiQuestionRequest request) {
        ReadingSession session = readingSessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Sessão de leitura não encontrada."));

        Livro livro = livroRepository.findById(session.getBookId())
                .orElseThrow(() -> new EntityNotFoundException("Livro da sessão não encontrado."));

        if (request.getExcerpt() == null || request.getExcerpt().isBlank()) {
            throw new IllegalArgumentException("O trecho lido não pode estar vazio.");
        }

        session.setExcerptHash(String.valueOf(request.getExcerpt().hashCode()));
        readingSessionRepository.save(session);

        return aiService.generateQuestions(livro.getTitulo(), request.getExcerpt());
    }

    private ReadingSession completeSession(ReadingSession session) {
        if ("COMPLETED".equals(session.getStatus()) && Boolean.TRUE.equals(session.getAlreadyAwarded())) {
            return session;
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

        session.setPointsAwarded(awardedPoints);
        session.setAlreadyAwarded(true);
        session.setStatus("COMPLETED");
        session.setFinishedAt(java.time.Instant.now());
        return readingSessionRepository.save(session);
    }
}
