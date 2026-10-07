package com.breadle.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "livros")
public class Livro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false)
    private String autor;

    @Column(columnDefinition = "TEXT")
    private String sinopse;

    @Column(nullable = false)
    private String origem = "DOMINIO_PUBLICO";

    @Column(nullable = false)
    private String tipo = "LITERATURA";

    @Column(nullable = false)
    private Integer dificuldade = 1;

    @Column(name = "pontuacao_base", nullable = false)
    private Integer pontuacaoBase = 10;

    @Column(name = "total_paginas", nullable = false)
    private Integer totalPaginas = 1;

    @Column(name = "fonte_origem", length = 160)
    private String fonteOrigem;

    @Column(name = "capa_url")
    private String capaUrl;

    @Column(name = "arquivo_url")
    private String arquivoUrl;

    @Column(nullable = false)
    private Boolean ativo = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getAutor() { return autor; }
    public void setAutor(String autor) { this.autor = autor; }

    public String getSinopse() { return sinopse; }
    public void setSinopse(String sinopse) { this.sinopse = sinopse; }

    public String getOrigem() { return origem; }
    public void setOrigem(String origem) { this.origem = origem; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public Integer getDificuldade() { return dificuldade; }
    public void setDificuldade(Integer dificuldade) { this.dificuldade = dificuldade; }

    public Integer getPontuacaoBase() { return pontuacaoBase; }
    public void setPontuacaoBase(Integer pontuacaoBase) { this.pontuacaoBase = pontuacaoBase; }

    public Integer getTotalPaginas() { return totalPaginas; }
    public void setTotalPaginas(Integer totalPaginas) { this.totalPaginas = totalPaginas; }

    public String getFonteOrigem() { return fonteOrigem; }
    public void setFonteOrigem(String fonteOrigem) { this.fonteOrigem = fonteOrigem; }

    public String getCapaUrl() { return capaUrl; }
    public void setCapaUrl(String capaUrl) { this.capaUrl = capaUrl; }

    public String getArquivoUrl() { return arquivoUrl; }
    public void setArquivoUrl(String arquivoUrl) { this.arquivoUrl = arquivoUrl; }

    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean ativo) { this.ativo = ativo; }
}