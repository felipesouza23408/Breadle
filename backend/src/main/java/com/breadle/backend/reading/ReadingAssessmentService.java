package com.breadle.backend.reading;

import com.breadle.backend.ai.AiService;
import com.breadle.backend.ai.AiUsageService;
import com.breadle.backend.common.ConflictException;
import com.breadle.backend.entity.Livro;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.LivroRepository;
import com.breadle.backend.repository.UsuarioRepository;
import com.breadle.backend.service.content.BookPage;
import com.breadle.backend.service.content.BookPageContentService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

@Service
public class ReadingAssessmentService {
    private static final int MAX_CONTEXT_LENGTH = 6_500;
    private static final int MAX_ANSWER_LENGTH = 2_000;
    private static final Set<String> QUESTION_TYPES =
            Set.of("MULTIPLE_CHOICE", "SHORT_ANSWER", "INFERENCE_EVIDENCE");

    private final ReadingSessionRepository sessionRepository;
    private final ReadingSessionPageRepository sessionPageRepository;
    private final ReadingAssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository questionRepository;
    private final AssessmentAnswerRepository answerRepository;
    private final LivroRepository bookRepository;
    private final UsuarioRepository userRepository;
    private final BookPageContentService pageContentService;
    private final AiService aiService;
    private final AiUsageService aiUsageService;
    private final ObjectMapper objectMapper;

    public ReadingAssessmentService(
            ReadingSessionRepository sessionRepository,
            ReadingSessionPageRepository sessionPageRepository,
            ReadingAssessmentRepository assessmentRepository,
            AssessmentQuestionRepository questionRepository,
            AssessmentAnswerRepository answerRepository,
            LivroRepository bookRepository,
            UsuarioRepository userRepository,
            BookPageContentService pageContentService,
            AiService aiService,
            AiUsageService aiUsageService,
            ObjectMapper objectMapper) {
        this.sessionRepository = sessionRepository;
        this.sessionPageRepository = sessionPageRepository;
        this.assessmentRepository = assessmentRepository;
        this.questionRepository = questionRepository;
        this.answerRepository = answerRepository;
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.pageContentService = pageContentService;
        this.aiService = aiService;
        this.aiUsageService = aiUsageService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ReadingAssessmentDto createOrGet(Long sessionId) {
        ReadingSession session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Sessão de leitura não encontrada."));
        ensureOwner(session);
        ensureUsableSession(session);
        var existing = assessmentRepository.findBySessionId(sessionId);
        if (existing.isPresent()) {
            return toDto(existing.get());
        }

        List<Integer> pageNumbers = sessionPageRepository.findBySessionIdOrderByPageNumber(sessionId).stream()
                .map(ReadingSessionPage::getPageNumber)
                .toList();
        if (pageNumbers.isEmpty()) {
            throw new ConflictException("Abra ao menos uma página nesta sessão antes de gerar a avaliação.");
        }

        Livro book = bookRepository.findById(session.getBookId())
                .orElseThrow(() -> new EntityNotFoundException("Livro da sessão não encontrado."));
        String context = loadRegisteredPageContext(session, book, pageNumbers);
        String generated = aiUsageService.execute(
                () -> aiService.generateStructuredAssessment(book.getTitulo(), context)).result();
        List<QuestionDraft> drafts = parseAndValidateQuestions(generated, context);

        ReadingAssessment assessment = new ReadingAssessment();
        assessment.setSessionId(sessionId);
        assessment.setContextHash(sha256(context));
        assessment.setPageNumbers(pageNumbers.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(",")));
        assessment = assessmentRepository.save(assessment);

        int order = 1;
        for (QuestionDraft draft : drafts) {
            AssessmentQuestion question = new AssessmentQuestion();
            question.setAssessmentId(assessment.getId());
            question.setQuestionOrder(order++);
            question.setType(draft.type());
            question.setDifficulty(draft.difficulty());
            question.setPrompt(draft.prompt());
            question.setOptionsJson(writeOptions(draft.options()));
            question.setCorrectOption(draft.correctOption());
            question.setExpectedAnswer(draft.expectedAnswer());
            question.setRubric(draft.rubric());
            question.setEvidence(draft.evidence());
            questionRepository.save(question);
        }
        return toDto(assessment);
    }

