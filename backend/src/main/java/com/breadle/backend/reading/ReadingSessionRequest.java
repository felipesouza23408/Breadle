package com.breadle.backend.reading;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class ReadingSessionRequest {

    private Long userId;

    @NotNull(message = "O livro é obrigatório.")
    private Long bookId;

    @Min(value = 1, message = "A sessão precisa ter pelo menos 1 página.")
    private Integer pagesDefined;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getBookId() {
        return bookId;
    }

    public void setBookId(Long bookId) {
        this.bookId = bookId;
    }

    public Integer getPagesDefined() {
        return pagesDefined;
    }

    public void setPagesDefined(Integer pagesDefined) {
        this.pagesDefined = pagesDefined;
    }
}
