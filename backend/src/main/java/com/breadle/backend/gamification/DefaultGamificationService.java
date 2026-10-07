package com.breadle.backend.gamification;

import org.springframework.stereotype.Service;

@Service
public class DefaultGamificationService implements GamificationService {

    @Override
    public int calculateReadingPoints(int pagesRead, int baseBookPoints, boolean completed) {
        int basic = pagesRead * baseBookPoints;
        int bonus = completed ? (baseBookPoints * 2) : 0;
        return normalizeScore(basic + bonus);
    }

    @Override
    public int calculateMissionProgress(int currentProgress, int target) {
        if (target <= 0) {
            return 0;
        }
        return normalizeScore((currentProgress * 100) / target);
    }
}
