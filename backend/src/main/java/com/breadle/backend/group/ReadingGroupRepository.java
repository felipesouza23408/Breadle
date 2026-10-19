package com.breadle.backend.group;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReadingGroupRepository extends JpaRepository<ReadingGroup, Long> {
    List<ReadingGroup> findByActiveTrueOrderByCreatedAtDesc();
}
