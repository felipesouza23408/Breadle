package com.breadle.backend.group;

import java.time.Instant;

public class GroupChallengeDto {
    private Long id;
    private String title;
    private String description;
    private Integer targetPages;
    private Integer progress;
    private Instant startsAt;
    private Instant endsAt;
    private String status;

    public GroupChallengeDto() {
    }

    public GroupChallengeDto(Long id, String title, String description, Integer targetPages,
                            Integer progress, Instant startsAt, Instant endsAt, String status) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.targetPages = targetPages;
        this.progress = progress;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Integer getTargetPages() {
        return targetPages;
    }

    public void setTargetPages(Integer targetPages) {
        this.targetPages = targetPages;
    }

    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public void setStartsAt(Instant startsAt) {
        this.startsAt = startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public void setEndsAt(Instant endsAt) {
        this.endsAt = endsAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
