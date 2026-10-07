package com.breadle.backend.reading;

import jakarta.validation.constraints.NotBlank;

public class ReadingAiQuestionRequest {

    @NotBlank(message = "O trecho lido é obrigatório para gerar perguntas.")
    private String excerpt;

    public String getExcerpt() {
        return excerpt;
    }

    public void setExcerpt(String excerpt) {
        this.excerpt = excerpt;
    }
}
