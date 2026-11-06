import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, interval, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { GroupChatMessage, GroupService, ReadingGroup } from '../../services/group.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="chat-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">Comunidade</span>
          <h1>Chat</h1>
        </div>
      </header>

      <section class="chat-layout">
        <aside class="sidebar panel">
          <div class="sidebar-header">
            <h2>Conversas</h2>
            <a routerLink="/groups" class="mini-button">Ver grupos</a>
          </div>

          <ul class="conversation-list">
            <li *ngFor="let group of groups">
              <button type="button" [class.active]="group.id === selectedGroupId" (click)="selectGroup(group.id)">
                <span class="room-meta">
                  <strong>{{ group.name }}</strong>
                  <small>{{ group.memberCount }} participantes</small>
                </span>
              </button>
            </li>
          </ul>
          <p class="sidebar-note" *ngIf="!loading && !errorMessage && !groups.length">
            Você ainda não participa de grupos. Explore os clubes de leitura para conversar com outros leitores.
          </p>
        </aside>

        <section class="panel chat-panel">
          <div class="chat-header" *ngIf="selectedGroup as group">
            <div>
              <strong>{{ group.name }}</strong>
              <small>{{ group.description || group.memberCount + ' participantes' }}</small>
            </div>
            <a routerLink="/groups" class="status-pill">Grupo</a>
          </div>

          <div class="chat-feedback" *ngIf="errorMessage" role="alert">
            <p>{{ errorMessage }}</p>
            <button type="button" class="mini-button" (click)="retry()">Tentar novamente</button>
          </div>

          <div class="messages" aria-live="polite" *ngIf="selectedGroup">
            <p class="loading-state" *ngIf="messagesLoading" role="status">Carregando mensagens...</p>
            <p class="empty-state" *ngIf="!messagesLoading && !messages.length && !errorMessage">Ainda não há mensagens neste grupo. Comece a conversa.</p>
            <article *ngFor="let message of messages" class="message-row" [class.self]="message.userId === currentUserId">
              <div class="message-bubble" [class.self]="message.userId === currentUserId">
                <header>
                  <strong>{{ message.userName }}</strong>
                  <time>{{ message.createdAt | date:'short' }}</time>
                </header>
                <p>{{ message.content }}</p>
              </div>
            </article>
          </div>

          <section class="empty-room" *ngIf="!loading && !selectedGroup">
            <h2>{{ requestedGroupId ? 'Grupo indisponível no chat' : 'Escolha uma conversa' }}</h2>
            <p>{{ requestedGroupId ? 'Para abrir o chat, você precisa participar deste grupo.' : 'Entre em um grupo de leitura para participar do chat.' }}</p>
            <a routerLink="/groups" class="primary-button">Explorar grupos</a>
          </section>

          <form class="composer" *ngIf="selectedGroup" (ngSubmit)="sendMessage()">
            <label class="visually-hidden" for="chat-message">Mensagem</label>
            <input id="chat-message" type="text" [(ngModel)]="draft" name="draft" placeholder="Escreva uma mensagem..." [disabled]="sending || messagesLoading" maxlength="2000" />
            <button type="submit" class="primary-button" [disabled]="sending || !draft.trim()">{{ sending ? 'Enviando...' : 'Enviar' }}</button>
          </form>
        </section>
      </section>
    </main>
  `,

})
export class ChatComponent implements OnInit, OnDestroy {
  draft = '';
  groups: ReadingGroup[] = [];
  selectedGroupId: number | null = null;
  messages: GroupChatMessage[] = [];
  currentUserId: number | null = null;
  loading = true;
  messagesLoading = false;
  sending = false;
  errorMessage = '';
  private readonly destroyed$ = new Subject<void>();
  private messagesRequestId = 0;
  requestedGroupId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private groupService: GroupService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const groupIdParam = this.route.snapshot.queryParamMap.get('groupId');
    const requestedGroupId = groupIdParam === null ? null : Number(groupIdParam);
    this.requestedGroupId = requestedGroupId !== null && Number.isInteger(requestedGroupId) && requestedGroupId > 0
      ? requestedGroupId
      : null;

    this.authService.me().subscribe({
      next: (profile) => {
        this.currentUserId = profile.id;
        this.loadGroups();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Não foi possível verificar sua conta para carregar o chat.';
        this.changeDetector.markForCheck();
      },
    });
    interval(15000).pipe(takeUntil(this.destroyed$)).subscribe(() => {
      if (document.visibilityState === 'visible' && this.selectedGroupId !== null) {
        this.loadMessages(this.selectedGroupId, false);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    if (this.selectedGroupId !== null) {
      this.loadMessages(this.selectedGroupId, false);
    }
  }

  get selectedGroup(): ReadingGroup | undefined {
    return this.groups.find((group) => group.id === this.selectedGroupId);
  }

  selectGroup(groupId: number): void {
    if (this.selectedGroupId === groupId) {
      return;
    }
    this.selectedGroupId = groupId;
    this.requestedGroupId = null;
    this.messages = [];
    this.errorMessage = '';
    this.loadMessages(groupId, true);
  }

  sendMessage(): void {
    const groupId = this.selectedGroupId;
    const content = this.draft.trim();
    if (groupId === null || !content || this.sending) {
      return;
    }

    this.sending = true;
    this.groupService.sendMessage(groupId, content).subscribe({
      next: (message) => {
        this.messages = [...this.messages, message];
        this.draft = '';
        this.sending = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Não foi possível enviar a mensagem. Tente novamente.';
        this.sending = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  retry(): void {
    if (this.selectedGroupId !== null) {
      this.loadMessages(this.selectedGroupId, true);
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.loadGroups();
  }

  private loadGroups(): void {
    this.groupService.myGroups().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.loading = false;
        if (this.requestedGroupId !== null && !groups.some((group) => group.id === this.requestedGroupId)) {
          this.selectedGroupId = null;
          this.errorMessage = 'Você ainda não participa deste grupo.';
        } else if (this.requestedGroupId !== null) {
          this.selectedGroupId = this.requestedGroupId;
        } else if (!groups.some((group) => group.id === this.selectedGroupId)) {
          this.selectedGroupId = groups[0]?.id ?? null;
        }
        if (this.selectedGroupId !== null) {
          this.loadMessages(this.selectedGroupId, true);
        }
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Não foi possível carregar seus grupos de leitura.';
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadMessages(groupId: number, showLoading: boolean): void {
    const requestId = ++this.messagesRequestId;
    if (showLoading) {
      this.messagesLoading = true;
    }
    this.groupService.messages(groupId).subscribe({
      next: (messages) => {
        if (requestId !== this.messagesRequestId || groupId !== this.selectedGroupId) {
          return;
        }
        this.messages = messages;
        this.messagesLoading = false;
        this.errorMessage = '';
        this.changeDetector.markForCheck();
      },
      error: () => {
        if (requestId !== this.messagesRequestId || groupId !== this.selectedGroupId) {
          return;
        }
        this.messagesLoading = false;
        this.errorMessage = 'Não foi possível carregar as mensagens deste grupo.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
