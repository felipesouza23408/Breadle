package com.breadle.backend.ai;

public interface AiService {
    String generateQuestions(String bookTitle, String excerpt);
    String summarize(String text);
    String explainPassage(String passage, String context);
    String generateCharacterSheet(String characterName, String context);
    String simulateScenario(String scene, String context);
    String chat(String message, String userContext);
}
