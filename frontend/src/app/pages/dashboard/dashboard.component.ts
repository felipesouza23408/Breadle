import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { GamificationDashboard, GamificationService } from '../../services/gamification.service';
import { NotificationService, UserNotification } from '../../services/notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="dashboard">
      <header class="topbar">
        <div>
          <span class="brand">Breadle</span>
          <h1>Dashboard do leitor</h1>
        </div>
        <div class="header-actions">
          <span class="user-pill" *ngIf="profile">{{ profile?.nome }}</span>
          <button type="button" class="logout-button" (click)="logout()">Sair</button>
        </div>
      </header>

      <section class="panel dashboard-error" *ngIf="gamificationError" role="alert">
        <div>
          <p>{{ gamificationError }}</p>
          <small *ngIf="gamification">Exibindo os últimos dados carregados.</small>
        </div>
        <button type="button" class="action-button" (click)="loadGamification()" [disabled]="gamificationLoading">
          {{ gamificationLoading ? 'Atualizando...' : 'Tentar novamente' }}
        </button>
      </section>

      <section class="cards" *ngIf="gamification">
        <article class="card highlight">
          <span>Pontos totais</span>
          <strong>{{ getTotalPoints() }}</strong>
          <small>pontos acumulados</small>
        </article>
        <article class="card">
          <span>Livros lidos</span>
          <strong>{{ getBooksRead() }}</strong>
          <small>livros concluídos</small>
        </article>
        <article class="card">
          <span>Sequência</span>
          <strong>{{ getReadingStreak() }} dias</strong>
          <small>{{ getReadingStreakLabel() }}</small>
        </article>
        <article class="card">
          <span>Ranking</span>
          <strong>#{{ getRankPosition() }}</strong>
          <small>Brasil</small>
        </article>
      </section>

      <section class="insight-banner" *ngIf="gamification">
        <div class="insight-block">
          <span>Meta semanal</span>
          <strong>{{ getWeeklyPages() }}/{{ getWeeklyGoalPages() }} páginas</strong>
          <small>{{ getWeeklyMilestone() }}</small>
        </div>
        <div class="insight-block">
          <span>Média por sessão</span>
          <strong>{{ getAveragePages() }} páginas</strong>
          <small>Tempo de leitura realista</small>
        </div>
      </section>

      <section class="quick-actions">
        <a routerLink="/books" class="action-button">Explorar acervo</a>
        <a routerLink="/groups" class="action-button secondary">Grupos de leitura</a>
        <a routerLink="/books/1" class="action-button secondary">Abrir livro em destaque</a>
        <a *ngIf="isTeacher" routerLink="/teacher" class="action-button secondary">Gerenciar turma</a>
      </section>

      <section class="panel notification-panel" *ngIf="notifications.length">
        <div class="notification-header">
          <h2>Notificações</h2>
          <button type="button" class="mark-read-button" (click)="markNotificationsAsRead()">Marcar como lidas</button>
        </div>
        <ul class="notification-list">
          <li *ngFor="let notification of notifications | slice:0:4" [ngClass]="'type-' + notification.type.toLowerCase()">
            <strong>{{ notification.title }}</strong>
            <span>{{ notification.message }}</span>
            <small>{{ formatDate(notification.createdAt) }}</small>
          </li>
        </ul>
      </section>

      <section class="panel-grid" *ngIf="gamification">
        <article class="panel">
          <h2>Missões</h2>
          <ul class="mission-list">
            <li *ngFor="let mission of gamification.missions">
              <div class="mission-top">
                <strong>{{ mission.title }}</strong>
                <span>{{ mission.completed ? 'Concluída' : 'Em andamento' }}</span>
              </div>
              <small>{{ mission.description }}</small>
              <div class="bar"><span [style.width.%]="getMissionPercentage(mission)"></span></div>
              <div class="mission-meta"><span>{{ mission.progress | number }} / {{ mission.target | number }} {{ missionUnit(mission.title) }}</span></div>
            </li>
          </ul>
        </article>

        <article class="panel">
          <h2>Conquistas</h2>
          <ul class="achievement-list">
            <li *ngFor="let achievement of gamification.achievements">
              <span class="achievement-badge" [class.unlocked]="achievement.unlocked">{{ achievement.unlocked ? '✓' : '•' }}</span>
              <div>
                <strong>{{ achievement.title }}</strong>
                <small>{{ achievement.description }}</small>
              </div>
            </li>
          </ul>
        </article>

        <article class="panel full-width">
          <h2>Ranking</h2>
          <ol class="ranking-list">
            <li *ngFor="let entry of gamification.ranking.slice(0, 5)">
              <span class="ranking-position">#{{ entry.position }}</span>
              <div>
                <strong>{{ entry.nome }}</strong>
                <small>{{ entry.tipo }}</small>
              </div>
              <span class="ranking-points">{{ entry.points }} pts</span>
            </li>
          </ol>
        </article>
      </section>

      <section class="learning-panel" *ngIf="gamification">
        <article class="panel education-card">
          <h2>Seu ritmo de leitura</h2>
          <div class="education-summary">
            <div>
              <span class="label">Meta semanal</span>
              <strong>{{ getWeeklyGoal() }}</strong>
            </div>
            <div>
              <span class="label">Progresso</span>
              <strong>{{ getWeeklyProgress() }}</strong>
            </div>
            <div>
              <span class="label">Próxima ação</span>
              <strong>{{ getNextAction() }}</strong>
            </div>
          </div>
        </article>

        <article class="panel activity-card">
          <h2>Destaques do progresso</h2>
          <ul class="activity-list">
            <li *ngFor="let item of getRecentHighlights()">
              <span>{{ item.done ? '✓' : '•' }}</span>
              {{ item.label }}
            </li>
            <li *ngIf="!getRecentHighlights().length">Nenhum progresso registrado ainda.</li>
          </ul>
        </article>
      </section>

      <section class="content-grid" *ngIf="gamification">
        <article class="panel">
          <h2>Progresso da semana</h2>
          <div class="bar-group">
            <div class="bar-row">
              <label>Meta de páginas <span>{{ getWeeklyPages() }}/{{ getWeeklyGoalPages() }}</span></label>
              <div class="bar" role="progressbar" aria-label="Progresso da meta semanal de páginas" [attr.aria-valuenow]="getWeeklyProgressPercentage()" aria-valuemin="0" aria-valuemax="100">
                <span [style.width.%]="getWeeklyProgressPercentage()"></span>
              </div>
            </div>
            <div class="bar-row">
              <label>Sequência de leitura <span>{{ getReadingStreak() }}/3 dias</span></label>
              <div class="bar" role="progressbar" aria-label="Progresso da sequência de leitura" [attr.aria-valuenow]="getReadingStreakPercentage()" aria-valuemin="0" aria-valuemax="100">
                <span [style.width.%]="getReadingStreakPercentage()"></span>
              </div>
            </div>
            <div class="bar-row">
              <label>Missões concluídas <span>{{ getCompletedMissions() }}/{{ getMissionTotal() }}</span></label>
              <div class="bar" role="progressbar" aria-label="Progresso das missões concluídas" [attr.aria-valuenow]="getMissionCompletionPercentage()" aria-valuemin="0" aria-valuemax="100">
                <span [style.width.%]="getMissionCompletionPercentage()"></span>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .dashboard {
        min-height: 100vh;
        background: radial-gradient(circle at top left, rgba(214,169,74,0.16), transparent 24%),
                    linear-gradient(180deg, #f7f1e8 0%, #eef2f7 100%);
        padding: 2rem;
        color: #172033;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        gap: 1rem;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .brand {
        display: inline-block;
        background: rgba(214,169,74,0.12);
        color: #2b3b58;
        padding: 0.42rem 0.8rem;
        border-radius: 999px;
        font-weight: 800;
        border: 1px solid rgba(214,169,74,0.25);
      }
      h1 { margin: 0.8rem 0 0; color: #1d2b42; }
      .home-link,
      .logout-button,
      .user-pill {
        font-weight: 700;
      }
      .home-link {
        color: #172033;
        text-decoration: none;
      }
      .logout-button {
        border: none;
        background: linear-gradient(135deg, #1d2b42, #324d74);
        color: white;
        border-radius: 999px;
        padding: 0.55rem 0.9rem;
        cursor: pointer;
      }
      .user-pill {
        background: rgba(83, 116, 77, 0.1);
        color: #355b49;
        border-radius: 999px;
        padding: 0.45rem 0.75rem;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: 1rem;
      }
      .insight-banner {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 1rem;
        margin: 1.2rem 0 2rem;
      }
      .insight-block {
        background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,244,250,0.92));
        border: 1px solid rgba(23,32,51,0.05);
        border-radius: 1rem;
        padding: 1rem 1.2rem;
        box-shadow: 0 12px 28px rgba(23,32,51,0.04);
      }
      .insight-block span {
        display: block;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #4d677d;
      }
      .insight-block strong {
        display: block;
        margin: 0.4rem 0;
        font-size: 1.2rem;
        color: #172033;
      }
      .insight-block small {
        color: #4d677d;
      }
      .card {
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(23,32,51,0.04);
        border-radius: 1.2rem;
        padding: 1.2rem;
        box-shadow: 0 12px 28px rgba(23,32,51,0.06);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 18px 40px rgba(23,32,51,0.09);
      }
      .card.highlight {
        background: linear-gradient(135deg, #1f2d45, #314d73 55%, #d6a94a 100%);
        color: white;
      }
      .card span, .card small { display: block; color: inherit; opacity: 0.8; }
      .card strong { display: block; font-size: 2rem; margin: 0.4rem 0; }
      .quick-actions {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin: 2rem 0;
      }
      .action-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.8rem 1.2rem;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 700;
        background: linear-gradient(135deg, #1d2b42, #2c4b73);
        color: white;
      }
      .action-button.secondary {
        background: rgba(214,169,74,0.12);
        color: #2d3e5d;
        border: 1px solid rgba(214,169,74,0.25);
      }
      .notification-panel {
        margin-bottom: 1.5rem;
      }
      .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .mark-read-button {
        border: none;
        background: rgba(214,169,74,0.12);
        color: #2b3b58;
        border-radius: 999px;
        padding: 0.55rem 0.8rem;
        font-weight: 700;
        cursor: pointer;
      }
      .notification-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.8rem;
      }
      .notification-list li {
        display: grid;
        gap: 0.25rem;
        padding: 0.8rem 0.9rem;
        border-radius: 0.8rem;
        border: 1px solid rgba(23,32,51,0.06);
        background: #f8fafc;
      }
      .notification-list strong { color: #172033; }
      .notification-list span, .notification-list small { color: #4d677d; }
      .type-success { border-left: 4px solid #2d7a5f; }
      .type-info { border-left: 4px solid #4c6d9a; }
      .type-warning { border-left: 4px solid #d6a94a; }
      .panel-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(260px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .panel {
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(22, 35, 48, 0.05);
        border-radius: 1.1rem;
        padding: 1.25rem;
        box-shadow: 0 10px 30px rgba(23,32,51,0.04);
      }
      .dashboard-error {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .dashboard-error p { margin: 0; }
      .dashboard-error small { display: block; margin-top: .35rem; color: #4d677d; }
      .dashboard-error button:disabled { opacity: .65; cursor: wait; }
      .full-width {
        grid-column: 1 / -1;
      }
      .mission-list,
      .achievement-list,
      .ranking-list,
      .profile-list,
      .activity-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .mission-list {
        display: grid;
        gap: 1rem;
      }
      .mission-list li,
      .achievement-list li,
      .ranking-list li {
        display: grid;
        gap: 0.45rem;
      }
      .mission-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
      }
      .mission-top span,
      .mission-meta,
      .achievement-list small,
      .ranking-list small,
      .profile-list,
      .label {
        color: #4d677d;
      }
      .bar-group { display: grid; gap: 1rem; }
      .bar-row { display: grid; gap: 0.5rem; }
      .bar-row label { display: flex; justify-content: space-between; gap: .75rem; }
      .bar-row label span { color: #4d677d; }
      .bar { height: 10px; background: #edf0f5; border-radius: 999px; overflow: hidden; }
      .bar span { display: block; height: 100%; background: linear-gradient(90deg, #d6a94a, #7d9bb2); border-radius: inherit; }
      .achievement-list li {
        grid-template-columns: auto 1fr;
        align-items: start;
        gap: 0.7rem;
      }
      .achievement-badge {
        display: inline-grid;
        place-items: center;
        width: 1.7rem;
        height: 1.7rem;
        border-radius: 50%;
        background: #edf0f5;
        color: #51627a;
        font-weight: 800;
      }
      .achievement-badge.unlocked {
        background: #eaf8f1;
        color: #1f7a5f;
      }
      .ranking-list {
        display: grid;
        gap: 0.8rem;
      }
      .ranking-list li {
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.75rem;
        padding: 0.7rem 0.8rem;
        border-radius: 0.75rem;
        background: #f7f9fc;
      }
      .ranking-position {
        font-weight: 800;
        color: #1f7a5f;
      }
      .ranking-points {
        font-weight: 700;
        color: #172033;
      }
      .learning-panel {
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .education-card,
      .activity-card {
        background: white;
        border-radius: 1rem;
        padding: 1.25rem;
        box-shadow: 0 10px 30px rgba(23,32,51,0.04);
      }
      .education-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(120px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }
      .education-summary > div {
        background: #f7faf8;
        border: 1px solid #e4f0ea;
        border-radius: 0.8rem;
        padding: 0.8rem;
        display: grid;
        gap: 0.35rem;
      }
      .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .activity-list {
        display: grid;
        gap: 0.8rem;
        margin-top: 1rem;
      }
      .activity-list li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #24324e;
      }
      .activity-list span {
        display: inline-grid;
        place-items: center;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        background: #edf7f2;
        color: #1f7a5f;
        font-weight: 800;
      }
      .profile-list {
        margin: 1rem 0 0;
        padding-left: 1.1rem;
        display: grid;
        gap: 0.8rem;
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
      }
      .inline-action,
      .save-button {
        border: none;
        border-radius: 0.75rem;
        padding: 0.7rem 0.9rem;
        background: linear-gradient(135deg, #1d2b42, #2d486d);
        color: white;
        font-weight: 700;
        cursor: pointer;
      }
      .profile-form {
        display: grid;
        gap: 0.9rem;
        margin-top: 1rem;
      }
      .profile-form label {
        display: grid;
        gap: 0.45rem;
        font-weight: 600;
        color: #24324e;
      }
      .profile-form input,
      .profile-form textarea {
        width: 100%;
        border: 1px solid rgba(24, 34, 53, 0.12);
        border-radius: 0.8rem;
        padding: 0.8rem 0.9rem;
        font: inherit;
        resize: vertical;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
      }
      .content-grid {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 1rem;
      }
      @media (max-width: 900px) {
        .cards, .panel-grid, .learning-panel, .content-grid, .insight-banner { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  gamification: GamificationDashboard | null = null;
  gamificationError = '';
  gamificationLoading = false;
  notifications: UserNotification[] = [];
  isEditingProfile = false;
  editForm: Partial<UserProfile> = {};

  constructor(
    private authService: AuthService,
    private gamificationService: GamificationService,
    private notificationService: NotificationService,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
  ) {}

  get isTeacher(): boolean {
    return this.profile?.tipo === 'PROFESSOR';
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const session = this.authService.getSession();
    if (session) {
      this.profile = {
        id: 0,
        nome: session.nome,
        email: session.email,
        tipo: session.tipo,
        pontosTotais: 0,
      };
    }

    this.authService.me().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.loadGamification();
        this.loadNotifications();
        this.connectRealtimeNotifications();
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.profile = this.profile ?? {
          id: 0,
          nome: session?.nome ?? 'Leitor',
          email: session?.email ?? 'usuario@breadle.com',
          tipo: session?.tipo ?? 'LEITOR',
          pontosTotais: 0,
        };
        this.loadGamification();
        this.loadNotifications();
        this.connectRealtimeNotifications();
        this.changeDetector.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.notificationService.disconnect();
  }

  getTotalPoints(): number {
    return this.profile?.pontosTotais ?? this.gamification?.totalPoints ?? 0;
  }

  getBooksRead(): number {
    return this.gamification?.booksRead ?? 0;
  }

  getCompletedMissions(): number {
    return this.gamification?.missions.filter((mission) => mission.completed).length ?? 0;
  }

  getMissionTotal(): number {
    return this.gamification?.missions.length ?? 0;
  }

  missionUnit(title: string): string {
    const normalizedTitle = title.toLocaleLowerCase('pt-BR');
    if (normalizedTitle.includes('página')) {
      return 'páginas';
    }
    if (normalizedTitle.includes('ponto') || title === 'Acumulador') {
      return 'pontos';
    }
    if (normalizedTitle.includes('sequência')) {
      return 'dias seguidos';
    }
    return 'livros';
  }

  getOpenMissions(): number {
    return Math.max(0, this.getMissionTotal() - this.getCompletedMissions());
  }

  getRankPosition(): string {
    const currentUserId = this.profile?.id;
    if (!currentUserId || !this.gamification) {
      return '—';
    }

    const current = this.gamification.ranking.find((entry) => entry.userId === currentUserId);
    if (current) {
      return String(current.position);
    }
    return this.gamification.ranking.length >= 10 ? '10+' : '—';
  }

  getReadingStreak(): number {
    return this.gamification?.readingStreakDays ?? 0;
  }

  getReadingStreakLabel(): string {
    return this.getReadingStreak() >= 3 ? 'mantendo a rotina' : 'comece hoje';
  }

  getWeeklyPages(): number {
    return this.gamification?.weeklyPages ?? 0;
  }

  getWeeklyGoalPages(): number {
    return this.gamification?.weeklyGoalPages ?? 180;
  }

  getAveragePages(): number {
    const average = this.gamification?.averagePagesPerSession ?? 0;
    return Math.round(average);
  }

  getWeeklyMilestone(): string {
    return this.gamification?.nextMilestone ?? 'Acompanhe sua sequência';
  }

  getMissionPercentage(mission: { progress: number; target: number }): number {
    if (!mission.target) {
      return 0;
    }
    return Math.min(100, (mission.progress / mission.target) * 100);
  }

  getNextMission(): { title: string; progress: number; target: number } | null {
    const missions = this.gamification?.missions ?? [];
    return missions.find((mission) => !mission.completed) ?? null;
  }

  getWeeklyGoal(): string {
    if (this.gamification) {
      return `${this.getWeeklyPages()}/${this.getWeeklyGoalPages()} páginas`;
    }

    const nextMission = this.getNextMission();
    if (nextMission) {
      return `${nextMission.target} pontos até a próxima meta`;
    }
    return '180 páginas por semana';
  }

  getWeeklyProgress(): string {
    return `${this.getWeeklyProgressPercentage()}%`;
  }

  getWeeklyProgressPercentage(): number {
    const goal = this.getWeeklyGoalPages();
    return goal > 0 ? Math.min(100, Math.round((this.getWeeklyPages() / goal) * 100)) : 0;
  }

  getReadingStreakPercentage(): number {
    return Math.min(100, Math.round((this.getReadingStreak() / 3) * 100));
  }

  getMissionCompletionPercentage(): number {
    const total = this.getMissionTotal();
    return total > 0 ? Math.round((this.getCompletedMissions() / total) * 100) : 0;
  }

  getNextAction(): string {
    if (this.gamification?.nextMilestone) {
      return this.gamification.nextMilestone;
    }

    const mission = this.getNextMission();
    if (mission) {
      return mission.title;
    }
    return 'Continuar leitura';
  }

  getRecentHighlights(): Array<{ label: string; done: boolean }> {
    const highlights: Array<{ label: string; done: boolean }> = [];

    const booksRead = this.getBooksRead();
    if (booksRead > 0) {
      highlights.push({
        label: `Leitura concluída: ${booksRead} livro${booksRead > 1 ? 's' : ''}`,
        done: true,
      });
    }

    const nextMission = this.getNextMission();
    if (nextMission) {
      highlights.push({
        label: `Missão em andamento: ${nextMission.title}`,
        done: false,
      });
    }

    const unlocked = this.gamification?.achievements.filter((achievement) => achievement.unlocked).length ?? 0;
    if (unlocked > 0) {
      const latestUnlocked = this.gamification?.achievements.find((achievement) => achievement.unlocked)?.title ?? 'Explorador';
      highlights.push({
        label: `Conquista desbloqueada: ${latestUnlocked}`,
        done: true,
      });
    }

    if (highlights.length < 3) {
      highlights.push({
        label: nextMission
          ? `Próxima missão: ${nextMission.title} (${nextMission.progress}/${nextMission.target})`
          : 'Todas as missões disponíveis foram concluídas.',
        done: false,
      });
    }

    return highlights.slice(0, 4);
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'agora';
    }
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  markNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.loadNotifications();
        this.changeDetector.markForCheck();
      },
      error: () => undefined,
    });
  }

  toggleEditProfile(): void {
    if (!this.profile) {
      return;
    }

    this.isEditingProfile = !this.isEditingProfile;
    if (this.isEditingProfile) {
      this.editForm = {
        apelido: this.profile.apelido ?? '',
        biografia: this.profile.biografia ?? '',
        fotoUrl: this.profile.fotoUrl ?? '',
        genero: this.profile.genero ?? '',
        generoLiterarioFavorito: this.profile.generoLiterarioFavorito ?? '',
      };
    }
  }

  saveProfile(): void {
    if (!this.profile) {
      return;
    }

    this.authService.updateProfile(this.editForm).subscribe({
      next: (updatedProfile) => {
        this.profile = updatedProfile;
        this.isEditingProfile = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.isEditingProfile = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }

  private loadNotifications(): void {
    this.notificationService.list().subscribe({
      next: (items) => {
        this.notifications = items;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.notifications = [];
        this.changeDetector.markForCheck();
      },
    });
  }

  private connectRealtimeNotifications(): void {
    if (!this.profile?.id) {
      return;
    }

    this.notificationService.connect(this.profile.id, (notification) => {
      this.notifications = [notification, ...this.notifications.filter((item) => item.id !== notification.id)];
      this.changeDetector.markForCheck();
    });
  }

  loadGamification(): void {
    if (this.gamificationLoading) {
      return;
    }
    this.gamificationLoading = true;
    this.gamificationError = '';
    this.gamificationService.getDashboard().subscribe({
      next: (dashboard) => {
        this.gamification = dashboard;
        this.gamificationLoading = false;
        if (this.profile && this.profile.pontosTotais == null) {
          this.profile.pontosTotais = dashboard.totalPoints;
        }
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.gamificationLoading = false;
        this.gamificationError = 'Não foi possível carregar seus dados de progresso.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
