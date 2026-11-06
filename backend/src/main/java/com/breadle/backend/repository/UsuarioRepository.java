package com.breadle.backend.repository;

import com.breadle.backend.education.TeacherStudentProgressProjection;
import com.breadle.backend.education.TeacherDashboardAggregate;
import com.breadle.backend.entity.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Collection;
import java.util.List;
import com.breadle.backend.entity.TipoUsuario;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    List<Usuario> findAllByIdInAndTipo(Collection<Long> ids, TipoUsuario tipo);
    List<Usuario> findAllByTipoIn(Collection<TipoUsuario> tipos);

    @Query(
        value = """
            select student.id as "userId",
                   student.nome as nome,
                   student.email as email,
                   coalesce(student.pontos_totais, 0) as "pontosEducacionais",
                   coalesce(reading.completed_count, 0) as "livrosConcluidos"
            from usuarios student
            left join (
                select reading.leitor_id, count(*) as completed_count
                from leituras reading
                where reading.concluida = true
                group by reading.leitor_id
            ) reading on reading.leitor_id = student.id
            where student.tipo = 'LEITOR'
            order by coalesce(student.pontos_totais, 0) desc, student.id asc
            """,
        countQuery = "select count(*) from usuarios student where student.tipo = 'LEITOR'",
        nativeQuery = true
    )
    Page<TeacherStudentProgressProjection> findAllReaderProgress(Pageable pageable);

    @Query(value = """
        select count(*) as totalAlunos,
               count(case when coalesce(reading.completed_count, 0) > 0 then 1 end) as alunosAtivos,
               coalesce(sum(coalesce(reading.completed_count, 0)), 0) as livrosConcluidos,
               coalesce(sum(coalesce(student.pontos_totais, 0)), 0) as totalPontosEducacionais
        from usuarios student
        left join (
            select reading.leitor_id, count(*) as completed_count
            from leituras reading
            where reading.concluida = true
            group by reading.leitor_id
        ) reading on reading.leitor_id = student.id
        where student.tipo = 'LEITOR'
        """, nativeQuery = true)
    TeacherDashboardAggregate aggregateAllReaderProgress();

    @Query(
        value = """
            select student.id as "userId",
                   student.nome as nome,
                   student.email as email,
                   coalesce(points.total_points, 0) as "pontosEducacionais",
                   coalesce(reading.completed_count, 0) as "livrosConcluidos"
            from usuarios student
            join (
                select distinct member.student_id
                from teacher_class_members member
                join usuarios scoped_student on scoped_student.id = member.student_id
                where member.class_id in (:classIds) and scoped_student.tipo = 'LEITOR'
            ) scoped_students on scoped_students.student_id = student.id
            left join (
                select points.student_id, sum(points.points) as total_points
                from educational_class_points points
                where points.class_id in (:classIds)
                  and points.student_id in (
                      select member.student_id
                      from teacher_class_members member
                      join usuarios scoped_student on scoped_student.id = member.student_id
                      where member.class_id in (:classIds) and scoped_student.tipo = 'LEITOR'
                  )
                group by points.student_id
            ) points on points.student_id = student.id
            left join (
                select reading.leitor_id, count(*) as completed_count
                from leituras reading
                where reading.concluida = true
                  and reading.leitor_id in (
                      select member.student_id
                      from teacher_class_members member
                      join usuarios scoped_student on scoped_student.id = member.student_id
                      where member.class_id in (:classIds) and scoped_student.tipo = 'LEITOR'
                  )
                group by reading.leitor_id
            ) reading on reading.leitor_id = student.id
            order by coalesce(points.total_points, 0) desc, student.id asc
            """,
        countQuery = """
            select count(distinct member.student_id)
            from teacher_class_members member
            join usuarios student on student.id = member.student_id
            where member.class_id in (:classIds) and student.tipo = 'LEITOR'
            """,
        nativeQuery = true
    )
    Page<TeacherStudentProgressProjection> findTeacherStudentProgress(
        @Param("classIds") Collection<Long> classIds,
        Pageable pageable
    );
}
