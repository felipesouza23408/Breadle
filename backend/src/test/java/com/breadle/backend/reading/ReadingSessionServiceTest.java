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
import com.breadle.backend.service.content.BookPage;
import com.breadle.backend.service.content.BookPageContentService;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReadingSessionServiceTest {

    private static final Long SESSION_ID = 15L;
    private static final Long USER_ID = 7L;

    private ReadingSessionRepository readingSessionRepository;
    private ReadingSessionPageRepository readingSessionPageRepository;
    private ReadingProgressEventRepository readingProgressEventRepository;
    private ReadingRewardLedgerRepository readingRewardLedgerRepository;
    private UsuarioRepository usuarioRepository;
    private LivroRepository livroRepository;
    private GamificationService gamificationService;
    private AiService aiService;
    private AiUsageService aiUsageService;
    private BookPageContentService bookPageContentService;
    private ReadingSessionService service;
    private ReadingSession session;

    @BeforeEach
    void setUp() {
        readingSessionRepository = mock(ReadingSessionRepository.class);
        readingSessionPageRepository = mock(ReadingSessionPageRepository.class);
        readingProgressEventRepository = mock(ReadingProgressEventRepository.class);
        readingRewardLedgerRepository = mock(ReadingRewardLedgerRepository.class);
        usuarioRepository = mock(UsuarioRepository.class);
        livroRepository = mock(LivroRepository.class);
        LeituraRepository leituraRepository = mock(LeituraRepository.class);
        gamificationService = mock(GamificationService.class);
        aiService = mock(AiService.class);
        aiUsageService = mock(AiUsageService.class);
        bookPageContentService = mock(BookPageContentService.class);
        when(bookPageContentService.loadPage(any(Livro.class), anyInt()))
            .thenAnswer(invocation -> new BookPage(invocation.getArgument(1), "Conteúdo oficial"));
        when(aiUsageService.execute(any())).thenAnswer(invocation -> {
            Supplier<String> operation = invocation.getArgument(0);
            return new AiResponse(operation.get(), 1, 20, 19, java.time.Instant.now());
        });
        NotificationService notificationService = mock(NotificationService.class);
        service = new ReadingSessionService(
            readingSessionRepository,
            readingSessionPageRepository,
            readingProgressEventRepository,
            readingRewardLedgerRepository,
            usuarioRepository,
            livroRepository,
            leituraRepository,
            gamificationService,
            aiService,
            aiUsageService,
            notificationService,
            bookPageContentService
        );

        session = new ReadingSession();
        session.setId(SESSION_ID);
        session.setUserId(USER_ID);
        session.setBookId(3L);
        session.setPagesDefined(10);
        session.setPagesRead(4);
        session.setStatus("ACTIVE");
        session.setAlreadyAwarded(false);
        session.setPageTrackingStarted(true);

        Usuario user = new Usuario();
        user.setId(USER_ID);
        user.setEmail("reader@example.com");
        when(usuarioRepository.findByEmail("reader@example.com")).thenReturn(Optional.of(user));
        when(readingSessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(readingSessionRepository.findByIdForUpdate(SESSION_ID)).thenReturn(Optional.of(session));
        when(readingSessionRepository.save(any(ReadingSession.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        Livro livro = new Livro();
        livro.setId(3L);
        livro.setTotalPaginas(10);
        livro.setAtivo(true);
        when(livroRepository.findById(3L)).thenReturn(Optional.of(livro));
        when(readingSessionPageRepository.findBySessionIdAndPageNumber(any(), any()))
            .thenReturn(Optional.empty());
        when(readingSessionPageRepository.findHighestPageNumber(SESSION_ID)).thenReturn(null);
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
    void shouldRejectProgressBeyondTheBookAndSessionPageLimit() {
        IllegalArgumentException error = assertThrows(
            IllegalArgumentException.class,
            () -> service.registerProgress(SESSION_ID, progress(11))
        );

        assertTrue(error.getMessage().contains("exceder"));
        verify(readingProgressEventRepository, never()).save(any(ReadingProgressEvent.class));
    }

    @Test
    void shouldRejectOpeningPageForAnotherUsersSession() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("other@example.com", "unused")
        );
        Usuario other = new Usuario();
        other.setId(99L);
        other.setEmail("other@example.com");
        when(usuarioRepository.findByEmail("other@example.com")).thenReturn(Optional.of(other));

        assertThrows(
            org.springframework.security.access.AccessDeniedException.class,
            () -> service.openPage(SESSION_ID, 1)
        );
        verify(bookPageContentService, never()).loadPage(any(Livro.class), anyInt());
        verify(readingSessionPageRepository, never()).save(any(ReadingSessionPage.class));
    }

    @Test
    void shouldRejectInvalidPageNumber() {
        assertThrows(IllegalArgumentException.class, () -> service.openPage(SESSION_ID, 0));
        assertThrows(IllegalArgumentException.class, () -> service.openPage(SESSION_ID, 11));
        verify(bookPageContentService, never()).loadPage(any(Livro.class), anyInt());
    }

    @Test
    void shouldRejectOpeningPagesForUnavailableSessionStatus() {
        session.setStatus("CANCELLED");

        assertThrows(com.breadle.backend.common.ConflictException.class,
            () -> service.openPage(SESSION_ID, 1));
        verify(bookPageContentService, never()).loadPage(any(Livro.class), anyInt());
        verify(readingSessionPageRepository, never()).save(any(ReadingSessionPage.class));
    }

    @Test
    void shouldRejectSkippingAnUnopenedPage() {
        when(readingSessionPageRepository.findHighestPageNumber(SESSION_ID)).thenReturn(2);

        assertThrows(com.breadle.backend.common.ConflictException.class,
            () -> service.openPage(SESSION_ID, 4));
        verify(readingSessionPageRepository, never()).save(any(ReadingSessionPage.class));
    }

    @Test
    void shouldRegisterPagesInOrderDuringNormalNavigation() {
        when(readingSessionPageRepository.findHighestPageNumber(SESSION_ID)).thenReturn(null, 1);

        service.openPage(SESSION_ID, 1);
        service.openPage(SESSION_ID, 2);

        ArgumentCaptor<ReadingSessionPage> captor = ArgumentCaptor.forClass(ReadingSessionPage.class);
        verify(readingSessionPageRepository, times(2)).save(captor.capture());
        assertEquals(1, captor.getAllValues().get(0).getPageNumber());
        assertEquals(2, captor.getAllValues().get(1).getPageNumber());
    }

    @Test
    void shouldRegisterNewPageAndReturnOfficialContent() {
        when(readingSessionPageRepository.findHighestPageNumber(SESSION_ID)).thenReturn(2);

        BookPage page = service.openPage(SESSION_ID, 3);

        assertEquals(3, page.number());
        assertEquals("Conteúdo oficial", page.content());
        ArgumentCaptor<ReadingSessionPage> captor = ArgumentCaptor.forClass(ReadingSessionPage.class);
        verify(readingSessionPageRepository).save(captor.capture());
        assertEquals(SESSION_ID, captor.getValue().getSessionId());
        assertEquals(3, captor.getValue().getPageNumber());
        assertTrue(captor.getValue().getOpenedAt() != null);
        verify(readingSessionRepository).save(session);
    }

    @Test
    void shouldReturnPreviouslyOpenedPageWithoutCreatingDuplicate() {
        ReadingSessionPage existing = new ReadingSessionPage();
        existing.setSessionId(SESSION_ID);
        existing.setPageNumber(3);
        when(readingSessionPageRepository.findBySessionIdAndPageNumber(SESSION_ID, 3))
            .thenReturn(Optional.of(existing));

        BookPage page = service.openPage(SESSION_ID, 3);

        assertEquals("Conteúdo oficial", page.content());
        verify(readingSessionPageRepository, never()).save(any(ReadingSessionPage.class));
    }

    @Test
    void shouldResumeLegacySessionWithoutRegisteringHistoricalPages() {
        session.setPageTrackingStarted(false);
        session.setPagesRead(4);
        when(readingSessionPageRepository.findBySessionIdAndPageNumber(SESSION_ID, 4))
            .thenReturn(Optional.empty());

        service.openPage(SESSION_ID, 3);

        verify(readingSessionPageRepository, never()).save(any(ReadingSessionPage.class));
        when(readingSessionPageRepository.findBySessionIdAndPageNumber(SESSION_ID, 5))
            .thenReturn(Optional.empty());
        service.openPage(SESSION_ID, 5);
        verify(readingSessionPageRepository).save(any(ReadingSessionPage.class));
        assertTrue(session.getPageTrackingStarted());
    }

    @Test
    void shouldRejectLegacySessionProgressBeyondTheBooksRealTotal() {
        when(livroRepository.findById(3L)).thenAnswer(invocation -> {
            Livro book = new Livro();
            book.setId(3L);
            book.setTotalPaginas(6);
            return Optional.of(book);
        });

        IllegalArgumentException error = assertThrows(
            IllegalArgumentException.class,
            () -> service.registerProgress(SESSION_ID, progress(5))
        );

        assertTrue(error.getMessage().contains("total real"));
        verify(readingProgressEventRepository, never()).save(any(ReadingProgressEvent.class));
    }

    @Test
    void shouldRejectSessionPageCountBeyondTheBooksRealTotal() {
        Usuario user = new Usuario();
        user.setId(USER_ID);
        when(usuarioRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(livroRepository.findById(3L)).thenAnswer(invocation -> {
            Livro book = new Livro();
            book.setId(3L);
            book.setTotalPaginas(8);
            return Optional.of(book);
        });

        ReadingSessionRequest request = new ReadingSessionRequest();
        request.setBookId(3L);
        request.setPagesDefined(9);

        IllegalArgumentException error = assertThrows(
            IllegalArgumentException.class,
            () -> service.createSession(request)
        );

        assertTrue(error.getMessage().contains("total real"));
        verify(readingSessionRepository, never()).save(any(ReadingSession.class));
    }

    @Test
    void shouldAwardCompletionOnlyOnceWhenCompletionIsRetried() {
        session.setPagesRead(10);
        when(readingRewardLedgerRepository.findFirstBySessionIdAndRewardType(SESSION_ID, "READING_COMPLETION"))
            .thenReturn(Optional.empty());
        when(gamificationService.calculateReadingPoints(10, 10, true)).thenReturn(100);
        Usuario user = new Usuario();
        user.setId(USER_ID);
        user.setPontosTotais(0);
        when(usuarioRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(livroRepository.findById(3L)).thenAnswer(invocation -> {
            Livro book = new Livro();
            book.setId(3L);
            book.setTitulo("O Livro");
            book.setTotalPaginas(10);
            book.setPontuacaoBase(10);
            return Optional.of(book);
        });

        ReadingSession firstResult = service.completeSession(SESSION_ID);
        ReadingSession retryResult = service.completeSession(SESSION_ID);

        assertEquals(100, firstResult.getPointsAwarded());
        assertEquals("COMPLETED", retryResult.getStatus());
        verify(gamificationService, times(1)).calculateReadingPoints(10, 10, true);
        verify(readingRewardLedgerRepository, times(1)).save(any(ReadingRewardLedger.class));
        verify(usuarioRepository, times(1)).save(user);
    }

    @Test
    void shouldNotAwardAgainWhenLedgerAlreadyContainsTheCompletion() {
        session.setPagesRead(10);
        ReadingRewardLedger existingReward = new ReadingRewardLedger();
        existingReward.setPointsAwarded(100);
        when(readingRewardLedgerRepository.findFirstBySessionIdAndRewardType(SESSION_ID, "READING_COMPLETION"))
            .thenReturn(Optional.of(existingReward));
        when(livroRepository.findById(3L)).thenAnswer(invocation -> {
            Livro book = new Livro();
            book.setId(3L);
            book.setTitulo("O Livro");
            book.setTotalPaginas(10);
            book.setPontuacaoBase(10);
            return Optional.of(book);
        });

        ReadingSession result = service.completeSession(SESSION_ID);

        assertEquals(100, result.getPointsAwarded());
        assertEquals(true, result.getAlreadyAwarded());
        verify(gamificationService, never()).calculateReadingPoints(anyInt(), anyInt(), anyBoolean());
        verify(readingRewardLedgerRepository, never()).save(any(ReadingRewardLedger.class));
        verify(usuarioRepository, never()).save(any(Usuario.class));
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
