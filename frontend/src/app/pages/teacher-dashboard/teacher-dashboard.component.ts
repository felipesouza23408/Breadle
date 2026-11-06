import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { CreatedTeacherClass, EducationService, TeacherClass, TeacherDashboard } from '../../services/education.service';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="teacher-page">
      <header class="topbar">
        <div>
          <span class="brand">AMBIENTE EDUCACIONAL</span>
          <h1>Visão geral da turma</h1>
        </div>
        <div class="header-actions">
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

      <section class="panel" *ngIf="profile?.tipo === 'PROFESSOR'">
        <h2>Minhas turmas</h2>
        <form (ngSubmit)="createClass()" class="class-create-form">
          <label for="teacher-class-name">Criar turma</label>
          <div>
            <input id="teacher-class-name" name="className" [(ngModel)]="newClassName"
                   maxlength="80" required placeholder="Nome da turma">
            <button type="submit" class="primary-button" [disabled]="classSaving || !newClassName.trim()">
              {{ classSaving ? 'Criando...' : 'Criar turma' }}
            </button>
          </div>
        </form>
        <p *ngIf="classError" role="alert">{{ classError }}</p>
        <p *ngIf="createdClass" role="status">
          Código de convite de <strong>{{ createdClass.name }}</strong>:
          <code>{{ createdClass.invitationCode }}</code>
          <small>Copie e compartilhe este código com seus alunos.</small>
        </p>
        <ul class="class-list" *ngIf="classes.length; else noClasses">
          <li *ngFor="let teacherClass of classes">
            <strong>{{ teacherClass.name }}</strong>
            <span>{{ teacherClass.totalAlunos }} alunos</span>
          </li>
        </ul>
        <ng-template #noClasses><p class="empty-state">Você ainda não criou uma turma.</p></ng-template>
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
          <span>Média de pontos educacionais</span>
          <strong>{{ dashboard.mediaPontosEducacionais }}</strong>
          <small>por aluno</small>
        </article>
      </section>

      <section class="grid" *ngIf="dashboard">
        <article class="panel">
          <h2>Alunos por pontos educacionais</h2>
          <ol class="student-list" *ngIf="dashboard?.topAlunos?.length; else emptyState">
            <li *ngFor="let student of dashboard.topAlunos; let index = index">
              <span class="position">#{{ dashboard.page * dashboard.size + index + 1 }}</span>
              <div>
                <strong>{{ student.nome }}</strong>
                <small>{{ student.email }}</small>
              </div>
              <div class="score">
                <strong>{{ student.pontosEducacionais }}</strong>
                <small>{{ student.livrosConcluidos }} livros</small>
              </div>
            </li>
          </ol>
          <ng-template #emptyState>
            <p class="empty-state" *ngIf="dashboard.totalAlunos === 0">
              Ainda não há alunos nas suas turmas.
            </p>
            <p class="empty-state" *ngIf="dashboard.totalAlunos > 0">
              Não há alunos nesta página. Volte à página anterior para continuar.
            </p>
          </ng-template>
          <nav class="student-pagination" aria-label="Paginação de alunos">
            <button type="button" class="primary-button"
                    (click)="loadDashboard(dashboard.page - 1)"
                    [disabled]="dashboardLoading || dashboard.page === 0">
              Página anterior
            </button>
            <span>Página {{ dashboard.page + 1 }}</span>
            <button type="button" class="primary-button"
                    (click)="loadDashboard(dashboard.page + 1)"
                    [disabled]="dashboardLoading || !dashboard.hasNext">
              Próxima página
            </button>
          </nav>
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

})
export class TeacherDashboardComponent implements OnInit {
  profile: UserProfile | null = null;
  dashboard: TeacherDashboard | null = null;
  dashboardLoading = false;
  dashboardError = '';
  classes: TeacherClass[] = [];
  newClassName = '';
  createdClass: CreatedTeacherClass | null = null;
  classSaving = false;
  classError = '';

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
        if (profile.tipo === 'PROFESSOR') {
          this.loadClasses();
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

  loadClasses(): void {
    this.educationService.getTeacherClasses().subscribe({
      next: (classes) => {
        this.classes = classes;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.classError = 'Não foi possível carregar suas turmas.';
        this.changeDetector.markForCheck();
      },
    });
  }

  createClass(): void {
    const name = this.newClassName.trim();
    if (!name || this.classSaving) {
      return;
    }
    this.classSaving = true;
    this.classError = '';
    this.createdClass = null;
    this.educationService.createTeacherClass(name).subscribe({
      next: (createdClass) => {
        this.createdClass = createdClass;
        this.newClassName = '';
        this.classSaving = false;
        this.loadClasses();
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.classSaving = false;
        this.classError = 'Não foi possível criar a turma.';
        this.changeDetector.markForCheck();
      },
    });
  }

  loadDashboard(page = this.dashboard?.page ?? 0): void {
    if (this.dashboardLoading) {
      return;
    }
    this.dashboardLoading = true;
    this.dashboardError = '';
    this.educationService.getTeacherDashboard(page, 20).subscribe({
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
