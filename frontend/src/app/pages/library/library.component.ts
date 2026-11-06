import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReadingService, ReadingSessionSummary } from '../../services/reading.service';

interface PersonalBook {
  sessionId: number;
  bookId: number;
  title: string;
  author: string;
  progress: number;
  status: 'Lido' | 'Em progresso';
  accent: 'gold' | 'blue' | 'green';
  description: string;
  coverUrl: string | null;
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="library-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">Sua leitura</span>
          <h1>Minha biblioteca</h1>
          <p class="page-description">Retome suas sessões e acompanhe o progresso das obras que você começou.</p>
        </div>
      </header>

      <p class="loading-state" *ngIf="loading" role="status">Carregando seu histórico de leitura...</p>
      <section class="error-state" *ngIf="!loading && errorMessage" role="alert">
        <p>{{ errorMessage }}</p>
        <button type="button" class="mini-button" (click)="loadLibrary()">Tentar novamente</button>
      </section>

      <section class="summary-grid" *ngIf="!loading && !errorMessage">
        <article class="summary-card gold">
          <span>Livros lidos</span>
          <strong>{{ counts.lidos }}</strong>
          <small>Concluídos nas suas sessões</small>
        </article>
        <article class="summary-card blue">
          <span>Em progresso</span>
          <strong>{{ counts.emAndamento }}</strong>
          <small>Leituras em andamento</small>
        </article>
      </section>

      <section class="filters panel" *ngIf="!loading && !errorMessage">
        <div class="filter-group">
          <button type="button" class="filter-button" [class.active]="selectedStatus === 'todos'" (click)="setStatus('todos')">Todos</button>
          <button type="button" class="filter-button" [class.active]="selectedStatus === 'Lido'" (click)="setStatus('Lido')">Lidos</button>
          <button type="button" class="filter-button" [class.active]="selectedStatus === 'Em progresso'" (click)="setStatus('Em progresso')">Em progresso</button>
        </div>
      </section>

      <section class="empty-library panel" *ngIf="!loading && !errorMessage && !books.length">
        <span class="eyebrow">Sua próxima leitura começa aqui</span>
        <h2>A biblioteca ainda está vazia</h2>
        <p>Quando você iniciar uma leitura, seu progresso aparecerá nesta estante.</p>
        <a routerLink="/books" class="mini-button">Explorar acervo</a>
      </section>

      <section class="micro-summary panel" *ngIf="!loading && selectedBook">
        <div>
          <span class="mini-label">Livro em foco</span>
          <h2>{{ selectedBook.title }}</h2>
        </div>
        <div class="micro-actions">
          <button type="button" class="mini-button" (click)="openBook(selectedBook)">
            {{ selectedBook.status === 'Em progresso' ? 'Retomar leitura' : 'Ler novamente' }}
          </button>
          <a routerLink="/books" class="mini-button secondary">Explorar acervo</a>
        </div>
      </section>

      <section class="library-grid" *ngIf="!loading && !errorMessage && books.length">
        <div class="panel collection-panel">
          <div class="panel-header">
            <h2>Sua estante</h2>
            <span class="filter-pill">Sessões recentes</span>
          </div>

          <div class="book-grid">
            <article *ngFor="let book of filteredBooks" class="book-card" [ngClass]="book.accent"
              (click)="selectBook(book)" (keydown)="handleBookCardKeydown($event, book)"
              [attr.tabindex]="0" role="button" [attr.aria-label]="'Selecionar ' + book.title + ', ' + book.status"
              [class.selected]="selectedBook?.bookId === book.bookId">
              <div class="book-cover">
                <img *ngIf="book.coverUrl" [src]="book.coverUrl" [alt]="'Capa de ' + book.title" loading="lazy" />
                <span *ngIf="!book.coverUrl">{{ initials(book.title) }}</span>
              </div>
              <div class="book-info">
                <span class="status">{{ book.status }}</span>
                <h3>{{ book.title }}</h3>
                <small>{{ book.author }}</small>
                <div class="progress-row">
                  <div class="bar"><span [style.width.%]="getProgressValue(book.progress)"></span></div>
                  <strong>{{ book.progress }}%</strong>
                </div>
              </div>
            </article>
          </div>
          <div class="empty-filter" *ngIf="!filteredBooks.length">
            <p>Você ainda não tem livros nesta categoria.</p>
          </div>
        </div>

