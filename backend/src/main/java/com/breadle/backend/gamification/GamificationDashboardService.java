package com.breadle.backend.gamification;

import com.breadle.backend.entity.Leitura;
import com.breadle.backend.entity.Usuario;
import com.breadle.backend.reading.ReadingProgressEvent;
import com.breadle.backend.reading.ReadingProgressEventRepository;
import com.breadle.backend.reading.ReadingSession;
import com.breadle.backend.reading.ReadingSessionRepository;
import com.breadle.backend.repository.LeituraRepository;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class GamificationDashboardService {

    private static final int WEEKLY_GOAL_PAGES = 180;

    private final UsuarioRepository usuarioRepository;
    private final LeituraRepository leituraRepository;
    private final ReadingSessionRepository readingSessionRepository;
    private final ReadingProgressEventRepository readingProgressEventRepository;

    public GamificationDashboardService(UsuarioRepository usuarioRepository,
                                       LeituraRepository leituraRepository,
                                       ReadingSessionRepository readingSessionRepository,
                                       ReadingProgressEventRepository readingProgressEventRepository) {
        this.usuarioRepository = usuarioRepository;
        this.leituraRepository = leituraRepository;
        this.readingSessionRepository = readingSessionRepository;
        this.readingProgressEventRepository = readingProgressEventRepository;
    }

    public GamificationDashboardResponse buildDashboard(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        int totalPoints = usuario.getPontosTotais() == null ? 0 : usuario.getPontosTotais();
        long booksRead = leituraRepository.findByLeitorIdOrderByIdDesc(userId).stream()
            .filter(Leitura::getConcluida)
            .count();

        List<ReadingSession> sessions = readingSessionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        ZoneId zone = ZoneId.systemDefault();
        Instant activityStart = LocalDate.now(zone).minusDays(29).atStartOfDay(zone).toInstant();
        List<ReadingProgressEvent> progressEvents =
            readingProgressEventRepository.findByUserIdAndCreatedAtGreaterThanEqual(userId, activityStart);
        int readingStreakDays = calculateReadingStreak(progressEvents);
        int weeklyPages = calculateWeeklyPages(progressEvents);
        double averagePagesPerSession = calculateAveragePages(sessions);
        String nextMilestone = buildNextMilestone(weeklyPages, WEEKLY_GOAL_PAGES);

        List<MissionProgress> missions = buildMissionSet((int) booksRead, totalPoints, readingStreakDays, weeklyPages);

        List<RankingEntryDto> ranking = usuarioRepository.findAll().stream()
            .sorted(Comparator.comparing(Usuario::getPontosTotais, Comparator.nullsLast(Integer::compareTo)).reversed())
            .limit(10)
            .map((user) -> new RankingEntryDto(
                user.getId(),
                user.getNome(),
                user.getTipo().name(),
                user.getPontosTotais() == null ? 0 : user.getPontosTotais(),
                0))
            .toList();

        for (int i = 0; i < ranking.size(); i++) {
            ranking.get(i).setPosition(i + 1);
        }

        int userPosition = ranking.stream()
            .filter(entry -> entry.getUserId() != null && entry.getUserId().equals(userId))
            .map(RankingEntryDto::getPosition)
            .findFirst()
            .orElse(ranking.size() + 1);

        List<AchievementDto> achievements = List.of(
            new AchievementDto("Explorador", "Leu seu primeiro livro.", booksRead >= 1),
            new AchievementDto("Série em andamento", "Completou 3 livros.", booksRead >= 3),
            new AchievementDto("Sequência sólida", "Leu em 3 dias seguidos.", readingStreakDays >= 3),
            new AchievementDto("Meta semanal", "Atingiu 180 páginas em 7 dias.", weeklyPages >= WEEKLY_GOAL_PAGES),
            new AchievementDto("Pontos em alta", "Chegou a 150 pontos.", totalPoints >= 150),
            new AchievementDto("Líder da turma", "Ficou entre os 5 melhores do ranking.", userPosition <= 5)
        );

        return new GamificationDashboardResponse(
            totalPoints,
            booksRead,
            readingStreakDays,
            weeklyPages,
            WEEKLY_GOAL_PAGES,
            averagePagesPerSession,
            nextMilestone,
            missions,
            achievements,
            ranking
        );
    }

    private List<MissionProgress> buildMissionSet(int booksRead, int totalPoints, int readingStreakDays, int weeklyPages) {
        List<MissionProgress> missions = new ArrayList<>();
        missions.add(buildMission("Primeira leitura", "Conclua seu primeiro livro.", booksRead, 1));
        missions.add(buildMission("Leitor constante", "Conclua 3 livros.", booksRead, 3));
        missions.add(buildMission("Sequência semanal", "Leitura em 3 dias seguidos.", readingStreakDays, 3));
        missions.add(buildMission("Meta de páginas", "Leia 180 páginas em 7 dias.", weeklyPages, WEEKLY_GOAL_PAGES));
        missions.add(buildMission("Acumulador", "Alcance 150 pontos.", totalPoints, 150));
        return missions;
    }

    private MissionProgress buildMission(String title, String description, int current, int target) {
        int progress = Math.min(current, target);
        boolean completed = progress >= target;
        if (target <= 0) {
            progress = 0;
            completed = false;
        }
        return new MissionProgress(title, description, progress, target, completed);
    }

    private int calculateReadingStreak(List<ReadingProgressEvent> events) {
        if (events == null || events.isEmpty()) {
            return 0;
        }

        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        int streak = 0;
        for (int i = 0; i < 30; i++) {
            LocalDate currentDate = today.minusDays(i);
            boolean hasReadingOnDate = events.stream()
                .anyMatch(event -> toLocalDate(event).equals(currentDate));
            if (hasReadingOnDate) {
                streak++;
            } else {
                if (i > 0) {
                    break;
                }
            }
        }
        return streak;
    }

    private int calculateWeeklyPages(List<ReadingProgressEvent> events) {
        if (events == null || events.isEmpty()) {
            return 0;
        }

        Instant sevenDaysAgo = LocalDate.now(ZoneId.systemDefault()).minusDays(6)
            .atStartOfDay(ZoneId.systemDefault()).toInstant();
        return events.stream()
            .filter(event -> !event.getCreatedAt().isBefore(sevenDaysAgo))
            .mapToInt(event -> event.getPagesReadDelta() == null ? 0 : event.getPagesReadDelta())
            .sum();
    }

    private double calculateAveragePages(List<ReadingSession> sessions) {
        if (sessions == null || sessions.isEmpty()) {
            return 0;
        }

        List<Integer> values = sessions.stream()
            .filter(session -> session.getPagesRead() != null)
            .map(ReadingSession::getPagesRead)
            .toList();

        if (values.isEmpty()) {
            return 0;
        }

        return values.stream().mapToInt(Integer::intValue).average().orElse(0d);
    }

    private String buildNextMilestone(int weeklyPages, int weeklyGoalPages) {
        if (weeklyPages >= weeklyGoalPages) {
            return "Meta semanal concluída!";
        }
        int remaining = weeklyGoalPages - weeklyPages;
        return remaining + " páginas até sua meta semanal.";
    }

    private LocalDate toLocalDate(ReadingProgressEvent event) {
        return event.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
    }
}
