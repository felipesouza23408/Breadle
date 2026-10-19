package com.breadle.backend.gamification;

public class RankingEntryDto {
    private Long userId;
    private String nome;
    private String tipo;
    private int points;
    private int position;

    public RankingEntryDto() {
    }

    public RankingEntryDto(Long userId, String nome, String tipo, int points, int position) {
        this.userId = userId;
        this.nome = nome;
        this.tipo = tipo;
        this.points = points;
        this.position = position;
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

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public int getPoints() {
        return points;
    }

    public void setPoints(int points) {
        this.points = points;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}
