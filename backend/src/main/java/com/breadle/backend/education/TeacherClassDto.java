package com.breadle.backend.education;

import java.time.Instant;

public record TeacherClassDto(Long id, String name, int totalAlunos, Instant createdAt) {
}
