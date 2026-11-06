import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { GamificationService, MissionProgress } from '../../services/gamification.service';
import { Subject, interval, takeUntil, timeout } from 'rxjs';

@Component({
  selector: 'app-missions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="missions-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">Progresso</span>
          <h1>Missões</h1>
          <p class="page-description">Suas metas avançam conforme o sistema registra suas leituras e atividades.</p>
        </div>
        <button type="button" class="refresh-button" (click)="loadMissions()" [disabled]="refreshing">
          {{ refreshing ? 'Atualizando...' : 'Atualizar' }}
        </button>
      </header>

      <p class="sync-status" *ngIf="lastUpdated && !errorMessage" aria-live="polite">
        Atualizadas {{ lastUpdated | date:'shortTime' }} · sincronização automática
      </p>

      <section class="error-state panel" *ngIf="errorMessage" role="alert">
        <div>
          <p>{{ errorMessage }}</p>
          <p class="stale-note" *ngIf="missions.length">Os dados exibidos podem estar desatualizados.</p>
        </div>
        <button type="button" class="refresh-button" (click)="loadMissions()" [disabled]="refreshing">Tentar novamente</button>
      </section>

      <section class="summary-grid" *ngIf="!loading && missions.length">
        <article class="summary-card">
          <span>Concluídas</span>
          <strong>{{ completedCount }}</strong>
          <small>conclusões reconhecidas pelo sistema</small>
        </article>
        <article class="summary-card alt">
          <span>Em andamento</span>
          <strong>{{ activeCount }}</strong>
          <small>próximas metas</small>
        </article>
      </section>

      <section class="panel controls-panel" *ngIf="!loading && missions.length">
        <div class="filters">
          <button type="button" class="filter-button" [class.active]="selectedFilter === 'all'" (click)="setFilter('all')">Todas</button>
          <button type="button" class="filter-button" [class.active]="selectedFilter === 'active'" (click)="setFilter('active')">Ativas</button>
          <button type="button" class="filter-button" [class.active]="selectedFilter === 'done'" (click)="setFilter('done')">Concluídas</button>
        </div>
      </section>

      <section class="loading-state panel" *ngIf="loading" role="status">
        Carregando suas missões...
      </section>

      <section class="panel" *ngIf="!loading && missions.length">
        <div class="mission-list">
          <article class="mission-card" *ngFor="let mission of visibleMissions" [class.done]="mission.completed">
            <div class="mission-header">
              <div>
                <span class="status" [class.done]="mission.completed">{{ mission.completed ? 'Concluída' : 'Em andamento' }}</span>
                <h2>{{ mission.title }}</h2>
              </div>
              <strong>{{ mission.completed ? 'Meta atingida' : getProgressLabel(mission) }}</strong>
            </div>
            <p>{{ mission.description }}</p>
            <div class="bar" role="progressbar" [attr.aria-label]="'Progresso da missão ' + mission.title" [attr.aria-valuenow]="missionPercentage(mission)" aria-valuemin="0" aria-valuemax="100">
              <span [style.width.%]="missionPercentage(mission)"></span>
            </div>
            <div class="meta-row">
              <small>{{ mission.progress | number }} / {{ mission.target | number }} {{ missionUnit(mission.title) }}</small>
              <small>{{ missionPercentage(mission) }}%</small>
            </div>
          </article>
        </div>
      </section>

      <section class="empty-state panel" *ngIf="!loading && !errorMessage && !missions.length">
        <h2>Nenhuma missão disponível</h2>
        <p>Novas missões aparecerão aqui quando forem publicadas.</p>
      </section>

      <p class="system-note" *ngIf="!loading && missions.length">O progresso é calculado automaticamente. Tocar em uma missão não altera sua conclusão.</p>
    </main>
  `,

})
export class MissionsComponent implements OnInit, OnDestroy {
  private readonly refreshIntervalMs = 30000;
  private readonly destroyed$ = new Subject<void>();
  missions: MissionProgress[] = [];
  completedCount = 0;
  activeCount = 0;
  selectedFilter: 'all' | 'active' | 'done' = 'all';
  loading = true;
  refreshing = false;
  errorMessage = '';
  lastUpdated: Date | null = null;

  constructor(private gamificationService: GamificationService, private changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadMissions();
    interval(this.refreshIntervalMs).pipe(takeUntil(this.destroyed$)).subscribe(() => {
      if (document.visibilityState === 'visible') {
        this.loadMissions();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.loadMissions();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.loadMissions();
    }
  }

  loadMissions(): void {
    if (this.refreshing) {
      return;
    }
    this.refreshing = true;
    this.errorMessage = '';
    this.gamificationService.getDashboard().pipe(timeout(10000), takeUntil(this.destroyed$)).subscribe({
      next: (dashboard) => {
        this.missions = dashboard.missions ?? [];
        this.syncSummary();
        this.lastUpdated = new Date();
        this.loading = false;
        this.refreshing = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Não foi possível atualizar suas missões. Verifique sua conexão e tente novamente.';
        this.loading = false;
        this.refreshing = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  get visibleMissions(): MissionProgress[] {
    if (this.selectedFilter === 'active') {
      return this.missions.filter((mission) => !mission.completed);
    }
    if (this.selectedFilter === 'done') {
      return this.missions.filter((mission) => mission.completed);
    }
    return this.missions;
  }

  setFilter(filter: 'all' | 'active' | 'done'): void {
    this.selectedFilter = filter;
  }

  missionPercentage(mission: MissionProgress): number {
    if (mission.target <= 0) { return 0; }
    return Math.min(100, Math.max(0, Math.round((mission.progress / mission.target) * 100)));
  }

  getProgressLabel(mission: MissionProgress): string {
    return mission.completed ? 'Concluída' : `${this.missionPercentage(mission)}%`;
  }

  missionUnit(title: string): string {
    if (title.toLocaleLowerCase('pt-BR').includes('página')) {
      return 'páginas';
    }
    if (title.toLocaleLowerCase('pt-BR').includes('ponto') || title === 'Acumulador') {
      return 'pontos';
    }
    if (title.toLocaleLowerCase('pt-BR').includes('sequência')) {
      return 'dias seguidos';
    }
    return 'livros';
  }

  private syncSummary(): void {
    this.completedCount = this.missions.filter((mission) => mission.completed).length;
    this.activeCount = this.missions.filter((mission) => !mission.completed).length;
  }
}