    @Transactional
    public AssessmentAnswerDto submitAnswer(Long sessionId, Long questionId, AssessmentAnswerRequest request) {
        AssessmentQuestion question = questionRepository.findByIdForUpdate(questionId)
                .orElseThrow(() -> new EntityNotFoundException("Pergunta da avaliação não encontrada."));
        ReadingAssessment assessment = assessmentRepository.findById(question.getAssessmentId())
                .orElseThrow(() -> new EntityNotFoundException("Avaliação não encontrada."));
        if (!assessment.getSessionId().equals(sessionId)) {
            throw new EntityNotFoundException("Pergunta não pertence à sessão informada.");
        }
        ReadingSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Sessão de leitura não encontrada."));
        ensureOwner(session);
        ensureUsableSession(session);

        var previousAnswer = answerRepository.findByQuestionId(questionId);
        if (previousAnswer.isPresent()) {
            return toAnswerDto(previousAnswer.get());
        }
        if (request == null) {
            throw new IllegalArgumentException("Envie uma resposta para a pergunta.");
        }

        boolean multipleChoice = "MULTIPLE_CHOICE".equals(question.getType());
        String answerText;
        boolean correct;
        String feedback;
        if (multipleChoice) {
            if (request.selectedOption() == null || request.answer() != null
                    || request.selectedOption() < 0 || request.selectedOption() > 3) {
                throw new IllegalArgumentException("Selecione uma alternativa válida.");
            }
            List<String> options = readOptions(question.getOptionsJson());
            if (request.selectedOption() >= options.size()) {
                throw new IllegalArgumentException("A alternativa selecionada não existe.");
            }
            answerText = Integer.toString(request.selectedOption());
            correct = request.selectedOption().equals(question.getCorrectOption());
            feedback = correct
                    ? "Boa leitura! Você encontrou uma resposta compatível com as páginas que abriu."
                    : "Ainda dá para revisar: releia uma das páginas abertas e procure uma pista para responder.";
        } else {
            if (request.selectedOption() != null || request.answer() == null
                    || request.answer().isBlank() || request.answer().length() > MAX_ANSWER_LENGTH) {
                throw new IllegalArgumentException("A resposta deve conter entre 1 e 2000 caracteres.");
            }
            answerText = request.answer().trim();
            if (answerText.length() > MAX_ANSWER_LENGTH) {
                throw new IllegalArgumentException("A resposta deve conter no máximo 2000 caracteres.");
            }
            Livro book = bookRepository.findById(session.getBookId())
                    .orElseThrow(() -> new EntityNotFoundException("Livro da sessão não encontrado."));
            List<Integer> pageNumbers = parsePageNumbers(assessment.getPageNumbers());
            String context = loadRegisteredPageContext(session, book, pageNumbers);
            if (!sha256(context).equals(assessment.getContextHash())) {
                throw new ConflictException("O conteúdo oficial das páginas mudou desde a criação da avaliação.");
            }
            String output = aiUsageService.execute(() -> aiService.evaluateStructuredAnswer(
                    question.getPrompt(), context, question.getExpectedAnswer(), question.getRubric(), answerText)).result();
            Evaluation evaluation = parseAndValidateEvaluation(output, context);
            if (!evaluation.evidence().equals(question.getEvidence())) {
                throw invalidAiOutput();
            }
            correct = evaluation.correct();
            feedback = correct
                    ? "Boa leitura! Sua resposta está apoiada nas páginas que você abriu nesta sessão."
                    : "Não desanime: releia uma das páginas abertas e procure uma pista que ajude a sustentar sua resposta.";
        }

        AssessmentAnswer answer = new AssessmentAnswer();
        answer.setQuestionId(questionId);
        answer.setAnswerText(answerText);
        answer.setCorrect(correct);
        answer.setFeedback(feedback);
        return toAnswerDto(answerRepository.save(answer));
    }

    private void ensureUsableSession(ReadingSession session) {
        if (!"ACTIVE".equals(session.getStatus()) && !"COMPLETED".equals(session.getStatus())) {
            throw new ConflictException("A sessão de leitura não está disponível para avaliação.");
        }
        if (session.getPagesDefined() == null || session.getPagesDefined() < 1) {
            throw new ConflictException("A sessão de leitura possui um intervalo inválido.");
        }
    }

