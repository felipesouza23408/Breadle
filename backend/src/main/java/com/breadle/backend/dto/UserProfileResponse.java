package com.breadle.backend.dto;

public class UserProfileResponse {
    private Long id;
    private String nome;
    private String email;
    private String tipo;
    private Integer pontosTotais;
    private String apelido;
    private String biografia;
    private String fotoUrl;
    private String genero;
    private String generoLiterarioFavorito;

    public UserProfileResponse(Long id, String nome, String email, String tipo, Integer pontosTotais,
                              String apelido, String biografia, String fotoUrl, String genero,
                              String generoLiterarioFavorito) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.tipo = tipo;
        this.pontosTotais = pontosTotais;
        this.apelido = apelido;
        this.biografia = biografia;
        this.fotoUrl = fotoUrl;
        this.genero = genero;
        this.generoLiterarioFavorito = generoLiterarioFavorito;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEmail() {
        return email;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public Integer getPontosTotais() {
        return pontosTotais;
    }

    public void setPontosTotais(Integer pontosTotais) {
        this.pontosTotais = pontosTotais;
    }

    public String getApelido() {
        return apelido;
    }

    public void setApelido(String apelido) {
        this.apelido = apelido;
    }

    public String getBiografia() {
        return biografia;
    }

    public void setBiografia(String biografia) {
        this.biografia = biografia;
    }

    public String getFotoUrl() {
        return fotoUrl;
    }

    public void setFotoUrl(String fotoUrl) {
        this.fotoUrl = fotoUrl;
    }

    public String getGenero() {
        return genero;
    }

    public void setGenero(String genero) {
        this.genero = genero;
    }

    public String getGeneroLiterarioFavorito() {
        return generoLiterarioFavorito;
    }

    public void setGeneroLiterarioFavorito(String generoLiterarioFavorito) {
        this.generoLiterarioFavorito = generoLiterarioFavorito;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
