package com.breadle.backend.dto;

public record BookResponse(
    Long id,
    String titulo,
    String autor,
    String sinopse,
    String origem,
    String tipo,
    Integer dificuldade,
    Integer totalPaginas,
    Integer pontuacaoBase,
    Integer pontosConclusao,
    String capaUrl
) {}