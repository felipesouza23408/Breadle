package com.breadle.backend.user;

public class UserProfileDto {
    private Long id;
    private String nome;
    private String email;
    private String tipo;
    private Integer pontosTotais;

    public UserProfileDto(Long id, String nome, String email, String tipo, Integer pontosTotais) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.tipo = tipo;
        this.pontosTotais = pontosTotais;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public Integer getPontosTotais() { return pontosTotais; }
    public void setPontosTotais(Integer pontosTotais) { this.pontosTotais = pontosTotais; }
}
