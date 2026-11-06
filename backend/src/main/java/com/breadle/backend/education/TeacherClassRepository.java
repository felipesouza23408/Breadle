package com.breadle.backend.education;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeacherClassRepository extends JpaRepository<TeacherClass, Long> {
    List<TeacherClass> findByTeacherIdOrderByIdDesc(Long teacherId);
    Optional<TeacherClass> findByInvitationCodeHash(String invitationCodeHash);
    boolean existsByInvitationCodeHash(String invitationCodeHash);
}
