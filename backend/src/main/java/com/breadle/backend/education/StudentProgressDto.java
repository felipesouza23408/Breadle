package com.breadle.backend.education;

public class StudentProgressDto {
    private Long userId;
    private String nome;
    private String email;
    private int pontosTotais;
    private long livrosConcluidos;
    private int progressoSemanal;

    public StudentProgressDto() {
    }

    public StudentProgressDto(Long userId, String nome, String email, int pontosTotais,
                             long livrosConcluidos, int progressoSemanal) {
        this.userId = userId;
        this.nome = nome;
        this.email = email;
        this.pontosTotais = pontosTotais;
        this.livrosConcluidos = livrosConcluidos;
        this.progressoSemanal = progressoSemanal;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public int getPontosTotais() {
        return pontosTotais;
    }

    public void setPontosTotais(int pontosTotais) {
        this.pontosTotais = pontosTotais;
    }

    public long getLivrosConcluidos() {
        return livrosConcluidos;
    }

    public void setLivrosConcluidos(long livrosConcluidos) {
        this.livrosConcluidos = livrosConcluidos;
    }

    public int getProgressoSemanal() {
        return progressoSemanal;
    }

    public void setProgressoSemanal(int progressoSemanal) {
        this.progressoSemanal = progressoSemanal;
    }
}
