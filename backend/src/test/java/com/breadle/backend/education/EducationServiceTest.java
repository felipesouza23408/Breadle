package com.breadle.backend.education;

import com.breadle.backend.common.ConflictException;
import com.breadle.backend.common.ResourceNotFoundException;
import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

class EducationServiceTest {
    private UsuarioRepository usuarioRepository;
    private TeacherClassRepository teacherClassRepository;
    private TeacherClassMemberRepository memberRepository;
    private EducationService service;

    @BeforeEach
    void setUp() {
        usuarioRepository = mock(UsuarioRepository.class);
        teacherClassRepository = mock(TeacherClassRepository.class);
        memberRepository = mock(TeacherClassMemberRepository.class);
        service = new EducationService(usuarioRepository, teacherClassRepository, memberRepository);
    }

    @Test
    void teacherDashboardUsesOnlyOwnedClassesAndAggregatedQueries() {
        Usuario teacher = user(10L, TipoUsuario.PROFESSOR, "Professora A");
        TeacherClass ownedClass = new TeacherClass();
        ownedClass.setId(100L);
        ownedClass.setTeacherId(teacher.getId());

        when(teacherClassRepository.findByTeacherIdOrderByIdDesc(teacher.getId())).thenReturn(List.of(ownedClass));
        TeacherDashboardAggregate aggregate = mock(TeacherDashboardAggregate.class);
        when(aggregate.getTotalAlunos()).thenReturn(1L);
        when(aggregate.getAlunosAtivos()).thenReturn(1L);
        when(aggregate.getLivrosConcluidos()).thenReturn(2L);
        when(aggregate.getTotalPontosEducacionais()).thenReturn(7L);
        when(memberRepository.aggregateDashboardForClasses(List.of(100L))).thenReturn(aggregate);
        when(usuarioRepository.findTeacherStudentProgress(
            eq(List.of(100L)), eq(PageRequest.of(0, 20))))
            .thenReturn(new PageImpl<>(List.of(new ProgressRow(
                1L, "Aluno da A", "alunodaA@example.com", 7L, 2L)), PageRequest.of(0, 20), 1));

        TeacherDashboardResponse response = service.buildTeacherDashboard(teacher, 0, 20);

        assertEquals(1, response.getTotalAlunos());
        assertEquals("Aluno da A", response.getTopAlunos().getFirst().getNome());
        assertEquals(7, response.getTopAlunos().getFirst().getPontosEducacionais());
        assertEquals(7, response.getMediaPontosEducacionais());
        assertEquals(2, response.getLivrosConcluidos());
        assertEquals(0, response.getPage());
        assertEquals(20, response.getSize());
        verify(usuarioRepository, never()).findAll();
        verify(usuarioRepository, times(1)).findTeacherStudentProgress(
            eq(List.of(100L)), eq(PageRequest.of(0, 20)));
        verify(memberRepository, times(1)).aggregateDashboardForClasses(List.of(100L));
        verify(memberRepository, never()).findDistinctStudentIdsByClassIds(anyCollection());
    }

    @Test
    void teacherDashboardReturnsRequestedPageAndScopedSummary() {
        Usuario teacher = user(10L, TipoUsuario.PROFESSOR, "Professora A");
        TeacherClass ownedClass = new TeacherClass();
        ownedClass.setId(100L);
        when(teacherClassRepository.findByTeacherIdOrderByIdDesc(teacher.getId())).thenReturn(List.of(ownedClass));
        TeacherDashboardAggregate aggregate = mock(TeacherDashboardAggregate.class);
        when(aggregate.getTotalAlunos()).thenReturn(5L);
        when(aggregate.getAlunosAtivos()).thenReturn(3L);
        when(aggregate.getLivrosConcluidos()).thenReturn(9L);
        when(aggregate.getTotalPontosEducacionais()).thenReturn(105L);
        when(memberRepository.aggregateDashboardForClasses(List.of(100L))).thenReturn(aggregate);
        PageRequest requestedPage = PageRequest.of(1, 2);
        when(usuarioRepository.findTeacherStudentProgress(List.of(100L), requestedPage))
            .thenReturn(new PageImpl<>(List.of(
                new ProgressRow(3L, "Aluno 3", "a3@example.com", 30L, 2L),
                new ProgressRow(4L, "Aluno 4", "a4@example.com", 20L, 1L)
            ), requestedPage, 5));

        TeacherDashboardResponse response = service.buildTeacherDashboard(teacher, 1, 2);

        assertEquals(5, response.getTotalAlunos());
        assertEquals(1, response.getPage());
        assertEquals(2, response.getSize());
        assertEquals(true, response.isHasNext());
        assertEquals(List.of("Aluno 3", "Aluno 4"),
            response.getTopAlunos().stream().map(StudentProgressDto::getNome).toList());
        assertEquals(21, response.getMediaPontosEducacionais());
        verify(usuarioRepository).findTeacherStudentProgress(List.of(100L), requestedPage);
        verify(usuarioRepository, never()).findAll();
    }

