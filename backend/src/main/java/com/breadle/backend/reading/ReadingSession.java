package com.breadle.backend.reading;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "reading_sessions")
public class ReadingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(name = "pages_defined", nullable = false)
    private Integer pagesDefined;

    @Column(name = "pages_read", nullable = false)
    private Integer pagesRead = 0;

    @Column(name = "status", nullable = false)
    private String status = "ACTIVE";

    @Column(name = "points_awarded", nullable = false)
    private Integer pointsAwarded = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_progress_at", nullable = false)
    private Instant lastProgressAt = Instant.now();

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "excerpt_hash")
    private String excerptHash;

    @Column(name = "already_awarded", nullable = false)
    private Boolean alreadyAwarded = false;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public Integer getPagesRead() {
        return pagesRead;
    }

    public void setPagesRead(Integer pagesRead) {
        this.pagesRead = pagesRead;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getPointsAwarded() {
        return pointsAwarded;
    }

    public void setPointsAwarded(Integer pointsAwarded) {
        this.pointsAwarded = pointsAwarded;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getLastProgressAt() {
        return lastProgressAt;
    }

    public void setLastProgressAt(Instant lastProgressAt) {
        this.lastProgressAt = lastProgressAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public String getExcerptHash() {
        return excerptHash;
    }

    public void setExcerptHash(String excerptHash) {
        this.excerptHash = excerptHash;
    }

    public Boolean getAlreadyAwarded() {
        return alreadyAwarded;
    }

    public void setAlreadyAwarded(Boolean alreadyAwarded) {
        this.alreadyAwarded = alreadyAwarded;
    }
}
