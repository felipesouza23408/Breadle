package com.breadle.backend.group;

import java.time.Instant;

public class ReadingGroupDto {
    private Long id;
    private String name;
    private String description;
    private Long ownerId;
    private String challengeName;
    private Integer challengeTargetPages;
    private Integer memberCount;
    private Boolean joined;
    private Instant createdAt;

    public ReadingGroupDto() {
    }

    public ReadingGroupDto(Long id, String name, String description, Long ownerId,
                          String challengeName, Integer challengeTargetPages,
                          Integer memberCount, Boolean joined, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.ownerId = ownerId;
        this.challengeName = challengeName;
        this.challengeTargetPages = challengeTargetPages;
        this.memberCount = memberCount;
        this.joined = joined;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(Long ownerId) {
        this.ownerId = ownerId;
    }

    public String getChallengeName() {
        return challengeName;
    }

    public void setChallengeName(String challengeName) {
        this.challengeName = challengeName;
    }

    public Integer getChallengeTargetPages() {
        return challengeTargetPages;
    }

    public void setChallengeTargetPages(Integer challengeTargetPages) {
        this.challengeTargetPages = challengeTargetPages;
    }

    public Integer getMemberCount() {
        return memberCount;
    }

    public void setMemberCount(Integer memberCount) {
        this.memberCount = memberCount;
    }

    public Boolean getJoined() {
        return joined;
    }

    public void setJoined(Boolean joined) {
        this.joined = joined;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
