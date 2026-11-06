package com.breadle.backend.reading;

import com.breadle.backend.ai.AiProviderException;
import com.breadle.backend.ai.AiResponse;
import com.breadle.backend.ai.AiService;
import com.breadle.backend.ai.AiUsageService;
import com.breadle.backend.ai.StubAiService;
import com.breadle.backend.common.ConflictException;
import com.breadle.backend.entity.Livro;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.repository.UsuarioRepository;
import com.breadle.backend.service.content.BookPage;
import com.breadle.backend.service.content.BookPageContentService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReadingAssessmentServiceTest {
    private static final long SESSION_ID = 15L;
    private static final long USER_ID = 7L;
    private static final String PAGE_TEXT = "A personagem abriu a janela e observou a chuva cair no jardim.";
    private static final String UNOPENED_PAGE_TEXT = "Este conteúdo pertence a uma página que não foi aberta.";

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final StubAiService stubAiService = new StubAiService();
    private ReadingSessionRepository sessionRepository;
    private ReadingSessionPageRepository sessionPageRepository;
    private ReadingAssessmentRepository assessmentRepository;
    private AssessmentQuestionRepository questionRepository;
    private AssessmentAnswerRepository answerRepository;
    private LivroRepository bookRepository;
    private UsuarioRepository userRepository;
    private BookPageContentService pageContentService;
    private AiService aiService;
    private AiUsageService aiUsageService;
    private ReadingAssessmentService service;
    private ReadingSession session;
    private final List<AssessmentQuestion> savedQuestions = new ArrayList<>();
    private final java.util.Map<Long, AssessmentAnswer> savedAnswers = new java.util.HashMap<>();

    @BeforeEach
    void setUp() {
        sessionRepository = mock(ReadingSessionRepository.class);
        sessionPageRepository = mock(ReadingSessionPageRepository.class);
        assessmentRepository = mock(ReadingAssessmentRepository.class);
        questionRepository = mock(AssessmentQuestionRepository.class);
        answerRepository = mock(AssessmentAnswerRepository.class);
        bookRepository = mock(LivroRepository.class);
        userRepository = mock(UsuarioRepository.class);
        pageContentService = mock(BookPageContentService.class);
        aiService = mock(AiService.class);
        aiUsageService = mock(AiUsageService.class);

        service = new ReadingAssessmentService(
                sessionRepository,
                sessionPageRepository,
                assessmentRepository,
                questionRepository,
                answerRepository,
                bookRepository,
                userRepository,
                pageContentService,
                aiService,
                aiUsageService,
                objectMapper);

        session = new ReadingSession();
        session.setId(SESSION_ID);
        session.setUserId(USER_ID);
        session.setBookId(3L);
        session.setPagesDefined(2);
        session.setPagesRead(1);
        session.setStatus("ACTIVE");

        Usuario user = new Usuario();
        user.setId(USER_ID);
        user.setEmail("reader@example.com");
        when(userRepository.findByEmail("reader@example.com")).thenReturn(Optional.of(user));
        when(sessionRepository.findByIdForUpdate(SESSION_ID)).thenReturn(Optional.of(session));
        when(sessionRepository.findById(SESSION_ID)).thenReturn(Optional.of(session));
        when(sessionPageRepository.findBySessionIdOrderByPageNumber(SESSION_ID))
                .thenReturn(List.of(openedPage(1)));
        when(pageContentService.loadPages(any(Livro.class))).thenReturn(List.of(
                new BookPage(1, PAGE_TEXT),
                new BookPage(2, UNOPENED_PAGE_TEXT)));
        Livro book = new Livro();
        book.setId(3L);
        book.setTitulo("Livro de teste");
        book.setTotalPaginas(2);
        when(bookRepository.findById(3L)).thenReturn(Optional.of(book));

        when(aiUsageService.execute(any())).thenAnswer(invocation -> {
            Supplier<String> operation = invocation.getArgument(0);
            return new AiResponse(operation.get(), 1, 20, 19, Instant.now());
        });
        when(aiService.generateStructuredAssessment(anyString(), anyString())).thenAnswer(invocation ->
                stubAiService.generateStructuredAssessment(invocation.getArgument(0), invocation.getArgument(1)));
        when(aiService.evaluateStructuredAnswer(anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenAnswer(invocation -> stubAiService.evaluateStructuredAnswer(
                        invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2),
                        invocation.getArgument(3), invocation.getArgument(4)));

        when(assessmentRepository.findBySessionId(SESSION_ID)).thenReturn(Optional.empty());
        when(assessmentRepository.save(any(ReadingAssessment.class))).thenAnswer(invocation -> {
            ReadingAssessment assessment = invocation.getArgument(0);
            assessment.setId(90L);
            return assessment;
        });
        when(assessmentRepository.findById(90L)).thenAnswer(invocation -> {
            ReadingAssessment assessment = new ReadingAssessment();
            assessment.setId(90L);
            assessment.setSessionId(SESSION_ID);
            assessment.setPageNumbers("1");
            assessment.setContextHash(contextHash("[Página 1] " + PAGE_TEXT));
            return Optional.of(assessment);
        });
        when(questionRepository.save(any(AssessmentQuestion.class))).thenAnswer(invocation -> {
            AssessmentQuestion question = invocation.getArgument(0);
            question.setId(500L + savedQuestions.size());
            savedQuestions.add(question);
            return question;
        });
        when(questionRepository.findByAssessmentIdOrderByQuestionOrder(90L)).thenAnswer(invocation ->
                List.copyOf(savedQuestions));
        when(answerRepository.findByQuestionId(anyLong())).thenAnswer(invocation ->
                Optional.ofNullable(savedAnswers.get(invocation.getArgument(0))));
        when(answerRepository.save(any(AssessmentAnswer.class))).thenAnswer(invocation -> {
            AssessmentAnswer answer = invocation.getArgument(0);
            answer.setId((long) savedAnswers.size() + 1);
            savedAnswers.put(answer.getQuestionId(), answer);
            return answer;
        });
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("reader@example.com", "unused"));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createsThreeQuestionsUsingOnlyOpenedOfficialPagesForAnIncompleteActiveSession() throws Exception {
        ReadingAssessmentDto assessment = service.createOrGet(SESSION_ID);

        assertEquals(3, assessment.questions().size());
        assertEquals(List.of(1), assessment.pages());
        verify(aiService).generateStructuredAssessment("Livro de teste", "[Página 1] " + PAGE_TEXT);
    }

    @Test
    void createsOnlyOneAssessmentForAReadingSession() {
        ReadingAssessmentDto first = service.createOrGet(SESSION_ID);
        ReadingAssessment stored = new ReadingAssessment();
        stored.setId(90L);
        stored.setSessionId(SESSION_ID);
        stored.setPageNumbers("1");
        when(assessmentRepository.findBySessionId(SESSION_ID)).thenReturn(Optional.of(stored));

        ReadingAssessmentDto second = service.createOrGet(SESSION_ID);

        assertEquals(first.id(), second.id());
        verify(aiService).generateStructuredAssessment(anyString(), anyString());
        verify(assessmentRepository).save(any(ReadingAssessment.class));
    }

    @Test
    void refusesToCreateAnAssessmentWithoutRegisteredPages() {
        when(sessionPageRepository.findBySessionIdOrderByPageNumber(SESSION_ID)).thenReturn(List.of());

        assertThrows(ConflictException.class, () -> service.createOrGet(SESSION_ID));
        verify(aiService, never()).generateStructuredAssessment(anyString(), anyString());
    }

    @Test
    void refusesAccessWhenTheAuthenticatedUserDoesNotOwnTheSession() {
        session.setUserId(88L);

        assertThrows(AccessDeniedException.class, () -> service.createOrGet(SESSION_ID));
        verify(aiService, never()).generateStructuredAssessment(anyString(), anyString());
    }

    @Test
    void refusesAssessmentForUnavailableSessionState() {
        session.setStatus("PAUSED");

        assertThrows(ConflictException.class, () -> service.createOrGet(SESSION_ID));
        verify(aiService, never()).generateStructuredAssessment(anyString(), anyString());
    }

    @Test
    void invalidAiOutputDoesNotPersistAssessmentOrQuestions() {
        doReturn("{broken").when(aiService).generateStructuredAssessment(anyString(), anyString());

        assertThrows(IllegalArgumentException.class, () -> service.createOrGet(SESSION_ID));
        verify(assessmentRepository, never()).save(any(ReadingAssessment.class));
        verify(questionRepository, never()).save(any(AssessmentQuestion.class));
    }

    @Test
    void publicAssessmentDtoDoesNotSerializeAnswerKeysRubricsOrEvidence() throws Exception {
        ReadingAssessmentDto assessment = service.createOrGet(SESSION_ID);

        String json = objectMapper.writeValueAsString(assessment);
        assertFalse(json.contains("expectedAnswer"));
        assertFalse(json.contains("rubric"));
        assertFalse(json.contains("evidence"));
        assertFalse(json.contains("correctOption"));
        assertTrue(json.contains("MULTIPLE_CHOICE"));
    }

    @Test
    void correctAndIncorrectMultipleChoiceResponsesAreGradedByBackendAndRepeatedSubmissionIsIdempotent() {
        AssessmentQuestion question = multipleChoiceQuestion(500L);
        when(questionRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(question));
        when(answerRepository.findByQuestionId(500L)).thenAnswer(invocation ->
                Optional.ofNullable(savedAnswers.get(500L)));

        AssessmentAnswerDto correct = service.submitAnswer(
                SESSION_ID, 500L, new AssessmentAnswerRequest(null, 0));
        AssessmentAnswerDto repeated = service.submitAnswer(
                SESSION_ID, 500L, new AssessmentAnswerRequest(null, 2));
        assertTrue(correct.correct());
        assertTrue(repeated.correct());
        assertEquals(correct.feedback(), repeated.feedback());

        AssessmentQuestion wrongQuestion = multipleChoiceQuestion(501L);
        when(questionRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(wrongQuestion));
        AssessmentAnswerDto incorrect = service.submitAnswer(
                SESSION_ID, 501L, new AssessmentAnswerRequest(null, 2));
        assertFalse(incorrect.correct());
        verify(aiService, never()).evaluateStructuredAnswer(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void refusesQuestionFromAnotherSession() {
        AssessmentQuestion question = multipleChoiceQuestion(500L);
        question.setAssessmentId(91L);
        when(questionRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(question));
        ReadingAssessment otherAssessment = new ReadingAssessment();
        otherAssessment.setSessionId(99L);
        when(assessmentRepository.findById(91L)).thenReturn(Optional.of(otherAssessment));

        assertThrows(jakarta.persistence.EntityNotFoundException.class, () ->
                service.submitAnswer(SESSION_ID, 500L, new AssessmentAnswerRequest(null, 0)));
        verify(answerRepository, never()).save(any(AssessmentAnswer.class));
    }

    @Test
    void providerFailureDoesNotPersistAnOpenAnswer() {
        AssessmentQuestion question = openQuestion();
        when(questionRepository.findByIdForUpdate(600L)).thenReturn(Optional.of(question));
        when(assessmentRepository.findById(90L)).thenReturn(Optional.of(existingAssessment()));
        doThrow(new AiProviderException("Falha do provedor")).when(aiUsageService).execute(any());

        assertThrows(AiProviderException.class, () -> service.submitAnswer(
                SESSION_ID, 600L, new AssessmentAnswerRequest("Uma resposta", null)));
        verify(answerRepository, never()).save(any(AssessmentAnswer.class));
    }

    @Test
    void rejectsOpenAnswerCorrectionWhenOfficialPageContextChanged() {
        AssessmentQuestion question = openQuestion();
        ReadingAssessment changed = existingAssessment();
        changed.setContextHash("0".repeat(64));
        when(questionRepository.findByIdForUpdate(600L)).thenReturn(Optional.of(question));
        when(assessmentRepository.findById(90L)).thenReturn(Optional.of(changed));

        assertThrows(ConflictException.class, () -> service.submitAnswer(
                SESSION_ID, 600L, new AssessmentAnswerRequest("Minha resposta", null)));
        verify(aiService, never()).evaluateStructuredAnswer(anyString(), anyString(), anyString(), anyString(), anyString());
        verify(answerRepository, never()).save(any(AssessmentAnswer.class));
    }

    @Test
    void openAnswersAreCorrectedAndFeedbackDoesNotReturnTheAnswerKey() {
        AssessmentQuestion question = openQuestion();
        when(questionRepository.findByIdForUpdate(600L)).thenReturn(Optional.of(question));
        when(assessmentRepository.findById(90L)).thenReturn(Optional.of(existingAssessment()));

        AssessmentAnswerDto correct = service.submitAnswer(
                SESSION_ID, 600L, new AssessmentAnswerRequest(PAGE_TEXT, null));
        AssessmentQuestion incorrectQuestion = openQuestion();
        incorrectQuestion.setId(601L);
        when(questionRepository.findByIdForUpdate(601L)).thenReturn(Optional.of(incorrectQuestion));
        AssessmentAnswerDto incorrect = service.submitAnswer(
                SESSION_ID, 601L, new AssessmentAnswerRequest("Não sei", null));

        assertTrue(correct.correct());
        assertFalse(incorrect.correct());
        assertFalse(correct.feedback().contains(PAGE_TEXT));
        assertFalse(incorrect.feedback().contains(PAGE_TEXT));
    }

    @Test
    void stubReturnsStructuredAssessmentWithThreeVariedQuestions() throws Exception {
        String output = stubAiService.generateStructuredAssessment("Livro", "[Página 1] " + PAGE_TEXT);
        JsonNode questions = objectMapper.readTree(output).path("questions");

        assertEquals(3, questions.size());
        assertEquals("MULTIPLE_CHOICE", questions.get(0).path("type").asText());
        assertEquals("SHORT_ANSWER", questions.get(1).path("type").asText());
        assertEquals("INFERENCE_EVIDENCE", questions.get(2).path("type").asText());
        int correctOption = questions.get(0).path("correctOption").asInt(-1);
        assertTrue(correctOption >= 0 && correctOption < 4);
        assertEquals(4, questions.get(0).path("options").size());
        assertEquals(questions.get(0).path("expectedAnswer").asText(),
                questions.get(0).path("options").get(correctOption).asText());
        assertTrue(questions.get(1).path("correctOption").isNull());
        assertTrue(questions.get(0).path("evidence").asText().contains(PAGE_TEXT.substring(0, 10)));
    }

    private ReadingSessionPage openedPage(int number) {
        ReadingSessionPage page = new ReadingSessionPage();
        page.setSessionId(SESSION_ID);
        page.setPageNumber(number);
        return page;
    }

    private AssessmentQuestion multipleChoiceQuestion(long id) {
        AssessmentQuestion question = new AssessmentQuestion();
        question.setId(id);
        question.setAssessmentId(90L);
        question.setType("MULTIPLE_CHOICE");
        question.setCorrectOption(0);
        question.setEvidence(PAGE_TEXT);
        question.setOptionsJson("[\"" + PAGE_TEXT + "\",\"Outro detalhe\",\"Mais um\",\"Uma situação diversa\"]");
        return question;
    }

    private AssessmentQuestion openQuestion() {
        AssessmentQuestion question = new AssessmentQuestion();
        question.setId(600L);
        question.setAssessmentId(90L);
        question.setType("SHORT_ANSWER");
        question.setPrompt("Que detalhe aparece?");
        question.setCorrectOption(null);
        question.setExpectedAnswer(PAGE_TEXT);
        question.setRubric("Identifica um detalhe da evidência.");
        question.setEvidence(PAGE_TEXT);
        return question;
    }

    private ReadingAssessment existingAssessment() {
        ReadingAssessment assessment = new ReadingAssessment();
        assessment.setId(90L);
        assessment.setSessionId(SESSION_ID);
        assessment.setPageNumbers("1");
        assessment.setContextHash(contextHash("[Página 1] " + PAGE_TEXT));
        return assessment;
    }

    private String contextHash(String context) {
        try {
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest(context.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
