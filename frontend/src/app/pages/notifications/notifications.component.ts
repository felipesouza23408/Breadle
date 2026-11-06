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
