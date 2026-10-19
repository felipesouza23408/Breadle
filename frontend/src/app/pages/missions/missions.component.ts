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
  styles: [
    `
      :host { display: block; }
      .missions-page {
        min-height: 100vh;
        background: radial-gradient(circle at top left, rgba(214,169,74,0.16), transparent 18%),
                    linear-gradient(180deg, #f5efe7 0%, #eef3f8 100%);
        padding: 2rem;
        color: #172033;
      }
      .page-header { margin-bottom: 1.5rem; }
      .page-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
      .page-description, .sync-status, .system-note { color: #d4d0da; line-height: 1.55; }
      .page-description { margin: 0.5rem 0 0; }
      .sync-status { margin: -0.6rem 0 1rem; font-size: 0.82rem; }
      .system-note { margin: 1rem 0 0; font-size: 0.88rem; }
      .refresh-button {
        border: 1px solid rgba(217,173,57,.28);
        border-radius: 999px;
        padding: .7rem 1rem;
        color: #f1d779;
        background: rgba(217,173,57,.1);
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .refresh-button:disabled { cursor: wait; opacity: .6; }
      .loading-state, .error-state, .empty-state { color: #f3f0f8; }
      .error-state { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
      .error-state p { margin: 0; color: #ffc2bc; }
      .error-state .stale-note { margin-top: .4rem; color: #c5c0cd; }
      .empty-state h2 { margin-top: 0; }
      .empty-state p { margin-bottom: 0; color: #c5c0cd; }
      .eyebrow {
        display: inline-block;
        background: rgba(214,169,74,0.14);
        border: 1px solid rgba(214,169,74,0.25);
        color: #2b3b58;
        border-radius: 999px;
        padding: 0.45rem 0.7rem;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 { margin: 0.7rem 0 0; }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .summary-card {
        background: linear-gradient(135deg, #1d2b42, #314d73);
        border-radius: 1.1rem;
        padding: 1.1rem 1.2rem;
        color: white;
        box-shadow: 0 16px 32px rgba(23,32,51,0.08);
      }
      .summary-card.alt {
        background: linear-gradient(135deg, #5f7f9a, #d6a94a);
      }
      .summary-card span, .summary-card small { display: block; opacity: 0.9; }
      .summary-card strong { display: block; font-size: 2rem; margin: 0.4rem 0; }
      .panel {
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(23,32,51,0.06);
        border-radius: 1.2rem;
        padding: 1.3rem;
        box-shadow: 0 16px 34px rgba(23,32,51,0.06);
      }
      .controls-panel { margin-bottom: 1rem; }
      .filters {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .filter-button {
        border: none;
        border-radius: 999px;
        background: #f1f4f8;
        color: #2b3b58;
        padding: 0.6rem 0.9rem;
        font-weight: 700;
        cursor: pointer;
      }
      .filter-button.active {
        background: linear-gradient(135deg, #d6a94a, #f1d98c);
        color: #1e2b3f;
      }
      .mission-list {
        display: grid;
        gap: 1rem;
      }
      .mission-card {
        background: #f7f9fc;
        border-radius: 1rem;
        border: 1px solid rgba(23,32,51,0.05);
        padding: 1rem 1.1rem;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .mission-card.done {
        border-color: rgba(55,120,90,0.25);
      }
      .mission-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.5rem;
      }
      .status {
        display: inline-block;
        background: rgba(214,169,74,0.14);
        color: #2b3b58;
        border-radius: 999px;
        padding: 0.35rem 0.6rem;
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
      }
      .status.done {
        background: rgba(55,120,90,0.12);
        color: #1f7a5f;
      }
      .mission-header h2 {
        margin: 0.5rem 0 0;
      }
      .mission-card p {
        margin: 0 0 0.8rem;
        color: #314156;
      }
      .bar {
        height: 10px;
        background: #edf0f5;
        border-radius: 999px;
        overflow: hidden;
      }
      .bar span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #d6a94a, #7d9bb2);
        border-radius: inherit;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-top: 0.5rem;
        color: #597089;
      }
      .missions-page .panel {
        color: #f3f0f8;
        background: #151519;
        border: 1px solid rgba(255,255,255,.09);
        box-shadow: 0 16px 34px rgba(0,0,0,.3);
      }
      .missions-page .mission-card { color: #f3f0f8; background: #1c1c22; border-color: rgba(255,255,255,.08); }
      .missions-page .mission-card p { color: #c5c0cd; }
      .missions-page .meta-row { color: #c5c0cd; }
      .missions-page .filter-button { color: #d4d0da; background: #222228; }
      .missions-page .filter-button.active { color: #17130b; background: linear-gradient(135deg, #d9ad39, #f1d779); }
      .missions-page .eyebrow { color: #f1d779; background: rgba(217,173,57,.12); border-color: rgba(217,173,57,.28); }
      .missions-page .summary-card { background: linear-gradient(120deg, #101016, #28231a 65%, #a37b20); }
      .missions-page .summary-card.alt { background: linear-gradient(120deg, #101016, #2028ad); }
      .missions-page .summary-card span, .missions-page .summary-card small { color: #fff; opacity: 1; }
      .missions-page .mission-header h2 { color: #fff; }
      .missions-page .mission-header > strong { color: #ffe18a; }
      .missions-page .status { color: #1b2940; background: #f0d783; }
      .missions-page .status.done { color: #073b29; background: #a9e0bf; }
      .missions-page .mission-card.done { border-color: #4d9b70; }
      .missions-page .bar { background: #36363f; }
      .missions-page .bar span { background: linear-gradient(90deg, #f0cb63, #8de0b0); }
      .missions-page .error-state .refresh-button { color: #fff2c6; }
      @media (max-width: 760px) {
        .page-header, .error-state { align-items: flex-start; flex-direction: column; }
        .summary-grid {
          grid-template-columns: 1fr;
        }
        .mission-header {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
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
