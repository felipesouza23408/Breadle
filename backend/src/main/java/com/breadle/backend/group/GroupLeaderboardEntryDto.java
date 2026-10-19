package com.breadle.backend.group;

public class GroupLeaderboardEntryDto {
    private Long userId;
    private String userName;
    private String userType;
    private Integer pagesRead;
    private Integer position;

    public GroupLeaderboardEntryDto() {
    }

    public GroupLeaderboardEntryDto(Long userId, String userName, String userType, Integer pagesRead, Integer position) {
        this.userId = userId;
        this.userName = userName;
        this.userType = userType;
        this.pagesRead = pagesRead;
        this.position = position;
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

    public String getUserType() {
        return userType;
    }

    public void setUserType(String userType) {
        this.userType = userType;
    }

    public Integer getPagesRead() {
        return pagesRead;
    }

    public void setPagesRead(Integer pagesRead) {
        this.pagesRead = pagesRead;
    }

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }
}
