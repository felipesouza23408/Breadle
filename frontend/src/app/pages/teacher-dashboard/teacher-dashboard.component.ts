import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { EducationService, TeacherDashboard } from '../../services/education.service';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="teacher-page">
      <header class="topbar">
        <div>
          <span class="brand">Breadle</span>
          <h1>Ambiente do professor</h1>
        </div>
        <div class="header-actions">
          <span class="user-pill" *ngIf="profile">{{ profile.nome }}</span>
          <a routerLink="/dashboard" class="secondary-link">Voltar ao dashboard</a>
        </div>
      </header>

      <section class="panel dashboard-error" *ngIf="dashboardError" role="alert">
        <div>
          <p>{{ dashboardError }}</p>
          <small *ngIf="dashboard">Os últimos dados carregados continuam visíveis.</small>
        </div>
        <button type="button" class="primary-button" (click)="loadDashboard()" [disabled]="dashboardLoading">
          {{ dashboardLoading ? 'Atualizando...' : 'Tentar novamente' }}
        </button>
      </section>
      <section class="panel loading-state" *ngIf="dashboardLoading && !dashboard" role="status">
        Carregando os dados da turma...
      </section>

      <section class="stats" *ngIf="dashboard">
        <article class="stat-card highlight">
          <span>Total de alunos</span>
          <strong>{{ dashboard.totalAlunos }}</strong>
          <small>{{ dashboard.alunosAtivos }} ativos</small>
        </article>
        <article class="stat-card">
          <span>Livros concluídos</span>
          <strong>{{ dashboard.livrosConcluidos }}</strong>
          <small>na turma</small>
        </article>
        <article class="stat-card">
          <span>Média de pontos</span>
          <strong>{{ dashboard.mediaPontos }}</strong>
          <small>por aluno</small>
        </article>
      </section>

      <section class="grid" *ngIf="dashboard">
        <article class="panel">
          <h2>Top alunos</h2>
          <ol class="student-list" *ngIf="dashboard?.topAlunos?.length; else emptyState">
            <li *ngFor="let student of dashboard.topAlunos; let index = index">
              <span class="position">#{{ index + 1 }}</span>
              <div>
                <strong>{{ student.nome }}</strong>
                <small>{{ student.email }}</small>
              </div>
              <div class="score">
                <strong>{{ student.pontosTotais }}</strong>
                <small>{{ student.livrosConcluidos }} livros</small>
              </div>
            </li>
          </ol>
          <ng-template #emptyState>
            <p class="empty-state">Ainda não há alunos com progresso registado.</p>
          </ng-template>
        </article>

        <article class="panel">
          <h2>Ações rápidas</h2>
          <ul class="actions">
            <li>✓ Planejar próxima leitura</li>
            <li>✓ Revisar alunos com baixa taxa de leitura</li>
            <li>✓ Emitir relatório de progresso</li>
            <li>✓ Preparar missão em grupo</li>
          </ul>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .teacher-page {
        min-height: 100vh;
        padding: 2rem;
        background: radial-gradient(circle at top left, rgba(214,169,74,0.16), transparent 20%),
                    linear-gradient(180deg, #f7f1e9 0%, #eef3f8 100%);
        color: #172033;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .brand {
        display: inline-block;
        background: rgba(214,169,74,0.12);
        color: #2b3b58;
        border-radius: 999px;
        border: 1px solid rgba(214,169,74,0.22);
        padding: 0.45rem 0.75rem;
        font-weight: 800;
      }
      h1 { margin: 0.75rem 0 0; color: #1d2b42; }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .user-pill {
        background: rgba(83, 116, 77, 0.1);
        color: #355b49;
        padding: 0.5rem 0.8rem;
        border-radius: 999px;
        font-weight: 700;
      }
      .secondary-link {
        color: #1c2a3f;
        text-decoration: none;
        font-weight: 700;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .stat-card,
      .panel {
        background: rgba(255,255,255,0.92);
        border: 1px solid rgba(23,32,51,0.05);
        border-radius: 1.1rem;
        box-shadow: 0 12px 30px rgba(23,32,51,0.05);
        padding: 1.25rem;
      }
      .stat-card.highlight {
        background: linear-gradient(135deg, #1d2b42, #314d73 55%, #d6a94a 100%);
        color: white;
      }
      .stat-card span,
      .stat-card small { display: block; opacity: 0.8; }
      .stat-card strong { display: block; font-size: 2rem; margin: 0.4rem 0; }
      .grid {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 1rem;
      }
      .student-list, .actions {
        list-style: none;
        margin: 1rem 0 0;
        padding: 0;
        display: grid;
        gap: 0.9rem;
      }
      .student-list li {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.8rem;
        background: #f7f9fc;
        border-radius: 0.8rem;
        padding: 0.8rem 0.9rem;
      }
      .position {
        width: 2rem;
        height: 2rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: rgba(214,169,74,0.14);
        color: #2b3b58;
        font-weight: 800;
      }
      .score {
        text-align: right;
      }
      .score strong,
      .student-list strong {
        display: block;
      }
      .student-list small,
      .score small,
      .actions li {
        color: #4d677d;
      }
      .actions li {
        padding: 0.65rem 0;
        border-bottom: 1px solid #edf2f7;
      }
      .empty-state {
        margin-top: 1rem;
        color: #4d677d;
      }
      @media (max-width: 800px) {
        .stats, .grid { grid-template-columns: 1fr; }
        .topbar { align-items: flex-start; flex-direction: column; }
      }
    `,
  ],
})
export class TeacherDashboardComponent implements OnInit {
  profile: UserProfile | null = null;
  dashboard: TeacherDashboard | null = null;
  dashboardLoading = false;
  dashboardError = '';

  constructor(
    private authService: AuthService,
    private educationService: EducationService,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.authService.me().subscribe({
      next: (profile) => {
        this.profile = profile;
        if (profile.tipo !== 'PROFESSOR' && profile.tipo !== 'ADMINISTRADOR') {
          this.router.navigateByUrl('/dashboard');
          return;
        }
        this.loadDashboard();
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.router.navigateByUrl('/dashboard');
        this.changeDetector.markForCheck();
      },
    });
  }

  loadDashboard(): void {
    if (this.dashboardLoading) {
      return;
    }
    this.dashboardLoading = true;
    this.dashboardError = '';
    this.educationService.getTeacherDashboard().subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.dashboardLoading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.dashboardLoading = false;
        this.dashboardError = 'Não foi possível carregar os dados atuais da turma.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
