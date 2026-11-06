package com.breadle.backend.education;

import java.time.Instant;

public record CreatedTeacherClassDto(Long id, String name, String invitationCode, Instant createdAt) {
}
