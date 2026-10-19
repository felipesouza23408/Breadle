package com.breadle.backend.group;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupChallengeRepository extends JpaRepository<GroupChallenge, Long> {
    List<GroupChallenge> findByGroupIdOrderByCreatedAtDesc(Long groupId);
    List<GroupChallenge> findByGroupIdAndStatusOrderByCreatedAtDesc(Long groupId, String status);
}
