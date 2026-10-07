package com.breadle.backend.ai;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary
public class StubAiService implements AiService {

    @Override
    public String generateQuestions(String bookTitle, String excerpt) {
        return "Perguntas geradas para '" + bookTitle + "' com base no trecho lido.";
    }

    @Override
    public String summarize(String text) {
        return "Resumo: " + text.substring(0, Math.min(120, text.length()));
    }

    @Override
    public String explainPassage(String passage, String context) {
        return "Explicação do trecho: a cena mostra contexto histórico e emocional, sem revelar spoilers futuros.";
    }

    @Override
    public String generateCharacterSheet(String characterName, String context) {
        return "Ficha do personagem " + characterName + ": motivações, conflito, evolução e relação com o enredo.";
    }

    @Override
    public String simulateScenario(String scene, String context) {
        return "Simulação do cenário: descrição do ambiente, tensão e possíveis interpretações.";
    }

    @Override
    public String chat(String message, String userContext) {
        return "Assitente Breadle: " + message + " (resposta gerada localmente para apoiar a leitura).";
    }
}
