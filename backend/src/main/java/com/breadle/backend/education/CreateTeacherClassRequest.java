package com.breadle.backend.education;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTeacherClassRequest(
    @NotBlank(message = "Informe o nome da turma.")
    @Size(max = 80, message = "O nome da turma deve ter no máximo 80 caracteres.")
    String name
) {
}
