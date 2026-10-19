package com.breadle.backend.reading;

import com.breadle.backend.ai.AiService;
import com.breadle.backend.ai.AiResponse;
import com.breadle.backend.ai.AiUsageService;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.entity.Livro;
import com.breadle.backend.gamification.GamificationService;
import com.breadle.backend.notification.NotificationService;
import com.breadle.backend.repository.LeituraRepository;
import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReadingSessionServiceTest {

    private static final Long SESSION_ID = 15L;
    private static final Long USER_ID = 7L;

    private ReadingSessionRepository readingSessionRepository;
    private ReadingProgressEventRepository readingProgressEventRepository;
    private UsuarioRepository usuarioRepository;
    private LivroRepository livroRepository;
    private AiService aiService;
    private AiUsageService aiUsageService;
    private ReadingSessionService service;
    private ReadingSession session;

    @BeforeEach
    void setUp() {
        readingSessionRepository = mock(ReadingSessionRepository.class);
        readingProgressEventRepository = mock(ReadingProgressEventRepository.class);
        ReadingRewardLedgerRepository rewardLedgerRepository = mock(ReadingRewardLedgerRepository.class);
        usuarioRepository = mock(UsuarioRepository.class);
        livroRepository = mock(LivroRepository.class);
        LeituraRepository leituraRepository = mock(LeituraRepository.class);
        GamificationService gamificationService = mock(GamificationService.class);
        aiService = mock(AiService.class);
        aiUsageService = mock(AiUsageService.class);
        when(aiUsageService.execute(any())).thenAnswer(invocation -> {
            Supplier<String> operation = invocation.getArgument(0);
            return new AiResponse(operation.get(), 1, 20, 19, java.time.Instant.now());
        });
        NotificationService notificationService = mock(NotificationService.class);
        service = new ReadingSessionService(
            readingSessionRepository,
            readingProgressEventRepository,
            rewardLedgerRepository,
            usuarioRepository,
            livroRepository,
            leituraRepository,
            gamificationService,
            aiService,
            aiUsageService,
            notificationService
        );

        session = new ReadingSession();
        session.setId(SESSION_ID);
        session.setUserId(USER_ID);
        session.setBookId(3L);
        session.setPagesDefined(10);
        session.setPagesRead(4);
        session.setStatus("ACTIVE");
        session.setAlreadyAwarded(false);

        Usuario user = new Usuario();
        user.setId(USER_ID);
        user.setEmail("reader@example.com");
        when(usuarioRepository.findByEmail("reader@example.com")).thenReturn(Optional.of(user));
        when(readingSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(readingSessionRepository.save(any(ReadingSession.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("reader@example.com", "unused")
        );
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldCountOnlyNewHighestPagesAsReadingProgress() {
        ReadingSession afterProgress = service.registerProgress(SESSION_ID, progress(7));
        ReadingSession afterMovingBack = service.registerProgress(SESSION_ID, progress(5));

        assertEquals(7, afterProgress.getPagesRead());
        assertEquals(7, afterMovingBack.getPagesRead());
        ArgumentCaptor<ReadingProgressEvent> eventCaptor = ArgumentCaptor.forClass(ReadingProgressEvent.class);
        verify(readingProgressEventRepository, times(1)).save(eventCaptor.capture());
        assertEquals(3, eventCaptor.getValue().getPagesReadDelta());
    }

    @Test
    void shouldNotAllowCompletingAnUnfinishedSession() {
        assertThrows(IllegalArgumentException.class, () -> service.completeSession(SESSION_ID));
        verify(readingProgressEventRepository, never()).save(any(ReadingProgressEvent.class));
    }

    @Test
    void shouldGenerateQuestionsOnlyFromTheSubmittedReadExcerptAndCountTheAiUse() {
        Livro book = new Livro();
        book.setId(3L);
        book.setTitulo("O Livro");
        when(livroRepository.findById(3L)).thenReturn(Optional.of(book));
        when(aiService.generateQuestions("O Livro", "Somente este trecho lido."))
            .thenReturn("Perguntas sobre o trecho.");

        ReadingAiQuestionRequest request = new ReadingAiQuestionRequest();
        request.setExcerpt("Somente este trecho lido.");

        String questions = service.generateQuestionsForExcerpt(SESSION_ID, request);

        assertEquals("Perguntas sobre o trecho.", questions);
        verify(aiService).generateQuestions("O Livro", "Somente este trecho lido.");
        verify(aiUsageService).execute(any());
    }

    private ReadingProgressRequest progress(int pagesRead) {
        ReadingProgressRequest request = new ReadingProgressRequest();
        request.setPagesRead(pagesRead);
        return request;
    }
}
