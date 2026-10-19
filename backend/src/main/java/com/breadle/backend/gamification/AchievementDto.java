package com.breadle.backend.gamification;

public class AchievementDto {
    private String title;
    private String description;
    private boolean unlocked;

    public AchievementDto() {
    }

    public AchievementDto(String title, String description, boolean unlocked) {
        this.title = title;
        this.description = description;
        this.unlocked = unlocked;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isUnlocked() {
        return unlocked;
    }

    public void setUnlocked(boolean unlocked) {
        this.unlocked = unlocked;
    }
}