        <aside class="panel detail-panel" *ngIf="selectedBook">
          <div class="detail-header">
            <div>
              <span class="detail-tag">Detalhes</span>
              <h3>{{ selectedBook.title }}</h3>
            </div>
            <button type="button" class="mini-button" (click)="openBook(selectedBook)">
              {{ selectedBook.status === 'Em progresso' ? 'Retomar leitura' : 'Ler novamente' }}
            </button>
          </div>

          <p class="detail-desc">{{ selectedBook.description }}</p>
          <ul class="detail-list">
            <li><span>Autor</span><strong>{{ selectedBook.author }}</strong></li>
            <li><span>Status</span><strong>{{ selectedBook.status }}</strong></li>
            <li><span>Progresso</span><strong>{{ selectedBook.progress }}</strong></li>
            <li><span>Próxima meta</span><strong>{{ nextMilestone(selectedBook) }}</strong></li>
          </ul>
        </aside>
      </section>
    </main>
  `,

})
export class LibraryComponent implements OnInit {
  selectedStatus: 'todos' | 'Lido' | 'Em progresso' = 'todos';
  selectedBook: PersonalBook | null = null;
  books: PersonalBook[] = [];
  loading = true;
  errorMessage = '';

  constructor(private readingService: ReadingService, private router: Router, private changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadLibrary();
  }

  get counts(): { lidos: number; emAndamento: number } {
    return {
      lidos: this.books.filter((book) => book.status === 'Lido').length,
      emAndamento: this.books.filter((book) => book.status === 'Em progresso').length,
    };
  }

  loadLibrary(): void {
    this.loading = true;
    this.errorMessage = '';
    this.readingService.listMySessions().subscribe({
      next: (sessions) => {
        this.books = this.toPersonalBooks(sessions);
        this.selectedBook = this.books[0] ?? null;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Não foi possível carregar sua biblioteca. Verifique sua conexão e tente novamente.';
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  get filteredBooks(): PersonalBook[] {
    return this.selectedStatus === 'todos' ? this.books : this.books.filter((book) => book.status === this.selectedStatus);
  }

  setStatus(status: 'todos' | 'Lido' | 'Em progresso'): void {
    this.selectedStatus = status;
    this.selectedBook = this.filteredBooks[0] ?? null;
  }

  selectBook(book: PersonalBook): void {
    this.selectedBook = book;
  }

  handleBookCardKeydown(event: KeyboardEvent, book: PersonalBook): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectBook(book);
    }
  }

  initials(title: string): string {
    return title
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || 'L';
  }

  getProgressValue(progress: number): number {
    return Math.min(100, Math.max(0, progress));
  }

  nextMilestone(book: PersonalBook): string {
    if (book.status === 'Lido') {
      return 'Sessão de leitura concluída';
    }
    return 'Continue sua sessão de leitura';
  }

  openBook(book: PersonalBook): void {
    this.router.navigate(['/books', book.bookId, 'read']);
  }

  private toPersonalBooks(sessions: ReadingSessionSummary[]): PersonalBook[] {
    const latestByBook = new Map<number, ReadingSessionSummary>();
    for (const session of sessions) {
      const existing = latestByBook.get(session.bookId);
      if (!existing || (session.status === 'ACTIVE' && existing.status !== 'ACTIVE')) {
        latestByBook.set(session.bookId, session);
      }
    }

    return Array.from(latestByBook.values()).map((session) => {
      const progress = session.pagesDefined > 0
        ? Math.round((session.pagesRead / session.pagesDefined) * 100)
        : 0;
      const status = session.status === 'COMPLETED' ? 'Lido' : 'Em progresso';
      return {
        sessionId: session.id,
        bookId: session.bookId,
        title: session.title,
        author: session.author,
        progress: this.getProgressValue(progress),
        status,
        accent: status === 'Lido' ? 'gold' : 'blue',
        description: `${session.pagesRead} de ${session.pagesDefined} páginas lidas nesta sessão.`,
        coverUrl: session.coverUrl,
      };
    });
  }
}
