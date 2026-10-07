package com.breadle.backend.reading;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reading")
public class ReadingSessionController {

    private final ReadingSessionService readingSessionService;

    public ReadingSessionController(ReadingSessionService readingSessionService) {
        this.readingSessionService = readingSessionService;
    }

    @PostMapping("/sessions")
    public ResponseEntity<ReadingSession> createSession(@Valid @RequestBody ReadingSessionRequest request) {
        return ResponseEntity.ok(readingSessionService.createSession(request));
    }

    @PostMapping("/sessions/{sessionId}/progress")
    public ResponseEntity<ReadingSession> registerProgress(@PathVariable Long sessionId,
                                                         @Valid @RequestBody ReadingProgressRequest request) {
        return ResponseEntity.ok(readingSessionService.registerProgress(sessionId, request));
    }

    @PostMapping("/sessions/{sessionId}/complete")
    public ResponseEntity<ReadingSession> completeSession(@PathVariable Long sessionId) {
        return ResponseEntity.ok(readingSessionService.completeSession(sessionId));
    }

    @PostMapping("/sessions/{sessionId}/questions")
    public ResponseEntity<String> generateQuestions(@PathVariable Long sessionId,
                                                   @Valid @RequestBody ReadingAiQuestionRequest request) {
        return ResponseEntity.ok(readingSessionService.generateQuestionsForExcerpt(sessionId, request));
    }
}
