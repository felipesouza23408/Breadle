package com.breadle.backend.dto;

import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @Size(max = 80, message = "O apelido deve ter no máximo 80 caracteres.")
    private String apelido;

    @Size(max = 500, message = "A biografia deve ter no máximo 500 caracteres.")
    private String biografia;

    @Size(max = 255, message = "A URL da foto deve ter no máximo 255 caracteres.")
    private String fotoUrl;

    @Size(max = 40, message = "O gênero deve ter no máximo 40 caracteres.")
    private String genero;

    @Size(max = 80, message = "O gênero literário favorito deve ter no máximo 80 caracteres.")
    private String generoLiterarioFavorito;

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
}
