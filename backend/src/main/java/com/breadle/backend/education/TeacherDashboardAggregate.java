package com.breadle.backend.education;

public interface TeacherDashboardAggregate {
    Long getTotalAlunos();
    Long getAlunosAtivos();
    Long getLivrosConcluidos();
    Long getTotalPontosEducacionais();
}
