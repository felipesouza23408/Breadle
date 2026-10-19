package com.breadle.backend.education;

import java.util.List;

public class TeacherDashboardResponse {
    private int totalAlunos;
    private int alunosAtivos;
    private long livrosConcluidos;
    private int mediaPontos;
    private List<StudentProgressDto> topAlunos;

    public TeacherDashboardResponse() {
    }

    public TeacherDashboardResponse(int totalAlunos, int alunosAtivos, long livrosConcluidos,
                                   int mediaPontos, List<StudentProgressDto> topAlunos) {
        this.totalAlunos = totalAlunos;
        this.alunosAtivos = alunosAtivos;
        this.livrosConcluidos = livrosConcluidos;
        this.mediaPontos = mediaPontos;
        this.topAlunos = topAlunos;
    }

    public int getTotalAlunos() {
        return totalAlunos;
    }

    public void setTotalAlunos(int totalAlunos) {
        this.totalAlunos = totalAlunos;
    }

    public int getAlunosAtivos() {
        return alunosAtivos;
    }

    public void setAlunosAtivos(int alunosAtivos) {
        this.alunosAtivos = alunosAtivos;
    }

    public long getLivrosConcluidos() {
        return livrosConcluidos;
    }

    public void setLivrosConcluidos(long livrosConcluidos) {
        this.livrosConcluidos = livrosConcluidos;
    }

    public int getMediaPontos() {
        return mediaPontos;
    }

    public void setMediaPontos(int mediaPontos) {
        this.mediaPontos = mediaPontos;
    }

    public List<StudentProgressDto> getTopAlunos() {
        return topAlunos;
    }

    public void setTopAlunos(List<StudentProgressDto> topAlunos) {
        this.topAlunos = topAlunos;
    }
}
