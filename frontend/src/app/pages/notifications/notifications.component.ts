import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NotificationService, UserNotification } from '../../services/notification.service';

type NotificationFilter = 'all' | 'unread' | 'read';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="notifications-page">
      <header class="page-heading">
        <div>
          <span class="eyebrow">Sua estante em movimento</span>
          <h1>Notificações</h1>
          <p>Novidades sobre suas leituras, missões e grupos, reunidas em um só lugar.</p>
        </div>
        <div class="heading-actions">
          <button type="button" class="quiet-button" (click)="loadNotifications()" [disabled]="loading">
            {{ loading ? 'Atualizando...' : 'Atualizar' }}
          </button>
          <button type="button" class="primary-button" (click)="markAllAsRead()" [disabled]="loading || unreadCount === 0">
            Marcar todas como lidas
          </button>
        </div>
      </header>

      <section class="summary-row" aria-label="Resumo das notificações">
        <article class="summary-card">
          <span class="summary-icon">✦</span>
          <div><small>Total</small><strong>{{ notifications.length }}</strong></div>
        </article>
        <article class="summary-card unread-summary">
          <span class="summary-icon">●</span>
          <div><small>Não lidas</small><strong>{{ unreadCount }}</strong></div>
        </article>
        <article class="summary-note">
          <span class="note-mark">“</span>
          <p>Pequenos lembretes também ajudam uma grande história a continuar.</p>
        </article>
      </section>

      <section class="notification-book">
        <div class="list-heading">
          <div>
            <span class="section-kicker">Caixa de entrada</span>
            <h2>Seus recados</h2>
          </div>
          <div class="filters" role="tablist" aria-label="Filtrar notificações">
            <button type="button" role="tab" [attr.aria-selected]="filter === 'all'" [class.selected]="filter === 'all'" (click)="filter = 'all'">Todas</button>
            <button type="button" role="tab" [attr.aria-selected]="filter === 'unread'" [class.selected]="filter === 'unread'" (click)="filter = 'unread'">Não lidas</button>
            <button type="button" role="tab" [attr.aria-selected]="filter === 'read'" [class.selected]="filter === 'read'" (click)="filter = 'read'">Lidas</button>
          </div>
        </div>

        <p class="feedback error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</p>
        <div class="loading-state" *ngIf="loading && !notifications.length" role="status">Abrindo sua caixa de entrada...</div>

        <ul class="notification-list" *ngIf="!loading || notifications.length">
          <li *ngFor="let notification of visibleNotifications" [class.unread]="!notification.seen">
            <span class="unread-dot" [class.is-read]="notification.seen" aria-hidden="true"></span>
            <span class="type-icon" aria-hidden="true">{{ getIcon(notification.type) }}</span>
            <div class="notification-copy">
              <div class="notification-title-row">
                <h3>{{ notification.title }}</h3>
                <span class="new-label" *ngIf="!notification.seen">Nova</span>
              </div>
              <p>{{ notification.message }}</p>
              <time [attr.datetime]="notification.createdAt">{{ formatDate(notification.createdAt) }}</time>
            </div>
          </li>
        </ul>

        <div class="empty-state" *ngIf="!loading && !errorMessage && !visibleNotifications.length">
          <span aria-hidden="true">✧</span>
          <h3>{{ notifications.length ? 'Nada neste filtro' : 'Sua caixa está em silêncio' }}</h3>
          <p>{{ notifications.length ? 'Escolha outra categoria para ver seus recados.' : 'Quando houver novidades sobre sua jornada, elas aparecerão aqui.' }}</p>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: calc(100vh - 4.25rem); }
    .notifications-page {
      min-height: inherit;
      padding: clamp(1.25rem, 4vw, 3.5rem);
      color: #f5efe3;
      background:
        radial-gradient(ellipse at 90% 0%, rgba(53, 84, 111, .5), transparent 30rem),
        linear-gradient(145deg, #111a29 0%, #18273a 58%, #203a47 100%);
    }
    .page-heading, .heading-actions, .list-heading, .notification-title-row {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    }
    .page-heading { max-width: 1240px; margin: 0 auto 2rem; }
    .eyebrow, .section-kicker {
      color: #e8c679; font-size: .72rem; font-weight: 800; letter-spacing: .15em; text-transform: uppercase;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 { margin: .5rem 0; font: 600 clamp(2.2rem, 4vw, 3.5rem)/1.05 Georgia, serif; }
    .page-heading p { max-width: 42rem; margin-bottom: 0; color: #c2cbd1; line-height: 1.65; }
    button { font: inherit; }
    .heading-actions { flex-wrap: wrap; justify-content: flex-end; }
    .primary-button, .quiet-button {
      min-height: 2.8rem; border-radius: .8rem; padding: .7rem 1rem; font-weight: 750; cursor: pointer;
    }
    .primary-button { border: 0; color: #172033; background: linear-gradient(135deg, #f2d58f, #d6a94a); }
    .quiet-button { border: 1px solid rgba(240, 220, 181, .3); color: #f5efe3; background: rgba(255,255,255,.05); }
    button:disabled { cursor: not-allowed; opacity: .48; }
    .summary-row { max-width: 1240px; margin: 0 auto 1.5rem; display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: .9rem; }
    .summary-card, .summary-note {
      min-height: 6rem; display: flex; align-items: center; gap: .9rem; border-radius: 1rem;
      border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.065); padding: 1rem 1.25rem;
    }
    .summary-icon { display: grid; place-items: center; width: 2.6rem; height: 2.6rem; border-radius: .85rem; color: #f2d58f; background: rgba(242,213,143,.12); }
    .summary-card div { display: grid; gap: .2rem; }
    .summary-card small { color: #bbc7ce; }
    .summary-card strong { font: 700 1.5rem Georgia, serif; }
    .unread-summary .summary-icon { color: #bce5c9; background: rgba(143,209,163,.12); }
    .summary-note { color: #ddd5c6; font: italic 1rem/1.5 Georgia, serif; }
    .summary-note p { margin: 0; }
    .note-mark { align-self: flex-start; color: #e8c679; font: 3rem/.8 Georgia, serif; }
    .notification-book {
      max-width: 1240px; margin: 0 auto; overflow: hidden; border-radius: 1.35rem;
      color: #1b2735; background: #f7f2e9; box-shadow: 0 24px 60px rgba(0,0,0,.2);
    }
    .list-heading { padding: 1.5rem 1.6rem 1.2rem; border-bottom: 1px solid #e7dfd2; }
    .list-heading h2 { margin: .35rem 0 0; font: 600 1.65rem Georgia, serif; }
    .filters { display: flex; gap: .35rem; flex-wrap: wrap; padding: .25rem; border-radius: .8rem; background: #ece5d9; }
    .filters button { border: 0; border-radius: .6rem; padding: .55rem .8rem; color: #5b6570; background: transparent; font-size: .82rem; font-weight: 700; cursor: pointer; }
    .filters button.selected { color: #fff; background: #243d50; }
    .notification-list { list-style: none; margin: 0; padding: .25rem 1.6rem; }
    .notification-list li {
      display: grid; grid-template-columns: .65rem 2.6rem minmax(0, 1fr); align-items: start; gap: .85rem;
      padding: 1.2rem .25rem; border-bottom: 1px solid #e8e0d5;
    }
    .notification-list li:last-child { border-bottom: 0; }
    .notification-list li.unread { background: linear-gradient(90deg, rgba(235,222,187,.28), transparent 70%); }
    .unread-dot { width: .48rem; height: .48rem; margin-top: .95rem; border-radius: 50%; background: #bd8733; }
    .unread-dot.is-read { background: transparent; }
    .type-icon { display: grid; place-items: center; width: 2.45rem; height: 2.45rem; border: 1px solid #e4d6bc; border-radius: .8rem; color: #8c6528; background: #f1e8d8; }
    .notification-copy { min-width: 0; }
    .notification-title-row { justify-content: flex-start; }
    .notification-copy h3 { margin: 0; font-size: 1rem; }
    .notification-copy p { margin: .4rem 0; color: #59636c; line-height: 1.55; }
    .notification-copy time { color: #7d858a; font-size: .78rem; }
    .new-label { border-radius: 999px; padding: .22rem .48rem; color: #70541f; background: #f1dfb7; font-size: .66rem; font-weight: 800; text-transform: uppercase; }
    .empty-state, .loading-state { padding: 3.5rem 1rem; text-align: center; color: #67717a; }
    .empty-state > span { color: #b68a42; font-size: 2rem; }
    .empty-state h3 { margin: .7rem 0 .35rem; color: #25384a; font: 600 1.4rem Georgia, serif; }
    .empty-state p { margin-bottom: 0; }
    .feedback { margin: 1rem 1.6rem 0; padding: .8rem 1rem; border-radius: .75rem; }
    .feedback.error { color: #822e2e; background: #f8dddd; }
    @media (max-width: 760px) {
      .page-heading, .list-heading { align-items: flex-start; flex-direction: column; }
      .heading-actions { justify-content: flex-start; }
      .summary-row { grid-template-columns: 1fr 1fr; }
      .summary-note { grid-column: 1 / -1; }
      .notification-list { padding: .25rem .85rem; }
      .list-heading { padding: 1.2rem; }
      .filters { width: 100%; }
      .filters button { flex: 1; }
    }
    @media (max-width: 460px) {
      .summary-row { grid-template-columns: 1fr; }
      .summary-note { grid-column: auto; }
      .heading-actions { width: 100%; }
      .heading-actions button { flex: 1; }
      .notification-list li { grid-template-columns: .5rem 2.2rem minmax(0,1fr); gap: .55rem; }
    }
  `],
})
export class NotificationsComponent implements OnInit {
  notifications: UserNotification[] = [];
  filter: NotificationFilter = 'all';
  loading = false;
  errorMessage = '';

  constructor(private notificationService: NotificationService, private changeDetector: ChangeDetectorRef) {}

  get unreadCount(): number {
    return this.notifications.filter((notification) => !notification.seen).length;
  }

  get visibleNotifications(): UserNotification[] {
    return this.notifications.filter((notification) => {
      if (this.filter === 'unread') {
        return !notification.seen;
      }
      if (this.filter === 'read') {
        return notification.seen;
      }
      return true;
    });
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.errorMessage = '';
    this.notificationService.list().subscribe({
      next: (notifications) => {
        this.notifications = [...notifications].sort(
          (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
        );
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar suas notificações. Confira sua conexão e tente novamente.';
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  markAllAsRead(): void {
    if (!this.unreadCount || this.loading) {
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((notification) => ({ ...notification, seen: true }));
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Não foi possível marcar as notificações como lidas. Tente novamente.';
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Data indisponível'
      : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  getIcon(type: string): string {
    const normalizedType = type.toLowerCase();
    if (normalizedType.includes('miss')) {
      return '⚑';
    }
    if (normalizedType.includes('grupo') || normalizedType.includes('chat')) {
      return '◌';
    }
    if (normalizedType.includes('conquista') || normalizedType.includes('achievement')) {
      return '✦';
    }
    return '▤';
  }
}