    private void ensureOwner(ReadingSession session) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AccessDeniedException("Usuário não autenticado.");
        }
        Usuario user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Usuário autenticado não encontrado."));
        if (!session.getUserId().equals(user.getId())) {
            throw new AccessDeniedException("Você não tem permissão para acessar esta sessão de leitura.");
        }
    }

    private String loadRegisteredPageContext(ReadingSession session, Livro book, List<Integer> pageNumbers) {
        if (!Boolean.TRUE.equals(book.getAtivo()) || book.getTotalPaginas() == null
                || book.getTotalPaginas() < 1 || session.getPagesDefined() > book.getTotalPaginas()) {
            throw new ConflictException("O livro ou o intervalo definido para a sessão não está disponível.");
        }
        List<ReadingSessionPage> openedPages = sessionPageRepository.findBySessionIdOrderByPageNumber(session.getId());
        Set<Integer> registered = openedPages.stream().map(ReadingSessionPage::getPageNumber)
                .collect(java.util.stream.Collectors.toSet());
        if (pageNumbers.isEmpty() || pageNumbers.stream().anyMatch(page ->
                page == null || page < 1 || page > session.getPagesDefined() || !registered.contains(page))) {
            throw new ConflictException("A avaliação só pode usar páginas abertas nesta sessão.");
        }

        List<BookPage> officialPages = pageContentService.loadPages(book);
        StringBuilder context = new StringBuilder();
        boolean hasText = false;
        for (Integer pageNumber : pageNumbers) {
            if (pageNumber > officialPages.size()) {
                throw new ConflictException("Uma página registrada não existe mais no conteúdo oficial do livro.");
            }
            String pageText = officialPages.get(pageNumber - 1).content();
            if (pageText == null || pageText.isBlank()) {
                continue;
            }
            String header = "[Página " + pageNumber + "] ";
            if (context.length() >= MAX_CONTEXT_LENGTH) {
                break;
            }
            context.append(header);
            int remaining = MAX_CONTEXT_LENGTH - context.length() - 1;
            if (remaining > 0) {
                context.append(pageText, 0, Math.min(pageText.length(), remaining));
                hasText = true;
            }
            context.append('\n');
        }
        if (!hasText || context.toString().isBlank()) {
            throw new ConflictException("As páginas abertas não possuem texto disponível para a avaliação.");
        }
        return context.toString().trim();
    }

    private List<QuestionDraft> parseAndValidateQuestions(String output, String context) {
        if (output == null || output.isBlank()) {
            throw invalidAiOutput();
        }
        try {
            JsonNode root = objectMapper.readTree(output);
            requireFields(root, Set.of("questions"));
            JsonNode questions = root.path("questions");
            if (!questions.isArray() || questions.size() != 3) {
                throw invalidAiOutput();
            }
            List<QuestionDraft> drafts = new ArrayList<>();
            Set<String> types = new java.util.HashSet<>();
            Set<String> difficulties = new java.util.HashSet<>();
            for (JsonNode node : questions) {
                requireFields(node, Set.of("type", "difficulty", "prompt", "options", "correctOption",
                        "expectedAnswer", "rubric", "evidence"));
                String type = boundedText(node, "type", 32);
                String difficulty = boundedText(node, "difficulty", 10);
                String prompt = boundedText(node, "prompt", 600);
                String expected = boundedText(node, "expectedAnswer", 2000);
                String rubric = boundedText(node, "rubric", 1200);
                String evidence = boundedText(node, "evidence", 1000);
                if (!QUESTION_TYPES.contains(type) || !Set.of("EASY", "MEDIUM", "HARD").contains(difficulty)
                        || !types.add(type) || !difficulties.add(difficulty) || !context.contains(evidence)) {
                    throw invalidAiOutput();
                }
                JsonNode optionNode = node.path("options");
                if (!optionNode.isArray()) {
                    throw invalidAiOutput();
                }
                List<String> options = new ArrayList<>();
                for (JsonNode option : optionNode) {
                    if (!option.isTextual() || option.asText().isBlank() || option.asText().length() > 300) {
                        throw invalidAiOutput();
                    }
                    options.add(option.asText().trim());
                }
                Integer correctOption = node.path("correctOption").isIntegralNumber()
                        ? node.path("correctOption").intValue() : null;
                if ("MULTIPLE_CHOICE".equals(type)) {
                    if (options.size() != 4 || correctOption == null || correctOption < 0 || correctOption >= 4
                            || !normalize(options.get(correctOption)).equals(normalize(expected))
                            || options.stream().map(this::normalize).distinct().count() != 4) {
                        throw invalidAiOutput();
                    }
                } else if (!options.isEmpty() || !node.path("correctOption").isNull()) {
                    throw invalidAiOutput();
                }
                drafts.add(new QuestionDraft(type, difficulty, prompt, options, correctOption, expected, rubric, evidence));
            }
            return drafts;
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            if (ex instanceof InvalidAiOutputException invalid) {
                throw invalid;
            }
            throw invalidAiOutput();
        }
    }

    private Evaluation parseAndValidateEvaluation(String output, String context) {
        if (output == null || output.isBlank()) {
            throw invalidAiOutput();
        }
        try {
            JsonNode root = objectMapper.readTree(output);
            requireFields(root, Set.of("correct", "evidence"));
            if (!root.path("correct").isBoolean()) {
                throw invalidAiOutput();
            }
            String evidence = boundedText(root, "evidence", 1000);
            if (!context.contains(evidence)) {
                throw invalidAiOutput();
            }
            return new Evaluation(root.path("correct").booleanValue(), evidence);
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            if (ex instanceof InvalidAiOutputException invalid) {
                throw invalid;
            }
            throw invalidAiOutput();
        }
    }

    private void requireFields(JsonNode node, Set<String> expected) {
        if (!node.isObject() || node.size() != expected.size()) {
            throw invalidAiOutput();
        }
        Set<String> actual = new java.util.HashSet<>();
        node.fieldNames().forEachRemaining(actual::add);
        if (!actual.equals(expected)) {
            throw invalidAiOutput();
        }
    }

    private String boundedText(JsonNode node, String field, int maxLength) {
        JsonNode value = node.path(field);
        if (!value.isTextual() || value.asText().isBlank() || value.asText().length() > maxLength) {
            throw invalidAiOutput();
        }
        return value.asText().trim();
    }

    private List<String> readOptions(String json) {
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("As alternativas da avaliação não puderam ser carregadas.", ex);
        }
    }

    private String writeOptions(List<String> options) {
        try {
            return objectMapper.writeValueAsString(options);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("As alternativas da avaliação não puderam ser salvas.", ex);
        }
    }

    private ReadingAssessmentDto toDto(ReadingAssessment assessment) {
        List<AssessmentQuestionDto> questions = questionRepository
                .findByAssessmentIdOrderByQuestionOrder(assessment.getId()).stream()
                .map(question -> new AssessmentQuestionDto(
                        question.getId(),
                        question.getQuestionOrder(),
                        question.getType(),
                        question.getDifficulty(),
                        question.getPrompt(),
                        readOptions(question.getOptionsJson())))
                .toList();
        return new ReadingAssessmentDto(
                assessment.getId(),
                parsePageNumbers(assessment.getPageNumbers()),
                assessment.getCreatedAt(),
                questions);
    }

    private List<Integer> parsePageNumbers(String pageNumbers) {
        try {
            return java.util.Arrays.stream(pageNumbers.split(","))
                    .map(Integer::parseInt)
                    .toList();
        } catch (RuntimeException ex) {
            throw new IllegalStateException("As páginas da avaliação não puderam ser carregadas.", ex);
        }
    }

    private AssessmentAnswerDto toAnswerDto(AssessmentAnswer answer) {
        return new AssessmentAnswerDto(answer.getQuestionId(), Boolean.TRUE.equals(answer.getCorrect()), answer.getFeedback());
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Não foi possível calcular o identificador do contexto da avaliação.", ex);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private InvalidAiOutputException invalidAiOutput() {
        return new InvalidAiOutputException();
    }

    private record QuestionDraft(String type, String difficulty, String prompt, List<String> options,
                                 Integer correctOption, String expectedAnswer, String rubric, String evidence) { }
    private record Evaluation(boolean correct, String evidence) { }

    private static class InvalidAiOutputException extends IllegalArgumentException {
        private InvalidAiOutputException() {
            super("A IA retornou dados inválidos para a avaliação. Nenhuma alteração foi salva; tente novamente.");
        }
    }
}
