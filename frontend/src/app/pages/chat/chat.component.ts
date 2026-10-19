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
            <input type="text" [(ngModel)]="draft" name="draft" placeholder="Escreva uma mensagem..." [disabled]="sending || messagesLoading" maxlength="2000" />
            <button type="submit" class="primary-button" [disabled]="sending || !draft.trim()">{{ sending ? 'Enviando...' : 'Enviar' }}</button>
          </form>
        </section>
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .chat-page {
        min-height: 100vh;
        background: radial-gradient(circle at top left, rgba(214,169,74,0.18), transparent 20%),
                    linear-gradient(180deg, #f6efe5 0%, #edf3f9 100%);
        padding: 2rem;
        color: #172033;
      }
      .page-header { margin-bottom: 1.5rem; }
      .eyebrow {
        display: inline-block;
        background: rgba(214,169,74,0.15);
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
      .chat-layout {
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr);
        gap: 1.25rem;
      }
      .panel {
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(23,32,51,0.06);
        border-radius: 1.3rem;
        box-shadow: 0 18px 38px rgba(23,32,51,0.06);
      }
      .sidebar {
        padding: 1rem;
      }
      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .sidebar-header h2 { margin: 0; }
      .mini-button {
        border: none;
        background: rgba(214,169,74,0.12);
        color: #2b3b58;
        border-radius: 999px;
        padding: 0.5rem 0.75rem;
        font-weight: 700;
        cursor: pointer;
      }
      .conversation-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.7rem;
      }
      .conversation-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        padding: 0.8rem 0.85rem;
        border-radius: 0.95rem;
        background: #f8fafc;
        border: 1px solid transparent;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .conversation-list li:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(23,32,51,0.05);
      }
      .conversation-list li.active {
        background: linear-gradient(135deg, rgba(214,169,74,0.12), rgba(103,127,169,0.09));
        border-color: rgba(214,169,74,0.18);
      }
      .room-meta {
        min-width: 0;
      }
      .room-meta strong,
      .room-meta small {
        display: block;
      }
      .room-meta small {
        color: #5b708c;
      }
      .room-badges {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
      }
      .online {
        display: inline-block;
        border-radius: 999px;
        background: rgba(39,120,87,0.12);
        color: #276f5d;
        padding: 0.2rem 0.5rem;
        font-size: 0.68rem;
        font-weight: 700;
      }
      .unread {
        min-width: 1.8rem;
        min-height: 1.8rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #d6a94a;
        color: #172033;
        font-weight: 800;
        font-size: 0.75rem;
      }
      .chat-panel {
        display: grid;
        grid-template-rows: auto 1fr auto;
        min-height: 620px;
      }
      .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 1.2rem 1.3rem;
        border-bottom: 1px solid rgba(23,32,51,0.06);
      }
      .chat-header small {
        display: block;
        color: #5b708c;
        margin-top: 0.3rem;
      }
      .status-pill {
        background: rgba(39, 120, 87, 0.12);
        color: #276f5d;
        border-radius: 999px;
        padding: 0.45rem 0.75rem;
        font-weight: 700;
      }
      .messages {
        display: grid;
        gap: 1rem;
        padding: 1.2rem;
        overflow: auto;
      }
      .message-row {
        display: flex;
        justify-content: flex-start;
      }
      .message-row.self {
        justify-content: flex-end;
      }
      .message-bubble {
        width: min(78%, 540px);
        padding: 0.9rem 1rem;
        border-radius: 1rem;
        border: 1px solid rgba(23,32,51,0.06);
      }
      .message-bubble.gold { background: rgba(214,169,74,0.12); }
      .message-bubble.blue { background: rgba(100,138,198,0.10); }
      .message-bubble.green { background: rgba(72,145,104,0.10); }
      .message-bubble header {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }
      .message-bubble time {
        font-size: 0.75rem;
        color: #597089;
      }
      .message-bubble p {
        margin: 0;
        color: #24324e;
        line-height: 1.55;
      }
      .composer {
        display: flex;
        gap: 0.8rem;
        padding: 1rem 1.2rem 1.2rem;
        border-top: 1px solid rgba(23,32,51,0.06);
      }
      .composer input {
        flex: 1;
        border: 1px solid rgba(24, 34, 53, 0.12);
        border-radius: 0.8rem;
        padding: 0.85rem 0.95rem;
        font: inherit;
      }
      .primary-button {
        border: none;
        border-radius: 0.8rem;
        background: linear-gradient(135deg, #1d2b42, #2d486d);
        color: white;
        padding: 0.85rem 1.1rem;
        font-weight: 700;
        cursor: pointer;
      }
      @media (max-width: 760px) {
        .chat-layout {
          grid-template-columns: 1fr;
        }
        .composer {
          flex-direction: column;
        }
      }
      .chat-page {
        color: #f3f0f8;
        background: radial-gradient(ellipse at 95% 0%, rgba(37,46,224,.2), transparent 28rem), #08080b;
      }
      .chat-page .eyebrow { color: #f1d779; background: rgba(217,173,57,.12); border-color: rgba(217,173,57,.28); }
      .chat-page .panel { color: #f3f0f8; background: #151519; border-color: rgba(255,255,255,.09); box-shadow: 0 18px 38px rgba(0,0,0,.3); }
      .chat-page .sidebar-header h2, .chat-page .chat-header strong, .chat-page .message-bubble strong { color: #fff; }
      .chat-page .mini-button { color: #f1d779; background: rgba(217,173,57,.12); text-decoration: none; }
      .conversation-list li { padding: 0; background: transparent; }
      .conversation-list li button { width: 100%; border: 1px solid rgba(255,255,255,.07); border-radius: .95rem; padding: .8rem .85rem; text-align: left; color: inherit; background: #1c1c22; cursor: pointer; }
      .conversation-list li button.active { border-color: rgba(217,173,57,.35); background: rgba(21,27,209,.22); }
      .room-meta small, .chat-header small, .message-bubble time { color: #aaa8b3; }
      .chat-header { border-color: rgba(255,255,255,.08); }
      .status-pill { color: #f1d779; background: rgba(217,173,57,.12); text-decoration: none; }
      .message-bubble { color: #f3f0f8; background: #222228; border-color: rgba(255,255,255,.08); }
      .message-bubble p { color: #f3f0f8; }
      .message-row.self .message-bubble { background: #1717cb; }
      .message-row.self .message-bubble time { color: #d4d3ff; }
      .composer { border-color: rgba(255,255,255,.08); }
      .composer input { color: #fff; background: #202027; border-color: rgba(255,255,255,.14); }
      .primary-button { background: linear-gradient(135deg, #1717cb, #343ff3); text-decoration: none; }
      .primary-button:disabled { opacity: .5; cursor: not-allowed; }
      .sidebar-note, .loading-state, .empty-state, .empty-room p { color: #c5c0cd; }
      .chat-feedback { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .8rem 1rem; color: #ffc2bc; background: rgba(105,35,35,.18); }
      .chat-feedback p { margin: 0; }
      .empty-room { display: grid; align-content: center; justify-items: center; gap: .5rem; padding: 2rem; text-align: center; }
      .empty-room h2, .empty-room p { margin: 0; }
    `,
  ],
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
