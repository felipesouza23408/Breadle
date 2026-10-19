package com.breadle.backend.group;

import java.time.Instant;

public class GroupActivityDto {
    private Long id;
    private Long userId;
    private String userName;
    private String message;
    private String type;
    private Instant createdAt;

    public GroupActivityDto() {
    }

    public GroupActivityDto(Long id, Long userId, String userName, String message, String type, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.userName = userName;
        this.message = message;
        this.type = type;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
