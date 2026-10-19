package com.breadle.backend.ai;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StubAiService implements AiService {

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
