package com.breadle.backend.education;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface TeacherClassMemberRepository extends JpaRepository<TeacherClassMember, Long> {
    boolean existsByClassIdAndStudentId(Long classId, Long studentId);
    List<TeacherClassMember> findByClassIdIn(Collection<Long> classIds);

    @Query("select distinct member.studentId from TeacherClassMember member where member.classId in :classIds")
    List<Long> findDistinctStudentIdsByClassIds(@Param("classIds") Collection<Long> classIds);

    @Query(value = """
        select count(*) as totalAlunos,
               count(case when coalesce(reading.completed_count, 0) > 0 then 1 end) as alunosAtivos,
               coalesce(sum(coalesce(reading.completed_count, 0)), 0) as livrosConcluidos,
               coalesce(sum(coalesce(points.total_points, 0)), 0) as totalPontosEducacionais
        from (
            select distinct member.student_id
            from teacher_class_members member
            join usuarios student on student.id = member.student_id
            where member.class_id in (:classIds) and student.tipo = 'LEITOR'
        ) scoped_students
        left join (
            select reading.leitor_id, count(*) as completed_count
            from leituras reading
            where reading.concluida = true
              and reading.leitor_id in (
                  select member.student_id
                  from teacher_class_members member
                  join usuarios student on student.id = member.student_id
                  where member.class_id in (:classIds) and student.tipo = 'LEITOR'
              )
            group by reading.leitor_id
        ) reading on reading.leitor_id = scoped_students.student_id
        left join (
            select points.student_id, sum(points.points) as total_points
            from educational_class_points points
            where points.class_id in (:classIds)
              and points.student_id in (
                  select member.student_id
                  from teacher_class_members member
                  join usuarios student on student.id = member.student_id
                  where member.class_id in (:classIds) and student.tipo = 'LEITOR'
              )
            group by points.student_id
        ) points on points.student_id = scoped_students.student_id
        """, nativeQuery = true)
    TeacherDashboardAggregate aggregateDashboardForClasses(@Param("classIds") Collection<Long> classIds);
}
