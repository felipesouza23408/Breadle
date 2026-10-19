package com.breadle.backend.group;

public class GroupChallengeRequest {
    private String title;
    private String description;
    private Integer targetPages;

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

    public Integer getTargetPages() {
        return targetPages;
    }

    public void setTargetPages(Integer targetPages) {
        this.targetPages = targetPages;
    }
}
