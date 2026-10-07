package com.breadle.backend.gamification;

public interface GamificationService {
    int calculateReadingPoints(int pagesRead, int baseBookPoints, boolean completed);
    int calculateMissionProgress(int currentProgress, int target);
    default int normalizeScore(int value) {
        return Math.max(0, value);
    }
}
