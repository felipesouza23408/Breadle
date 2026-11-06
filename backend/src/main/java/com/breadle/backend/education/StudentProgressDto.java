package com.breadle.backend.education;

public class StudentProgressDto {
    private Long userId;
    private String nome;
    private String email;
    private long pontosEducacionais;
    private long livrosConcluidos;
    private int progressoSemanal;

    public StudentProgressDto() {
    }

    public StudentProgressDto(Long userId, String nome, String email, long pontosEducacionais,
                             long livrosConcluidos, int progressoSemanal) {
        this.userId = userId;
        this.nome = nome;
        this.email = email;
        this.pontosEducacionais = pontosEducacionais;
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

    public long getPontosEducacionais() {
        return pontosEducacionais;
    }

    public void setPontosEducacionais(long pontosEducacionais) {
        this.pontosEducacionais = pontosEducacionais;
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
