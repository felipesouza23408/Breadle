package com.breadle.backend.group;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReadingGroupMemberRepository extends JpaRepository<ReadingGroupMember, Long> {
    boolean existsByGroupIdAndUserId(Long groupId, Long userId);
    List<ReadingGroupMember> findByUserId(Long userId);
    long countByGroupId(Long groupId);
    List<ReadingGroupMember> findByGroupId(Long groupId);
    List<ReadingGroupMember> findByGroupIdOrderByPagesReadDesc(Long groupId);
}