    @Test
    void administratorDashboardUsesPaginatedAggregatesAcrossAllReaders() {
        Usuario administrator = user(99L, TipoUsuario.ADMINISTRADOR, "Administrador");
        TeacherDashboardAggregate aggregate = mock(TeacherDashboardAggregate.class);
        when(aggregate.getTotalAlunos()).thenReturn(3L);
        when(aggregate.getAlunosAtivos()).thenReturn(2L);
        when(aggregate.getLivrosConcluidos()).thenReturn(4L);
        when(aggregate.getTotalPontosEducacionais()).thenReturn(50L);
        when(usuarioRepository.aggregateAllReaderProgress()).thenReturn(aggregate);
        PageRequest requestedPage = PageRequest.of(1, 2);
        when(usuarioRepository.findAllReaderProgress(requestedPage))
            .thenReturn(new PageImpl<>(List.of(
                new ProgressRow(3L, "Leitor 3", "leitor3@example.com", 20L, 3L)
            ), requestedPage, 3));

        TeacherDashboardResponse response = service.buildTeacherDashboard(administrator, 1, 2);

        assertEquals(3, response.getTotalAlunos());
        assertEquals(2, response.getAlunosAtivos());
        assertEquals(4, response.getLivrosConcluidos());
        assertEquals(17, response.getMediaPontosEducacionais());
        assertEquals(1, response.getPage());
        assertEquals(2, response.getSize());
        assertEquals(false, response.isHasNext());
        assertEquals("Leitor 3", response.getTopAlunos().getFirst().getNome());
        verify(usuarioRepository).aggregateAllReaderProgress();
        verify(usuarioRepository).findAllReaderProgress(requestedPage);
        verify(usuarioRepository, never()).findAll();
        verify(teacherClassRepository, never()).findByTeacherIdOrderByIdDesc(any());
        verify(memberRepository, never()).aggregateDashboardForClasses(anyCollection());
    }

    @Test
    void teacherDashboardRejectsInvalidPageAndSize() {
        Usuario teacher = user(10L, TipoUsuario.PROFESSOR, "Professora A");

        assertThrows(IllegalArgumentException.class, () -> service.buildTeacherDashboard(teacher, -1, 20));
        assertThrows(IllegalArgumentException.class, () -> service.buildTeacherDashboard(teacher, 0, 0));
        assertThrows(IllegalArgumentException.class, () -> service.buildTeacherDashboard(teacher, 0, 51));

        verify(teacherClassRepository, never()).findByTeacherIdOrderByIdDesc(any());
    }

    @Test
    void readerCannotAccessTeacherDashboard() {
        Usuario reader = user(2L, TipoUsuario.LEITOR, "Leitor");

        assertThrows(IllegalArgumentException.class, () -> service.buildTeacherDashboard(reader, 0, 20));

        verify(usuarioRepository, never()).findAllReaderProgress(any());
        verify(teacherClassRepository, never()).findByTeacherIdOrderByIdDesc(any());
    }

