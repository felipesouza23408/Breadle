package com.breadle.backend.ai;

import java.time.Instant;

public record AiResponse(
        String result,
        int usedToday,
        int dailyLimit,
        int remainingToday,
        Instant resetsAt) {
}
