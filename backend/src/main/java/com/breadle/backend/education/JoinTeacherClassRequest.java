package com.breadle.backend.education;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinTeacherClassRequest(
    @NotBlank(message = "Informe o código de convite.")
    @Size(max = 64, message = "Código de convite inválido.")
    String invitationCode
) {
}
