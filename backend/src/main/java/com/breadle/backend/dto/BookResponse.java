package com.breadle.backend.dto;

public class BookResponse {
    private Long id;
    private String titulo;
    private String autor;
    private String sinopse;
    private String origem;
    private String tipo;
    private Integer totalPaginas;
    private Integer pontuacaoBase;

    public BookResponse(Long id, String titulo, String autor, String sinopse, String origem, String tipo,
                        Integer totalPaginas, Integer pontuacaoBase) {
        this.id = id;
        this.titulo = titulo;
        this.autor = autor;
        this.sinopse = sinopse;
        this.origem = origem;
        this.tipo = tipo;
        this.totalPaginas = totalPaginas;
        this.pontuacaoBase = pontuacaoBase;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getAutor() {
        return autor;
    }

    public void setAutor(String autor) {
        this.autor = autor;
    }

    public String getSinopse() {
        return sinopse;
    }

    public void setSinopse(String sinopse) {
        this.sinopse = sinopse;
    }

    public String getOrigem() {
        return origem;
    }

    public void setOrigem(String origem) {
        this.origem = origem;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public Integer getTotalPaginas() {
        return totalPaginas;
    }

    public void setTotalPaginas(Integer totalPaginas) {
        this.totalPaginas = totalPaginas;
    }

    public Integer getPontuacaoBase() {
        return pontuacaoBase;
    }

    public void setPontuacaoBase(Integer pontuacaoBase) {
        this.pontuacaoBase = pontuacaoBase;
    }
}
