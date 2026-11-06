package com.breadle.backend.gamification;

public interface GamificationService {
    int calculateReadingPoints(int pagesRead, int baseBookPoints, boolean completed);
    int calculateMissionProgress(int currentProgress, int target);
    long grantEducationalPoints(Long classId, Long studentId, int points);
    default int normalizeScore(int value) {
        return Math.max(0, value);
    }
}
