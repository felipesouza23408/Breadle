import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { GamificationService, RankingEntry } from '../../services/gamification.service';

@Component({
  selector: 'app-rankings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="rankings-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">Competição</span>
          <h1>Ranking</h1>
          <p class="page-description">Classificação geral por pontos registrados na sua conta.</p>
        </div>
      </header>

      <section class="error-state panel" *ngIf="errorMessage" role="alert">
        <p>{{ errorMessage }}</p>
        <button type="button" class="filter-button active" (click)="loadRanking()" [disabled]="loading">Tentar novamente</button>
      </section>

      <section class="loading-state panel" *ngIf="loading" role="status">Carregando o ranking...</section>

      <section class="top-summary" *ngIf="!loading && !errorMessage">
        <article class="summary-card">
          <span>Seu lugar</span>
          <strong>{{ userPosition === null ? '—' : '#' + userPosition }}</strong>
          <small>{{ userPosition === null ? 'Fora das 10 primeiras posições' : 'Na classificação geral' }}</small>
        </article>
        <article class="summary-card alt">
          <span>Pontos</span>
          <strong>{{ totalPoints }}</strong>
          <small>Pontos acumulados na conta</small>
        </article>
      </section>

      <section class="panel insight-panel" *ngIf="!loading && !errorMessage && selectedEntry">
        <div class="insight-copy">
          <span class="mini-label">Leitor selecionado</span>
          <h2>{{ selectedEntry.nome }}</h2>
          <p>{{ selectedEntry.tipo }} · posição #{{ selectedEntry.position }} no ranking geral.</p>
        </div>
        <span class="score-badge">{{ selectedEntry.points }} pts</span>
      </section>

      <section class="panel ranking-panel" *ngIf="!loading && !errorMessage && ranking.length">
        <div class="panel-header">
          <h2>Classificação geral</h2>
          <span class="tag">Top {{ ranking.length }}</span>
        </div>

        <ol class="ranking-list">
          <li *ngFor="let entry of ranking">
            <button type="button" class="rank-item" [class.current]="entry.userId === currentUserId" (click)="selectEntry(entry)">
              <span class="position">#{{ entry.position }}</span>
              <span class="user-meta">
                <strong>{{ entry.nome }}</strong>
                <small>{{ entry.tipo }}</small>
              </span>
              <span class="points">{{ entry.points }} pts</span>
            </button>
          </li>
        </ol>
      </section>

      <section class="empty-state panel" *ngIf="!loading && !errorMessage && !ranking.length">
        <h2>Ranking indisponível</h2>
        <p>O servidor ainda não retornou posições para exibir.</p>
      </section>

      <aside class="panel detail-panel" *ngIf="!loading && !errorMessage && selectedEntry">
        <div class="detail-header">
          <div>
            <span class="detail-tag">Dados do ranking</span>
            <h3>{{ selectedEntry.nome }}</h3>
          </div>
          <span class="position-badge">#{{ selectedEntry.position }}</span>
        </div>
        <ul class="detail-list">
          <li><span>Tipo</span><strong>{{ selectedEntry.tipo }}</strong></li>
          <li><span>Pontos</span><strong>{{ selectedEntry.points }} pts</strong></li>
        </ul>
      </aside>
    </main>
  `,

})
export class RankingsComponent implements OnInit {
  ranking: RankingEntry[] = [];
  userPosition: number | null = null;
  currentUserId: number | null = null;
  totalPoints = 0;
  selectedEntry: RankingEntry | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private gamificationService: GamificationService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadRanking();
  }

  loadRanking(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.me().subscribe({
      next: (profile) => {
        this.currentUserId = profile.id;
        this.gamificationService.getDashboard().subscribe({
          next: (dashboard) => {
            this.totalPoints = dashboard.totalPoints;
            this.ranking = dashboard.ranking ?? [];
            const current = this.ranking.find((entry) => entry.userId === this.currentUserId);
            this.userPosition = current?.position ?? null;
            this.selectedEntry = current ?? this.ranking[0] ?? null;
            this.loading = false;
            this.changeDetector.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.errorMessage = 'Não foi possível carregar o ranking do servidor.';
            this.changeDetector.markForCheck();
          },
        });
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Não foi possível identificar sua conta para carregar o ranking.';
        this.changeDetector.markForCheck();
      },
    });
  }

  selectEntry(entry: RankingEntry): void {
    this.selectedEntry = entry;
  }
}
