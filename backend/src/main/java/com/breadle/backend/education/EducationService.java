package com.breadle.backend.education;

import com.breadle.backend.entity.Leitura;
import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.LeituraRepository;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class EducationService {

    private final UsuarioRepository usuarioRepository;
    private final LeituraRepository leituraRepository;

    public EducationService(UsuarioRepository usuarioRepository, LeituraRepository leituraRepository) {
        this.usuarioRepository = usuarioRepository;
        this.leituraRepository = leituraRepository;
    }

    public TeacherDashboardResponse buildTeacherDashboard() {
        List<Usuario> students = usuarioRepository.findAll().stream()
            .filter(user -> user.getTipo() == TipoUsuario.LEITOR)
            .toList();

        List<StudentProgressDto> topStudents = students.stream()
            .map(student -> {
                long booksCompleted = leituraRepository.findByLeitorIdOrderByIdDesc(student.getId()).stream()
                    .filter(Leitura::getConcluida)
                    .count();

                int points = student.getPontosTotais() == null ? 0 : student.getPontosTotais();
                int weeklyProgress = Math.min(100, Math.round((points / 300f) * 100));

                return new StudentProgressDto(
                    student.getId(),
                    student.getNome(),
                    student.getEmail(),
                    points,
                    booksCompleted,
                    weeklyProgress
                );
            })
            .sorted(Comparator.comparingInt(StudentProgressDto::getPontosTotais).reversed())
            .limit(5)
            .toList();

        long totalBooksCompleted = students.stream()
            .mapToLong(student -> leituraRepository.findByLeitorIdOrderByIdDesc(student.getId()).stream()
                .filter(Leitura::getConcluida)
                .count())
            .sum();

        int totalPoints = students.stream()
            .mapToInt(student -> student.getPontosTotais() == null ? 0 : student.getPontosTotais())
            .sum();

        int averagePoints = students.isEmpty() ? 0 : Math.round(totalPoints / (float) students.size());
        int activeStudents = (int) students.stream()
            .filter(student -> leituraRepository.findByLeitorIdOrderByIdDesc(student.getId()).stream()
                .anyMatch(Leitura::getConcluida))
            .count();

        return new TeacherDashboardResponse(
            students.size(),
            activeStudents,
            totalBooksCompleted,
            averagePoints,
            topStudents
        );
    }
}
