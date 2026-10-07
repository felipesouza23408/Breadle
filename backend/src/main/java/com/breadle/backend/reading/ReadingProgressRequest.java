package com.breadle.backend.reading;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class ReadingProgressRequest {

    @NotNull(message = "A quantidade de páginas lidas é obrigatória.")
    @Min(value = 0, message = "A quantidade de páginas lidas não pode ser negativa.")
    private Integer pagesRead;

    private String excerptHash;

    public Integer getPagesRead() {
        return pagesRead;
    }

    public void setPagesRead(Integer pagesRead) {
        this.pagesRead = pagesRead;
    }

    public String getExcerptHash() {
        return excerptHash;
    }

    public void setExcerptHash(String excerptHash) {
        this.excerptHash = excerptHash;
    }
}
