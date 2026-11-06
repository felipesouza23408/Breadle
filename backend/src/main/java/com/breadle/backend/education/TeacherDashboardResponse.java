package com.breadle.backend.education;

import java.util.List;

public class TeacherDashboardResponse {
    private int totalAlunos;
    private int alunosAtivos;
    private long livrosConcluidos;
    private long mediaPontosEducacionais;
    private List<StudentProgressDto> topAlunos;
    private int page;
    private int size;
    private boolean hasNext;

    public TeacherDashboardResponse() {
    }

    public TeacherDashboardResponse(int totalAlunos, int alunosAtivos, long livrosConcluidos,
                                   long mediaPontosEducacionais, List<StudentProgressDto> topAlunos) {
        this(totalAlunos, alunosAtivos, livrosConcluidos, mediaPontosEducacionais, topAlunos, 0, 20, false);
    }

    public TeacherDashboardResponse(int totalAlunos, int alunosAtivos, long livrosConcluidos,
                                   long mediaPontosEducacionais, List<StudentProgressDto> topAlunos,
                                   int page, int size, boolean hasNext) {
        this.totalAlunos = totalAlunos;
        this.alunosAtivos = alunosAtivos;
        this.livrosConcluidos = livrosConcluidos;
        this.mediaPontosEducacionais = mediaPontosEducacionais;
        this.topAlunos = topAlunos;
        this.page = page;
        this.size = size;
        this.hasNext = hasNext;
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

    public long getMediaPontosEducacionais() {
        return mediaPontosEducacionais;
    }

    public void setMediaPontosEducacionais(long mediaPontosEducacionais) {
        this.mediaPontosEducacionais = mediaPontosEducacionais;
    }

    public List<StudentProgressDto> getTopAlunos() {
        return topAlunos;
    }

    public void setTopAlunos(List<StudentProgressDto> topAlunos) {
        this.topAlunos = topAlunos;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public boolean isHasNext() {
        return hasNext;
    }

    public void setHasNext(boolean hasNext) {
        this.hasNext = hasNext;
    }
}
