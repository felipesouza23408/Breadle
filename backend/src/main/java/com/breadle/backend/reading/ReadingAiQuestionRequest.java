package com.breadle.backend.reading;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ReadingAiQuestionRequest {

    @NotBlank(message = "O trecho lido é obrigatório para gerar perguntas.")
    @Size(max = 12_000, message = "O trecho deve ter no máximo 12.000 caracteres.")
    private String excerpt;

    public String getExcerpt() {
        return excerpt;
    }

    public void setExcerpt(String excerpt) {
        this.excerpt = excerpt;
    }
}
