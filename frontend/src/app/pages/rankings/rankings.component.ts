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
  styles: [
    `
      :host { display: block; }
      .rankings-page {
        min-height: 100vh;
        background: radial-gradient(ellipse at 95% 0%, rgba(37,46,224,.2), transparent 28rem), #08080b;
        padding: 2rem;
        color: #f3f0f8;
      }
      .page-header { margin-bottom: 1.5rem; }
      .page-description { color: #c5c0cd; }
      .rankings-page h1, .rankings-page h2, .rankings-page h3 { color: #fff; }
      .eyebrow {
        display: inline-block;
        background: rgba(217,173,57,.12);
        border: 1px solid rgba(217,173,57,.28);
        color: #f1d779;
        border-radius: 999px;
        padding: 0.45rem 0.7rem;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 { margin: 0.7rem 0 0; }
      .top-summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .summary-card {
        background: linear-gradient(135deg, #1d2b42, #2d486d);
        border-radius: 1.1rem;
        padding: 1.1rem 1.2rem;
        color: white;
        box-shadow: 0 16px 32px rgba(23,32,51,0.08);
      }
      .summary-card.alt {
        background: linear-gradient(135deg, #4b6e8d, #d6a94a);
      }
      .summary-card span, .summary-card small { display: block; opacity: 0.9; }
      .summary-card strong { display: block; font-size: 2rem; margin: 0.4rem 0; }
      .panel {
        background: #151519;
        color: #f3f0f8;
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 1.2rem;
        padding: 1.3rem;
        box-shadow: 0 16px 34px rgba(0,0,0,.3);
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
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .tag {
        background: rgba(214,169,74,0.12);
        color: #2b3b58;
        border-radius: 999px;
        padding: 0.45rem 0.7rem;
        font-weight: 700;
      }
      .ranking-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.8rem;
      }
      .rank-item {
        width: 100%;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.85rem;
        color: #f3f0f8;
        text-align: left;
        font: inherit;
        background: #1c1c22;
        border-radius: 0.9rem;
        padding: 0.9rem 1rem;
        border: 1px solid rgba(255,255,255,.08);
        cursor: pointer;
      }
      .rank-item.current {
        border-color: rgba(214,169,74,0.28);
      }
      .position {
        display: inline-grid;
        place-items: center;
        width: 2.6rem;
        height: 2.6rem;
        border-radius: 50%;
        background: rgba(214,169,74,0.14);
        color: #f1d779;
        font-weight: 800;
      }
      .user-meta {
        display: grid;
        gap: 0.2rem;
      }
      .user-meta small { color: #c5c0cd; }
      .points {
        font-weight: 800;
        color: #f1d779;
      }
      .detail-panel {
        margin-top: 1rem;
      }
      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      .detail-tag {
        display: inline-block;
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #597089;
      }
      .detail-header h3 { margin: 0.35rem 0 0; }
      .position-badge {
        display: inline-grid;
        place-items: center;
        width: 2.4rem;
        height: 2.4rem;
        border-radius: 50%;
        background: #1d2b42;
        color: white;
        font-weight: 800;
      }
      .detail-list {
        list-style: none;
        padding: 0;
        margin: 1rem 0 0;
        display: grid;
        gap: 0.75rem;
      }
      .detail-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        background: #222228;
        border-radius: 0.8rem;
        padding: 0.7rem 0.8rem;
      }
      .detail-list span { color: #aaa8b3; }
      .mini-label {
        display: inline-block;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.7rem;
        font-weight: 800;
        color: #c3b477;
      }
      .loading-state, .error-state p, .empty-state p { color: #c5c0cd; }
      .empty-state h2 { margin-top: 0; color: #fff; }
      .tag { color: #f1d779; background: rgba(217,173,57,.12); }
      .position-badge { background: #151bd1; }
      .detail-tag { color: #c3b477; }
      .insight-copy p { color: #c5c0cd; }
      .error-state { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      .error-state p { margin: 0; }
      .loading-state { text-align: center; }
      @media (max-width: 520px) {
        .rankings-page { padding: 1rem; }
        .rank-item { grid-template-columns: auto minmax(0, 1fr); }
        .rank-item .points { grid-column: 2; }
      }
      .insight-panel {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .insight-copy h2 {
        margin: 0.4rem 0 0.3rem;
      }
      .insight-copy p {
        margin: 0;
        color: #314156;
      }
      .score-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 96px;
        padding: 0.7rem 0.9rem;
        border-radius: 999px;
        background: linear-gradient(135deg, #1d2b42, #4b6e8d);
        color: white;
        font-weight: 800;
      }
      @media (max-width: 760px) {
        .top-summary {
          grid-template-columns: 1fr;
        }
        .insight-panel {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
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
