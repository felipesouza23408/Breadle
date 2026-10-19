package com.breadle.backend.ai;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/ai")
public class AiController {

    private static final int MAX_FIELD_LENGTH = 12_000;
    private final AiService aiService;
    private final AiUsageService aiUsageService;

    public AiController(AiService aiService, AiUsageService aiUsageService) {
        this.aiService = aiService;
        this.aiUsageService = aiUsageService;
    }

    @GetMapping("/usage")
    public ResponseEntity<AiResponse> getUsage() {
        return ResponseEntity.ok(aiUsageService.getUsage());
    }

    @PostMapping("/questions")
    public ResponseEntity<AiResponse> generateQuestions(@RequestBody Map<String, String> payload) {
        validate(payload);
        String bookTitle = optional(payload, "bookTitle");
        String excerpt = required(payload, "text", "excerpt");
        return ResponseEntity.ok(aiUsageService.execute(() -> aiService.generateQuestions(bookTitle, excerpt)));
    }

    @PostMapping("/summarize")
    public ResponseEntity<AiResponse> summarize(@RequestBody Map<String, String> payload) {
        validate(payload);
        String text = required(payload, "text");
        return ResponseEntity.ok(aiUsageService.execute(() -> aiService.summarize(text)));
    }

    @PostMapping("/explain")
    public ResponseEntity<AiResponse> explain(@RequestBody Map<String, String> payload) {
        validate(payload);
        String passage = required(payload, "passage", "text");
        String context = optional(payload, "context");
        return ResponseEntity.ok(aiUsageService.execute(() -> aiService.explainPassage(passage, context)));
    }

    @PostMapping("/character-sheet")
    public ResponseEntity<AiResponse> characterSheet(@RequestBody Map<String, String> payload) {
        validate(payload);
        String characterName = optional(payload, "characterName");
        String context = required(payload, "context", "text");
        return ResponseEntity.ok(aiUsageService.execute(() -> aiService.generateCharacterSheet(characterName, context)));
    }

    @PostMapping("/scenario")
    public ResponseEntity<AiResponse> scenario(@RequestBody Map<String, String> payload) {
        validate(payload);
        String scene = required(payload, "scene", "text");
        String context = optional(payload, "context");
        return ResponseEntity.ok(aiUsageService.execute(() -> aiService.simulateScenario(scene, context)));
    }

    @PostMapping("/chat")
    public ResponseEntity<AiResponse> chat(@RequestBody Map<String, String> payload) {
        validate(payload);
        String message = required(payload, "message");
        String context = optional(payload, "context");
        return ResponseEntity.ok(aiUsageService.execute(() -> aiService.chat(message, context)));
    }

    private void validate(Map<String, String> payload) {
        if (payload == null) {
            throw new IllegalArgumentException("Informe os dados necessários para a ajuda de leitura.");
        }
        if (payload.values().stream().anyMatch(value -> value != null && value.length() > MAX_FIELD_LENGTH)) {
            throw new IllegalArgumentException("Cada campo enviado ao assistente deve ter no máximo 12.000 caracteres.");
        }
    }

    private String required(Map<String, String> payload, String... keys) {
        for (String key : keys) {
            String value = payload.get(key);
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        throw new IllegalArgumentException("Informe o conteúdo necessário para esta ajuda de leitura.");
    }

    private String optional(Map<String, String> payload, String key) {
        String value = payload.get(key);
        return value == null ? "" : value.trim();
    }
}
