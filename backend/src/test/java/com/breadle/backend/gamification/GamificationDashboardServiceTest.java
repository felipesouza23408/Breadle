package com.breadle.backend.gamification;

import com.breadle.backend.entity.TipoUsuario;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.reading.ReadingProgressEvent;
import com.breadle.backend.reading.ReadingProgressEventRepository;
import com.breadle.backend.reading.ReadingSession;
import com.breadle.backend.reading.ReadingSessionRepository;
import com.breadle.backend.repository.LeituraRepository;
import com.breadle.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GamificationDashboardServiceTest {

    private static final Long USER_ID = 7L;

    private UsuarioRepository usuarioRepository;
    private LeituraRepository leituraRepository;
    private ReadingSessionRepository readingSessionRepository;
    private ReadingProgressEventRepository readingProgressEventRepository;
    private GamificationDashboardService service;

    @BeforeEach
    void setUp() {
        usuarioRepository = mock(UsuarioRepository.class);
        leituraRepository = mock(LeituraRepository.class);
        readingSessionRepository = mock(ReadingSessionRepository.class);
        readingProgressEventRepository = mock(ReadingProgressEventRepository.class);
        service = new GamificationDashboardService(
            usuarioRepository,
            leituraRepository,
            readingSessionRepository,
            readingProgressEventRepository
        );

        Usuario user = new Usuario();
        user.setId(USER_ID);
        user.setNome("Leitor");
        user.setTipo(TipoUsuario.LEITOR);
        user.setPontosTotais(0);

        when(usuarioRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(usuarioRepository.findAllByTipoIn(List.of(TipoUsuario.LEITOR))).thenReturn(List.of(user));
        when(leituraRepository.findByLeitorIdOrderByIdDesc(USER_ID)).thenReturn(List.of());
    }

    @Test
    void shouldCountPagesAndReadingDaysFromActiveSessions() {
        ReadingSession todaySession = session("ACTIVE", 24, Instant.now());
        ReadingSession yesterdaySession = session("ACTIVE", 31, Instant.now().minus(1, ChronoUnit.DAYS));
        ReadingSession resumedSession = session("ACTIVE", 10, Instant.now().minus(10, ChronoUnit.DAYS));
        resumedSession.setLastProgressAt(Instant.now());
        when(readingSessionRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
            .thenReturn(List.of(todaySession, yesterdaySession, resumedSession));
        when(readingProgressEventRepository.findByUserIdAndCreatedAtGreaterThanEqual(
            org.mockito.ArgumentMatchers.eq(USER_ID),
            org.mockito.ArgumentMatchers.any()
        )).thenReturn(List.of(
            event(24, Instant.now()),
            event(31, Instant.now().minus(1, ChronoUnit.DAYS)),
            event(10, Instant.now())
        ));

        GamificationDashboardResponse dashboard = service.buildDashboard(USER_ID);

        assertEquals(65, dashboard.getWeeklyPages());
        assertEquals(2, dashboard.getReadingStreakDays());
        MissionProgress streakMission = findMission(dashboard, "Sequência semanal");
        assertEquals(2, streakMission.getProgress());
        assertFalse(streakMission.isCompleted());
        MissionProgress weeklyMission = findMission(dashboard, "Meta de páginas");
        assertEquals(65, weeklyMission.getProgress());
        assertFalse(weeklyMission.isCompleted());
    }

    @Test
    void shouldIgnoreSessionsWithoutRecordedProgressAndCompletedSessionsOutsideTheWeek() {
        ReadingSession emptySession = session("ACTIVE", 0, Instant.now());
        ReadingSession oldCompletedSession = session("COMPLETED", 80, Instant.now().minus(8, ChronoUnit.DAYS));
        when(readingSessionRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
            .thenReturn(List.of(emptySession, oldCompletedSession));
        when(readingProgressEventRepository.findByUserIdAndCreatedAtGreaterThanEqual(
            org.mockito.ArgumentMatchers.eq(USER_ID),
            org.mockito.ArgumentMatchers.any()
        )).thenReturn(List.of());

        GamificationDashboardResponse dashboard = service.buildDashboard(USER_ID);

        assertEquals(0, dashboard.getWeeklyPages());
        assertEquals(0, dashboard.getReadingStreakDays());
        assertTrue(findMission(dashboard, "Sequência semanal").getProgress() == 0);
    }

    @Test
    void generalRankingIncludesOnlyReadersAndUsesPersonalPoints() {
        Usuario teacher = new Usuario();
        teacher.setId(8L);
        teacher.setNome("Professor");
        teacher.setTipo(TipoUsuario.PROFESSOR);
        teacher.setPontosTotais(900);
        Usuario administrator = new Usuario();
        administrator.setId(9L);
        administrator.setNome("Administrador");
        administrator.setTipo(TipoUsuario.ADMINISTRADOR);
        administrator.setPontosTotais(1200);
        Usuario reader = userWithPoints(USER_ID, "Leitor", TipoUsuario.LEITOR, 35);
        when(usuarioRepository.findAllByTipoIn(anyCollection())).thenAnswer(invocation -> {
            java.util.Collection<TipoUsuario> types = invocation.getArgument(0);
            return List.of(reader, teacher, administrator).stream()
                .filter(candidate -> types.contains(candidate.getTipo()))
                .toList();
        });

        GamificationDashboardResponse dashboard = service.buildDashboard(USER_ID);

        assertEquals(1, dashboard.getRanking().size());
        assertEquals("Leitor", dashboard.getRanking().getFirst().getNome());
        assertEquals(35, dashboard.getRanking().getFirst().getPoints());
        verify(usuarioRepository).findAllByTipoIn(List.of(TipoUsuario.LEITOR));
    }

    private Usuario userWithPoints(Long id, String name, TipoUsuario type, int points) {
        Usuario user = new Usuario();
        user.setId(id);
        user.setNome(name);
        user.setTipo(type);
        user.setPontosTotais(points);
        return user;
    }

    private ReadingSession session(String status, int pagesRead, Instant createdAt) {
        ReadingSession session = new ReadingSession();
        session.setStatus(status);
        session.setPagesRead(pagesRead);
        session.setCreatedAt(createdAt);
        session.setLastProgressAt(createdAt);
        session.setPagesDefined(100);
        return session;
    }

    private ReadingProgressEvent event(int pagesReadDelta, Instant createdAt) {
        ReadingProgressEvent event = new ReadingProgressEvent();
        event.setPagesReadDelta(pagesReadDelta);
        event.setCreatedAt(createdAt);
        return event;
    }

    private MissionProgress findMission(GamificationDashboardResponse dashboard, String title) {
        return dashboard.getMissions().stream()
            .filter(mission -> mission.getTitle().equals(title))
            .findFirst()
            .orElseThrow();
    }
}
