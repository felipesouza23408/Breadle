package com.breadle.backend.group;

public class CreateGroupRequest {
    private String name;
    private String description;
    private String challengeName;
    private Integer challengeTargetPages;

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
}
