package com.breadle.backend.ai;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class StubAiService implements AiService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String LOCAL_MODE_NOTICE =
            "Modo local: sem um provedor de IA configurado, esta ajuda é um roteiro de leitura e não uma interpretação automática.";

    @Override
    public String generateQuestions(String bookTitle, String excerpt) {
        String text = normalize(excerpt);
        if (text.isBlank()) {
            return "Selecione um trecho lido para criar perguntas de compreensão.";
        }

        String anchor = truncate(firstSentence(text), 180);
        return LOCAL_MODE_NOTICE + "\n\n" +
                "Perguntas para refletir sobre o trecho de '" + safeTitle(bookTitle) + "':\n" +
                "1. O trecho diz: “" + anchor + "”. O que acontece nessa passagem? Cite uma pista do próprio texto.\n" +
                "2. Que sentimento ou intenção você percebe nessa cena? Qual palavra ou ação sustenta sua leitura?\n" +
                "3. Que dúvida sobre a passagem você gostaria de investigar ao continuar a leitura?\n\n" +
                "As perguntas são orientadoras e não substituem uma avaliação gerada por IA.";
    }

    @Override
    public String generateStructuredAssessment(String bookTitle, String registeredPageContext) {
            String context = normalize(registeredPageContext);
            if (context.isBlank()) {
                throw new IllegalArgumentException("Não há páginas registradas para gerar a avaliação.");
            }
            String evidence = truncate(firstSentence(context.replaceAll("(?m)^\\[Página \\d+\\]\\s*", "")), 220);
            if (evidence.isBlank()) {
                evidence = truncate(context, 220);
            }
            int correctOption = Math.floorMod(context.hashCode(), 4);
            List<String> options = new java.util.ArrayList<>(List.of(
                    "Uma informação que não aparece na página",
                    "Outro detalhe ausente do trecho",
                    "Uma situação diferente da descrita"));
            options.add(correctOption, evidence);
            List<Map<String, Object>> questions = List.of(
                    question("MULTIPLE_CHOICE", "EASY",
                            "Qual informação aparece explicitamente no trecho lido?",
                            options, correctOption, evidence,
                            "Selecione a alternativa que reproduz um detalhe explícito do contexto.", evidence),
                    question("SHORT_ANSWER", "MEDIUM",
                            "Que detalhe concreto do trecho ajuda a entender o que está acontecendo?",
                            List.of(), null, evidence,
                            "A resposta identifica ao menos um detalhe presente na evidência textual.", evidence),
                    question("INFERENCE_EVIDENCE", "HARD",
                            "Que interpretação possível você faz sobre a passagem? Apoie-a em uma evidência do texto.",
                            List.of(), null,
                            "A interpretação deve ser uma hipótese apoiada por um detalhe explícito do trecho.",
                            "A resposta apresenta uma interpretação como hipótese e a relaciona a uma evidência do contexto.",
                            evidence)
            );
            return toJson(Map.of("questions", questions));
    }

    @Override
    public String evaluateStructuredAnswer(String question, String registeredPageContext, String expectedAnswer,
                                           String rubric, String userAnswer) {
        String evidence = truncate(firstSentence(normalize(registeredPageContext)
                .replaceAll("(?m)^\\[Página \\d+\\]\\s*", "")), 220);
        String answer = normalize(userAnswer).toLowerCase();
        String expected = normalize(expectedAnswer).toLowerCase();
        boolean correct;
        if (normalize(question).contains("interpretação") || normalize(question).contains("inferência")) {
            boolean signalsInference = List.of("talvez", "pode", "parece", "sugere", "penso", "acredito")
                    .stream().anyMatch(answer::contains);
            correct = !answer.isBlank() && signalsInference && containsMeaningfulWord(
                    answer, normalize(registeredPageContext).replaceAll("(?m)^\\[Página \\d+\\]\\s*", ""));
        } else {
            correct = !answer.isBlank() && (!expected.isBlank()
                    && (answer.contains(expected) || expected.contains(answer))
                    || containsMeaningfulWord(answer, expected));
        }
        return toJson(Map.of("correct", correct, "evidence", evidence));
    }

    private boolean containsMeaningfulWord(String answer, String expected) {
        return Arrays.stream(expected.split("[^\\p{L}\\p{N}]+"))
                .filter(word -> word.length() >= 5)
                .anyMatch(answer::contains);
    }

    private Map<String, Object> question(String type, String difficulty, String prompt, List<String> options,
                                         Integer correctOption, String expectedAnswer, String rubric, String evidence) {
        Map<String, Object> question = new java.util.LinkedHashMap<>();
        question.put("type", type);
        question.put("difficulty", difficulty);
        question.put("prompt", prompt);
        question.put("options", options);
        question.put("correctOption", correctOption);
        question.put("expectedAnswer", expectedAnswer);
        question.put("rubric", rubric);
        question.put("evidence", evidence);
        return question;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Não foi possível gerar a avaliação local estruturada.", ex);
        }
    }

    @Override
    public String summarize(String text) {
        String excerpt = normalize(text);
        if (excerpt.isBlank()) {
            return "Selecione um trecho já lido para preparar uma síntese.";
        }

        String extract = Arrays.stream(excerpt.split("(?<=[.!?])\\s+"))
                .filter(sentence -> !sentence.isBlank())
                .limit(3)
                .collect(Collectors.joining(" "));
        return LOCAL_MODE_NOTICE + "\n\n" +
                "Síntese por extração (sem interpretação):\n" + truncate(extract, 700) +
                "\n\nEsta síntese reproduz o início do trecho; ela não identifica acontecimentos ou ideias por conta própria.";
    }

    @Override
    public String explainPassage(String passage, String context) {
        String excerpt = normalize(passage);
        if (excerpt.isBlank()) {
            return "Selecione uma passagem do livro para receber ajuda.";
        }

        return LOCAL_MODE_NOTICE + "\n\n" +
                "Trecho selecionado: “" + truncate(excerpt, 500) + "”\n\n" +
                "Para construir sua interpretação, experimente:\n" +
                "- identificar quem age ou fala;\n" +
                "- observar palavras que indiquem tempo, emoção ou dúvida;\n" +
                "- relacionar sua leitura às frases anteriores desta página.\n\n" +
                "Não há contexto suficiente neste modo para afirmar o significado da passagem.";
    }

    @Override
    public String generateCharacterSheet(String characterName, String context) {
        String name = normalize(characterName);
        String excerpt = normalize(context);
        if (excerpt.isBlank()) {
            return "Leia uma passagem que mencione o personagem para preparar uma ficha baseada no texto.";
        }

        return LOCAL_MODE_NOTICE + "\n\n" +
                "Ficha de leitura" + (name.isBlank() ? "" : ": " + name) + "\n" +
                "- O que o trecho confirma: observe falas e ações explícitas.\n" +
                "- O que pode ser uma hipótese: registre sua interpretação como possibilidade, não como fato.\n" +
                "- O que ainda não sabemos: informações que não aparecem nesta passagem.\n\n" +
                "Trecho disponível: “" + truncate(excerpt, 350) + "”";
    }

    @Override
    public String simulateScenario(String scene, String context) {
        String excerpt = normalize(scene);
        if (excerpt.isBlank()) {
            return "Selecione uma cena já lida para explorar possibilidades.";
        }

        return LOCAL_MODE_NOTICE + "\n\n" +
                "Exercício imaginativo (não é continuação nem fato do livro):\n" +
                "Com base na cena selecionada, imagine duas escolhas diferentes que o personagem poderia fazer. " +
                "Para cada uma, pense em uma consequência possível e indique qual detalhe do trecho inspirou sua hipótese.\n\n" +
                "Cena: “" + truncate(excerpt, 350) + "”";
    }

    @Override
    public String chat(String message, String userContext) {
        String question = normalize(message);
        if (question.isBlank()) {
            return "Pode me contar o que ficou difícil? Se quiser, selecione uma passagem e pergunte sobre ela.";
        }

        String context = normalize(userContext);
        String grounding = context.isBlank()
                ? "Ainda não tenho um trecho da leitura para consultar."
                : "Vou me limitar ao trecho e às mensagens anteriores que você compartilhou.";
        return LOCAL_MODE_NOTICE + "\n\n" + grounding + "\n" +
                "Para explorar sua dúvida, procure no texto uma fala, ação ou palavra que dê uma pista. " +
                "O que essa pista faz você pensar? Se compartilhar a frase específica, posso ajudar a organizá-la.";
    }

    private String normalize(String value) {
        return value == null ? "" : value.replace("\r", "").trim();
    }

    private String safeTitle(String value) {
        String safe = normalize(value);
        return safe.isBlank() ? "sua leitura" : safe;
    }

    private String firstSentence(String text) {
        List<String> sentences = Arrays.stream(text.split("(?<=[.!?])\\s+"))
                .filter(sentence -> !sentence.isBlank())
                .toList();
        return sentences.isEmpty() ? text : sentences.get(0);
    }

    private String truncate(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, Math.max(0, maxLength - 1)).trim() + "…";
    }
}
