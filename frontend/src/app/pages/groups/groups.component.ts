import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  CreateGroupPayload,
  GroupActivity,
  GroupChallenge,
  GroupChatMessage,
  GroupLeaderboardEntry,
  GroupService,
  ReadingGroup,
} from '../../services/group.service';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="groups-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">Comunidade</span>
          <h1>Grupos de leitura</h1>
        </div>
        <button type="button" class="primary-button" (click)="goToDashboard()">Voltar ao dashboard</button>
      </header>

      <section class="panel create-panel">
        <h2>Criar grupo</h2>
        <form class="group-form" (ngSubmit)="submitGroup()">
          <label>
            Nome do grupo
            <input [(ngModel)]="form.name" name="name" placeholder="Leitores de Machado" required />
          </label>
          <label>
            Descrição
            <textarea [(ngModel)]="form.description" name="description" rows="3" placeholder="Compromisso de leitura e discussão semanal..."></textarea>
          </label>
          <button type="submit" class="primary-button">Criar grupo</button>
        </form>
      </section>

      <section class="panel">
        <h2>Meus grupos</h2>
        <div class="data-error" *ngIf="myGroupsError" role="alert">
          <p>{{ myGroupsError }}</p>
          <button type="button" class="ghost-button" (click)="loadMyGroups()">Tentar novamente</button>
        </div>
        <div class="group-list" *ngIf="!myGroupsError && myGroups.length; else emptyMyGroups">
          <article class="group-card" *ngFor="let group of myGroups">
            <div class="card-top">
              <div>
                <h3>{{ group.name }}</h3>
                <span>{{ group.memberCount }} membros</span>
              </div>
              <span class="tag">Participando</span>
            </div>
            <p>{{ group.description }}</p>
            <div class="meta-row">
              <strong>{{ group.challengeName }}</strong>
              <span>{{ group.challengeTargetPages }} páginas</span>
            </div>
            <button type="button" class="ghost-button" (click)="openGroup(group.id)">Abrir grupo</button>
          </article>
        </div>
        <ng-template #emptyMyGroups>
          <p class="empty-state" *ngIf="!myGroupsError">Você ainda não entrou em nenhum grupo.</p>
        </ng-template>
      </section>

      <section class="panel">
        <h2>Explorar grupos</h2>
        <div class="data-error" *ngIf="groupsError" role="alert">
          <p>{{ groupsError }}</p>
          <button type="button" class="ghost-button" (click)="loadGroups()">Tentar novamente</button>
        </div>
        <div class="group-list" *ngIf="!groupsError && groups.length; else emptyGroups">
          <article class="group-card" *ngFor="let group of groups">
            <div class="card-top">
              <div>
                <h3>{{ group.name }}</h3>
                <span>{{ group.memberCount }} membros</span>
              </div>
              <span class="tag" *ngIf="group.joined">Participando</span>
            </div>
            <p>{{ group.description }}</p>
            <div class="meta-row">
              <strong>{{ group.challengeName }}</strong>
              <span>{{ group.challengeTargetPages }} páginas</span>
            </div>
            <div class="group-actions">
              <button
                type="button"
                class="join-button"
                [disabled]="group.joined"
                (click)="joinGroup(group.id)">
                {{ group.joined ? 'Já participando' : 'Participar' }}
              </button>
              <button type="button" class="ghost-button" (click)="viewGroup(group.id)">Ver grupo</button>
            </div>
          </article>
        </div>
        <ng-template #emptyGroups>
          <p class="empty-state" *ngIf="!groupsError">Ainda não há grupos ativos.</p>
        </ng-template>
      </section>

      <section class="panel detail-panel" *ngIf="selectedGroupId !== null">
        <div class="detail-header">
          <h2>Detalhes do grupo</h2>
          <button type="button" class="ghost-button" (click)="closeGroup()">Fechar</button>
        </div>

        <div class="detail-grid">
          <div class="detail-column">
            <h3>Desafios do sistema</h3>

            <div class="mini-list" *ngIf="getChallenges(selectedGroupId)?.length; else emptyChallenges">
              <div class="mini-item" *ngFor="let challenge of getChallenges(selectedGroupId)">
                <strong>{{ challenge.title }}</strong>
                <span>{{ challenge.description }}</span>
                <small>{{ challenge.targetPages }} páginas · {{ formatChallengeStatus(challenge.status) }} · {{ challenge.progress ?? 0 }}% concluído</small>
              </div>
            </div>
            <ng-template #emptyChallenges>
              <p class="empty-state">Ainda não há desafios ativos.</p>
            </ng-template>
          </div>

          <div class="detail-column">
            <h3>Ranking</h3>
            <div class="leaderboard-list" *ngIf="getLeaderboard(selectedGroupId)?.length; else noLeaderboard">
              <div class="leaderboard-item" *ngFor="let entry of getLeaderboard(selectedGroupId)">
                <span class="rank-badge">#{{ entry.position }}</span>
                <div>
                  <strong>{{ entry.userName }}</strong>
                  <small>{{ entry.userType }}</small>
                </div>
                <span class="pages-read">{{ entry.pagesRead }} páginas</span>
              </div>
            </div>
            <ng-template #noLeaderboard>
              <p class="empty-state">Ainda não há progresso registrado neste grupo.</p>
            </ng-template>
          </div>
        </div>

        <div class="detail-grid bottom-grid">
          <div class="detail-column">
            <h3>Feed de incentivo</h3>
            <div class="mini-list" *ngIf="getActivities(selectedGroupId)?.length; else emptyActivities">
              <div class="mini-item activity-item" *ngFor="let activity of getActivities(selectedGroupId)">
                <strong>{{ activity.userName }}</strong>
                <span>{{ activity.message }}</span>
                <small>{{ activity.type }}</small>
              </div>
            </div>
            <ng-template #emptyActivities>
              <p class="empty-state">O grupo ainda não tem atividades registradas.</p>
            </ng-template>
          </div>

          <div class="detail-column">
            <h3>Chat do grupo</h3>
            <div class="chat-box" *ngIf="getMessages(selectedGroupId)?.length; else emptyChat">
              <div class="chat-message" *ngFor="let message of getMessages(selectedGroupId)">
                <strong>{{ message.userName }}</strong>
                <span>{{ message.content }}</span>
              </div>
            </div>
            <ng-template #emptyChat>
              <p class="empty-state">Ainda não há mensagens.</p>
            </ng-template>
            <div class="chat-form">
              <input [(ngModel)]="chatDraftByGroup[selectedGroupId]" name="chatDraft" placeholder="Envie uma mensagem de incentivo..." />
              <button type="button" class="primary-button" (click)="sendChat(selectedGroupId)">Enviar</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .groups-page {
        min-height: 100vh;
        background: linear-gradient(180deg, #f6f0e7 0%, #eef3f8 100%);
        padding: 2rem;
        color: #172033;
      }
      .page-header, .detail-header, .card-top, .meta-row, .group-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
      }
      .page-header {
        margin-bottom: 1.5rem;
      }
      .eyebrow {
        display: inline-block;
        background: rgba(214,169,74,0.12);
        color: #2b3b58;
        border: 1px solid rgba(214,169,74,0.25);
        border-radius: 999px;
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        padding: 0.38rem 0.7rem;
        text-transform: uppercase;
        font-weight: 700;
      }
      h1, h2, h3 { margin: 0; }
      h1 { margin-top: 0.5rem; }
      .panel {
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(23,32,51,0.05);
        border-radius: 1.2rem;
        padding: 1.25rem;
        box-shadow: 0 12px 30px rgba(23,32,51,0.04);
        margin-bottom: 1.5rem;
      }
      .group-form, .challenge-form, .chat-form {
        display: grid;
        gap: 0.9rem;
        margin-top: 1rem;
      }
      .group-form label, .challenge-form label {
        display: grid;
        gap: 0.4rem;
        font-weight: 600;
      }
      .group-form input,
      .group-form textarea,
      .challenge-form input,
      .challenge-form textarea,
      .chat-form input {
        border: 1px solid rgba(23,32,51,0.12);
        border-radius: 0.8rem;
        padding: 0.8rem 0.9rem;
        font: inherit;
        background: #fbfcfe;
      }
      .two-col, .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 1rem;
      }
      .detail-grid {
        margin-top: 1.2rem;
      }
      .bottom-grid {
        margin-top: 1.6rem;
      }
      .primary-button, .join-button, .ghost-button {
        appearance: none;
        border: none;
        border-radius: 999px;
        padding: 0.75rem 1rem;
        font-weight: 700;
        cursor: pointer;
      }
      .primary-button {
        background: linear-gradient(135deg, #1d2b42, #314d73);
        color: white;
        width: fit-content;
      }
      .join-button {
        background: rgba(214,169,74,0.12);
        color: #2b3b58;
        border: 1px solid rgba(214,169,74,0.25);
      }
      .ghost-button {
        border: 1px solid rgba(23,32,51,0.08);
        background: white;
        color: #172033;
      }
      .join-button[disabled] {
        opacity: 0.7;
        cursor: default;
      }
      .group-list, .mini-list {
        display: grid;
        gap: 1rem;
        margin-top: 1rem;
      }
      .group-list {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      .group-card, .mini-item, .leaderboard-item, .chat-message {
        border: 1px solid rgba(23,32,51,0.06);
        border-radius: 1rem;
        background: linear-gradient(180deg, #fff, #f8f9fb);
        padding: 1rem;
      }
      .card-top span, .meta-row span, .meta-row strong, .mini-item span, .mini-item small, .leaderboard-item small {
        color: #4d677d;
      }
      .tag {
        background: #eaf6ee;
        color: #1f7a5f;
        border-radius: 999px;
        padding: 0.35rem 0.6rem;
        font-size: 0.7rem;
        font-weight: 700;
      }
      .leaderboard-list, .chat-box {
        display: grid;
        gap: 0.8rem;
        margin-top: 1rem;
      }
      .leaderboard-item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.75rem;
      }
      .rank-badge {
        display: inline-grid;
        place-items: center;
        width: 2.3rem;
        height: 2.3rem;
        border-radius: 50%;
        background: rgba(214,169,74,0.14);
        color: #2b3b58;
        font-weight: 800;
      }
      .pages-read {
        font-weight: 700;
        color: #172033;
      }
      .mini-item {
        display: grid;
        gap: 0.35rem;
      }
      .activity-item strong {
        color: #1c2d44;
      }
      .chat-message {
        display: grid;
        gap: 0.3rem;
      }
      .chat-form {
        margin-top: 1rem;
        grid-template-columns: 1fr auto;
      }
      .empty-state {
        margin: 1rem 0 0;
        color: #4d677d;
      }
      @media (max-width: 900px) {
        .two-col, .detail-grid, .chat-form {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class GroupsComponent implements OnInit {
  groups: ReadingGroup[] = [];
  myGroups: ReadingGroup[] = [];
  selectedGroupId: number | null = null;
  leaderboardByGroup: Record<number, GroupLeaderboardEntry[]> = {};
  challengeByGroup: Record<number, GroupChallenge[]> = {};
  activityByGroup: Record<number, GroupActivity[]> = {};
  messagesByGroup: Record<number, GroupChatMessage[]> = {};
  groupsError = '';
  myGroupsError = '';
  chatDraftByGroup: Record<number, string> = {};
  challengeForm = {
    title: '',
    description: '',
    targetPages: 180,
  };
  form: CreateGroupPayload = {
    name: '',
    description: '',
  };

  constructor(
    private groupService: GroupService,
    private authService: AuthService,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loadGroups();
    this.loadMyGroups();
  }

  submitGroup(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (!this.form.name.trim()) {
      return;
    }

    this.groupService.create(this.form).subscribe({
      next: () => {
        this.form = {
          name: '',
          description: '',
        };
        this.loadGroups();
        this.loadMyGroups();
        this.changeDetector.markForCheck();
      },
      error: () => {
        alert('Não foi possível criar o grupo agora.');
        this.changeDetector.markForCheck();
      },
    });
  }

  joinGroup(groupId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.groupService.join(groupId).subscribe({
      next: () => {
        this.loadGroups();
        this.loadMyGroups();
        this.changeDetector.markForCheck();
      },
      error: () => {
        alert('Não foi possível participar do grupo.');
        this.changeDetector.markForCheck();
      },
    });
  }

  openGroup(groupId: number): void {
    this.router.navigate(['/chat'], { queryParams: { groupId } });
  }

  viewGroup(groupId: number): void {
    this.selectedGroupId = groupId;
    this.loadGroupData(groupId);
  }

  closeGroup(): void {
    this.selectedGroupId = null;
  }

  submitChallenge(groupId: number): void {
    if (!this.challengeForm.title.trim()) {
      return;
    }

    this.groupService.createChallenge(groupId, {
      title: this.challengeForm.title,
      description: this.challengeForm.description,
      targetPages: Number(this.challengeForm.targetPages) || 180,
    }).subscribe({
      next: (challenge) => {
        const current = this.challengeByGroup[groupId] ?? [];
        this.challengeByGroup[groupId] = [challenge, ...current];
        this.challengeForm = { title: '', description: '', targetPages: 180 };
        this.loadActivities(groupId);
        this.changeDetector.markForCheck();
      },
      error: () => {
        alert('Não foi possível criar o desafio do grupo.');
        this.changeDetector.markForCheck();
      },
    });
  }

  sendChat(groupId: number): void {
    const content = (this.chatDraftByGroup[groupId] ?? '').trim();
    if (!content) {
      return;
    }

    this.groupService.sendMessage(groupId, content).subscribe({
      next: (message) => {
        const current = this.messagesByGroup[groupId] ?? [];
        this.messagesByGroup[groupId] = [...current, message];
        this.chatDraftByGroup[groupId] = '';
        this.loadActivities(groupId);
        this.changeDetector.markForCheck();
      },
      error: () => {
        alert('Não foi possível enviar a mensagem.');
        this.changeDetector.markForCheck();
      },
    });
  }

  getLeaderboard(groupId: number): GroupLeaderboardEntry[] {
    return this.leaderboardByGroup[groupId] ?? [];
  }

  getChallenges(groupId: number): GroupChallenge[] {
    return this.challengeByGroup[groupId] ?? [];
  }

  getActivities(groupId: number): GroupActivity[] {
    return this.activityByGroup[groupId] ?? [];
  }

  getMessages(groupId: number): GroupChatMessage[] {
    return this.messagesByGroup[groupId] ?? [];
  }

  formatChallengeStatus(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'Concluído';
      case 'EXPIRED':
        return 'Encerrado';
      default:
        return 'Ativo';
    }
  }

  goToDashboard(): void {
    this.router.navigateByUrl('/dashboard');
  }

  loadGroups(): void {
    this.groupsError = '';
    this.groupService.list().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.groups = [];
        this.groupsError = 'Não foi possível carregar os grupos disponíveis.';
        this.changeDetector.markForCheck();
      },
    });
  }

  loadMyGroups(): void {
    this.myGroupsError = '';
    this.groupService.myGroups().subscribe({
      next: (groups) => {
        this.myGroups = groups;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.myGroups = [];
        this.myGroupsError = 'Não foi possível carregar seus grupos.';
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadGroupData(groupId: number): void {
    this.groupService.leaderboard(groupId).subscribe({
      next: (leaderboard) => {
        this.leaderboardByGroup[groupId] = leaderboard;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.leaderboardByGroup[groupId] = [];
        this.changeDetector.markForCheck();
      },
    });

    this.groupService.challenges(groupId).subscribe({
      next: (challenges) => {
        this.challengeByGroup[groupId] = challenges;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.challengeByGroup[groupId] = [];
        this.changeDetector.markForCheck();
      },
    });

    this.loadActivities(groupId);
    this.groupService.messages(groupId).subscribe({
      next: (messages) => {
        this.messagesByGroup[groupId] = messages;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.messagesByGroup[groupId] = [];
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadActivities(groupId: number): void {
    this.groupService.activities(groupId).subscribe({
      next: (activities) => {
        this.activityByGroup[groupId] = activities;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.activityByGroup[groupId] = [];
        this.changeDetector.markForCheck();
      },
    });
  }
}
