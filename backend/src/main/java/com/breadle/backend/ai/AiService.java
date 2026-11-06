package com.breadle.backend.ai;

public interface AiService {
    String generateQuestions(String bookTitle, String excerpt);
    String generateStructuredAssessment(String bookTitle, String registeredPageContext);
    String evaluateStructuredAnswer(String question, String registeredPageContext, String expectedAnswer,
                                    String rubric, String userAnswer);
    String summarize(String text);
    String explainPassage(String passage, String context);
    String generateCharacterSheet(String characterName, String context);
    String simulateScenario(String scene, String context);
    String chat(String message, String userContext);
}
