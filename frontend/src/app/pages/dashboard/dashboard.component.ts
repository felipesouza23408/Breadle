import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { GamificationDashboard, GamificationService } from '../../services/gamification.service';
import { NotificationService, UserNotification } from '../../services/notification.service';
import { EducationService } from '../../services/education.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="dashboard">
      <header class="topbar">
        <div>
          <span class="brand">SEU ESPAÇO DE LEITURA</span>
          <h1>Olá, {{ profile?.nome || 'leitor' }}</h1>
          <p class="dashboard-welcome">Acompanhe seu ritmo e escolha o próximo passo da sua jornada.</p>
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
          <strong>{{ getTotalPoints() ?? 'Indisponível' }}</strong>
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
        <a routerLink="/library" class="action-button secondary">Minha biblioteca</a>
        <a *ngIf="isTeacher" routerLink="/teacher" class="action-button secondary">Gerenciar turma</a>
      </section>

      <section class="panel" *ngIf="profile?.tipo === 'LEITOR'">
        <h2>Entrar em uma turma</h2>
        <p>Digite o código de convite compartilhado pelo professor.</p>
        <form (ngSubmit)="joinTeacherClass()">
          <label for="class-invitation-code">Código de convite</label>
          <input id="class-invitation-code" name="invitationCode" [(ngModel)]="invitationCode"
                 maxlength="64" required autocomplete="off">
          <button type="submit" class="action-button" [disabled]="joiningClass || !invitationCode.trim()">
            {{ joiningClass ? 'Entrando...' : 'Entrar na turma' }}
          </button>
        </form>
        <p *ngIf="classJoinMessage" role="status">{{ classJoinMessage }}</p>
        <p *ngIf="classJoinError" role="alert">{{ classJoinError }}</p>
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

})
export class DashboardComponent implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  gamification: GamificationDashboard | null = null;
  gamificationError = '';
  gamificationLoading = false;
  notifications: UserNotification[] = [];
  isEditingProfile = false;
  editForm: Partial<UserProfile> = {};
  invitationCode = '';
  joiningClass = false;
  classJoinMessage = '';
  classJoinError = '';

  constructor(
    private authService: AuthService,
    private gamificationService: GamificationService,
    private notificationService: NotificationService,
    private educationService: EducationService,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
  ) {}

  get isTeacher(): boolean {
    return this.profile?.tipo === 'PROFESSOR';
  }

  joinTeacherClass(): void {
    const code = this.invitationCode.trim();
    if (!code || this.joiningClass) {
      return;
    }
    this.joiningClass = true;
    this.classJoinMessage = '';
    this.classJoinError = '';
    this.educationService.joinTeacherClass(code).subscribe({
      next: (response) => {
        this.joiningClass = false;
        this.invitationCode = '';
        this.classJoinMessage = `Você entrou na turma ${response.className}.`;
        this.changeDetector.markForCheck();
      },
      error: (error) => {
        this.joiningClass = false;
        this.classJoinError = error?.status === 409
          ? 'Você já faz parte desta turma.'
          : 'Código inválido ou não foi possível entrar na turma.';
        this.changeDetector.markForCheck();
      },
    });
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

  getTotalPoints(): number | null {
    return this.gamification?.totalPoints ?? this.profile?.pontosTotais ?? null;
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