    @Test
    void invalidInvitationCodeDoesNotCreateMembership() {
        Usuario student = user(2L, TipoUsuario.LEITOR, "Aluno");
        when(teacherClassRepository.findByInvitationCodeHash(EducationService.hashInvitationCode("invalid-code")))
            .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.joinClass(student, "invalid-code"));

        verify(memberRepository, never()).save(any(TeacherClassMember.class));
    }

    @Test
    void readerCanJoinClassWithValidInvitationCode() {
        Usuario student = user(2L, TipoUsuario.LEITOR, "Aluno");
        TeacherClass teacherClass = new TeacherClass();
        teacherClass.setId(77L);
        teacherClass.setName("Leitura de verão");
        when(teacherClassRepository.findByInvitationCodeHash(EducationService.hashInvitationCode("valid-code")))
            .thenReturn(Optional.of(teacherClass));
        when(memberRepository.existsByClassIdAndStudentId(77L, 2L)).thenReturn(false);
        when(memberRepository.save(any(TeacherClassMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        JoinTeacherClassResponse response = service.joinClass(student, " valid-code ");

        assertEquals("Leitura de verão", response.className());
        org.mockito.ArgumentCaptor<TeacherClassMember> captor =
            org.mockito.ArgumentCaptor.forClass(TeacherClassMember.class);
        verify(memberRepository).save(captor.capture());
        assertEquals(77L, captor.getValue().getClassId());
        assertEquals(2L, captor.getValue().getStudentId());
    }

    @Test
    void duplicateClassMembershipReturnsConflict() {
        Usuario student = user(2L, TipoUsuario.LEITOR, "Aluno");
        TeacherClass teacherClass = new TeacherClass();
        teacherClass.setId(77L);
        when(teacherClassRepository.findByInvitationCodeHash(EducationService.hashInvitationCode("valid-code")))
            .thenReturn(Optional.of(teacherClass));
        when(memberRepository.existsByClassIdAndStudentId(77L, 2L)).thenReturn(true);

        assertThrows(ConflictException.class, () -> service.joinClass(student, "valid-code"));

        verify(memberRepository, never()).save(any(TeacherClassMember.class));
    }

    @Test
    void creationReturnsCodeButPersistsOnlyItsHash() {
        Usuario teacher = user(10L, TipoUsuario.PROFESSOR, "Professora");
        when(teacherClassRepository.existsByInvitationCodeHash(anyString())).thenReturn(false);
        when(teacherClassRepository.save(any(TeacherClass.class))).thenAnswer(invocation -> {
            TeacherClass saved = invocation.getArgument(0);
            saved.setId(99L);
            return saved;
        });

        CreatedTeacherClassDto response = service.createClass(teacher, "  Turma 1  ");

        assertEquals("Turma 1", response.name());
        assertEquals(22, response.invitationCode().length());
        org.mockito.ArgumentCaptor<TeacherClass> captor = org.mockito.ArgumentCaptor.forClass(TeacherClass.class);
        verify(teacherClassRepository).save(captor.capture());
        assertEquals(teacher.getId(), captor.getValue().getTeacherId());
        assertNotEquals(response.invitationCode(), captor.getValue().getInvitationCodeHash());
        assertEquals(EducationService.hashInvitationCode(response.invitationCode()),
            captor.getValue().getInvitationCodeHash());
    }

    private Usuario user(Long id, TipoUsuario type, String name) {
        Usuario user = new Usuario();
        user.setId(id);
        user.setTipo(type);
        user.setNome(name);
        user.setEmail(name.replace(" ", "").toLowerCase() + "@example.com");
        user.setPontosTotais(25);
        return user;
    }

    private record ProgressRow(Long userId, String nome, String email,
                               Long pontosEducacionais, Long livrosConcluidos)
        implements TeacherStudentProgressProjection {
        @Override
        public Long getUserId() { return userId; }
        @Override
        public String getNome() { return nome; }
        @Override
        public String getEmail() { return email; }
        @Override
        public Long getPontosEducacionais() { return pontosEducacionais; }
        @Override
        public Long getLivrosConcluidos() { return livrosConcluidos; }
    }
}
