package com.breadle.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
    @NotBlank(message = "O link de redefinição é inválido.")
    @Size(max = 100, message = "O link de redefinição é inválido.")
    String token,

    @NotBlank(message = "Informe a nova senha.")
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*\\d)[A-Za-z0-9]{8,}$",
        message = "A senha deve ter pelo menos 8 caracteres, incluir uma letra maiúscula e um número, e usar apenas letras e números."
    )
    String senha
) {}
