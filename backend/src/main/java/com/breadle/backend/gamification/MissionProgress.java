package com.breadle.backend.gamification;

public class MissionProgress {
    private String title;
    private String description;
    private int progress;
    private int target;
    private boolean completed;

    public MissionProgress() {
    }

    public MissionProgress(String title, String description, int progress, int target, boolean completed) {
        this.title = title;
        this.description = description;
        this.progress = progress;
        this.target = target;
        this.completed = completed;
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

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }

    public int getTarget() {
        return target;
    }

    public void setTarget(int target) {
        this.target = target;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }
}
