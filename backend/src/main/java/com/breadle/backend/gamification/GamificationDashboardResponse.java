package com.breadle.backend.gamification;

import java.util.List;

public class GamificationDashboardResponse {
    private int totalPoints;
    private long booksRead;
    private int readingStreakDays;
    private int weeklyPages;
    private int weeklyGoalPages;
    private double averagePagesPerSession;
    private String nextMilestone;
    private List<MissionProgress> missions;
    private List<AchievementDto> achievements;
    private List<RankingEntryDto> ranking;

    public GamificationDashboardResponse() {
    }

    public GamificationDashboardResponse(int totalPoints, long booksRead,
                                         int readingStreakDays, int weeklyPages,
                                         int weeklyGoalPages, double averagePagesPerSession,
                                         String nextMilestone,
                                         List<MissionProgress> missions,
                                         List<AchievementDto> achievements,
                                         List<RankingEntryDto> ranking) {
        this.totalPoints = totalPoints;
        this.booksRead = booksRead;
        this.readingStreakDays = readingStreakDays;
        this.weeklyPages = weeklyPages;
        this.weeklyGoalPages = weeklyGoalPages;
        this.averagePagesPerSession = averagePagesPerSession;
        this.nextMilestone = nextMilestone;
        this.missions = missions;
        this.achievements = achievements;
        this.ranking = ranking;
    }

    public int getTotalPoints() {
        return totalPoints;
    }

    public void setTotalPoints(int totalPoints) {
        this.totalPoints = totalPoints;
    }

    public long getBooksRead() {
        return booksRead;
    }

    public void setBooksRead(long booksRead) {
        this.booksRead = booksRead;
    }

    public int getReadingStreakDays() {
        return readingStreakDays;
    }

    public void setReadingStreakDays(int readingStreakDays) {
        this.readingStreakDays = readingStreakDays;
    }

    public int getWeeklyPages() {
        return weeklyPages;
    }

    public void setWeeklyPages(int weeklyPages) {
        this.weeklyPages = weeklyPages;
    }

    public int getWeeklyGoalPages() {
        return weeklyGoalPages;
    }

    public void setWeeklyGoalPages(int weeklyGoalPages) {
        this.weeklyGoalPages = weeklyGoalPages;
    }

    public double getAveragePagesPerSession() {
        return averagePagesPerSession;
    }

    public void setAveragePagesPerSession(double averagePagesPerSession) {
        this.averagePagesPerSession = averagePagesPerSession;
    }

    public String getNextMilestone() {
        return nextMilestone;
    }

    public void setNextMilestone(String nextMilestone) {
        this.nextMilestone = nextMilestone;
    }

    public List<MissionProgress> getMissions() {
        return missions;
    }

    public void setMissions(List<MissionProgress> missions) {
        this.missions = missions;
    }

    public List<AchievementDto> getAchievements() {
        return achievements;
    }

    public void setAchievements(List<AchievementDto> achievements) {
        this.achievements = achievements;
    }

    public List<RankingEntryDto> getRanking() {
        return ranking;
    }

    public void setRanking(List<RankingEntryDto> ranking) {
        this.ranking = ranking;
    }
}
