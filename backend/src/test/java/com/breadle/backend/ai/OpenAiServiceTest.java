package com.breadle.backend.ai;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class OpenAiServiceTest {

    @Test
    void shouldUseContextualLocalQuestionsWhenExternalAiIsDisabled() {
        OpenAiService service = new OpenAiService(
                new StubAiService(),
                false,
                "",
                "https://api.openai.com/v1",
                "gpt-4o-mini"
        );

        String response = service.generateQuestions(
                "O Mistério da Casa",
                "Uma passagem suficientemente longa para motivar perguntas mais detalhadas ao leitor."
        );

        assertTrue(response.contains("Perguntas para refletir sobre o trecho de 'O Mistério da Casa'"));
        assertTrue(response.contains("O que acontece nessa passagem"));
        assertTrue(response.contains("a IA externa está desativada"));
    }

    @Test
    void shouldIncludeCurrentReadingContextInLocalChatResponse() {
        OpenAiService service = new OpenAiService(
                new StubAiService(),
                false,
                "",
                "https://api.openai.com/v1",
                "gpt-4o-mini"
        );

        String response = service.chat("O que devo observar?", "Livro: Dracula; página: O castelo estava silencioso.");

        assertTrue(response.contains("Vou me limitar ao trecho"));
        assertTrue(response.contains("a IA externa está desativada"));
    }
}
