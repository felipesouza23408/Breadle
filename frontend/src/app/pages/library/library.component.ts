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
          <span class="eyebrow">Coleção</span>
          <h1>Biblioteca pessoal</h1>
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
        <article class="summary-card green">
          <span>Adquiridos</span>
          <strong>—</strong>
          <small>O acervo pessoal ainda não oferece aquisições</small>
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
            <h2>Minha coleção</h2>
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
  styles: [
    `
      :host { display: block; }
      .library-page {
        min-height: 100vh;
        background: radial-gradient(circle at top left, rgba(214,169,74,0.17), transparent 14%),
                    linear-gradient(180deg, #f5efe7 0%, #edf3f9 100%);
        padding: 2rem;
        color: #172033;
      }
      .page-header { margin-bottom: 1.5rem; }
      .loading-state, .error-state, .empty-library { margin-bottom: 1.5rem; }
      .loading-state { color: #d4d0da; }
      .error-state, .empty-library { padding: 1.5rem; }
      .error-state p, .empty-library p { color: #c5c0cd; line-height: 1.6; }
      .empty-library h2 { margin: 0.5rem 0; }
      .empty-filter { padding: 1rem 0.25rem 0; color: #c5c0cd; }
      .eyebrow {
        display: inline-block;
        background: rgba(214,169,74,0.14);
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
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .summary-card {
        border-radius: 1.1rem;
        padding: 1.2rem;
        color: white;
        box-shadow: 0 16px 32px rgba(23,32,51,0.08);
      }
      .summary-card.gold { background: linear-gradient(135deg, #1d2b42, #d6a94a); }
      .summary-card.blue { background: linear-gradient(135deg, #294d73, #5c88bf); }
      .summary-card.green { background: linear-gradient(135deg, #2a5d4b, #61a47f); }
      .summary-card span,
      .summary-card small { display: block; opacity: 0.9; }
      .summary-card strong { display: block; font-size: 2rem; margin: 0.5rem 0; }
      .panel {
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(23,32,51,0.06);
        border-radius: 1.2rem;
        padding: 1.3rem;
        box-shadow: 0 16px 34px rgba(23,32,51,0.06);
      }
      .filters {
        margin-bottom: 1.5rem;
      }
      .filter-group {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .micro-summary {
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      .mini-label {
        display: inline-block;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.7rem;
        font-weight: 800;
        color: #597089;
      }
      .micro-summary h2 {
        margin: 0.35rem 0 0;
      }
      .micro-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .filter-button,
      .mini-button {
        border: none;
        border-radius: 999px;
        padding: 0.6rem 0.9rem;
        font-weight: 700;
        cursor: pointer;
      }
      .filter-button {
        background: #f1f4f8;
        color: #2b3b58;
      }
      .filter-button.active {
        background: linear-gradient(135deg, #d6a94a, #f1d98c);
        color: #1e2b3f;
      }
      .mini-button {
        background: linear-gradient(135deg, #1d2b42, #304e72);
        color: white;
      }
      .mini-button.secondary {
        background: rgba(214,169,74,0.12);
        color: #2b3b58;
        border: 1px solid rgba(214,169,74,0.25);
      }
      .library-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.8fr);
        gap: 1rem;
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .filter-pill {
        background: rgba(214,169,74,0.12);
        border-radius: 999px;
        padding: 0.45rem 0.75rem;
        color: #2b3b58;
        font-weight: 700;
      }
      .book-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }
      .book-card {
        display: flex;
        gap: 0.9rem;
        padding: 0.9rem;
        border-radius: 1rem;
        background: #f7f9fc;
        border: 1px solid rgba(23,32,51,0.05);
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .book-card:hover,
      .book-card.selected {
        transform: translateY(-2px);
        box-shadow: 0 12px 24px rgba(23,32,51,0.08);
      }
      .book-card.gold { border-left: 4px solid #d6a94a; }
      .book-card.blue { border-left: 4px solid #5c88bf; }
      .book-card.green { border-left: 4px solid #61a47f; }
      .book-cover {
        position: relative;
        overflow: hidden;
        width: 62px;
        min-width: 62px;
        height: 80px;
        border-radius: 0.7rem;
        background: linear-gradient(135deg, #1d2b42, #5473a2);
        display: grid;
        place-items: center;
        color: white;
        font-weight: 800;
      }
      .book-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .book-info {
        flex: 1;
        display: grid;
        gap: 0.35rem;
      }
      .status {
        background: rgba(214,169,74,0.12);
        border-radius: 999px;
        padding: 0.25rem 0.55rem;
        font-size: 0.7rem;
        font-weight: 700;
        color: #2b3b58;
        justify-self: start;
      }
      .book-info h3 { margin: 0; font-size: 1rem; }
      .book-info small { color: #597089; }
      .progress-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.55rem;
        align-items: center;
      }
      .bar {
        height: 8px;
        background: #e7edf5;
        border-radius: 999px;
        overflow: hidden;
      }
      .bar span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #d6a94a, #7fa7d6);
        border-radius: inherit;
      }
      .detail-panel {
        padding: 1.2rem;
      }
      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .detail-tag {
        display: inline-block;
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #597089;
      }
      .detail-header h3 { margin: 0.35rem 0 0; }
      .detail-desc {
        color: #314156;
        line-height: 1.7;
        margin: 0 0 1rem;
      }
      .detail-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.75rem;
      }
      .detail-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        background: #f8fafc;
        border-radius: 0.8rem;
        padding: 0.7rem 0.8rem;
      }
      .detail-list span { color: #597089; }
      .library-page {
        background: radial-gradient(ellipse at 95% 0%, rgba(37, 46, 224, .2), transparent 28rem), #08080b;
        color: #f3f0f8;
      }
      .library-page h1, .library-page h2, .library-page h3 { color: #fff; }
      .library-page .eyebrow, .library-page .mini-label, .library-page .detail-tag { color: #f1d779; }
      .library-page .panel {
        color: #f3f0f8;
        background: #151519;
        border: 1px solid rgba(255,255,255,.09);
        box-shadow: 0 16px 34px rgba(0,0,0,.3);
      }
      .library-page .summary-card.gold { background: linear-gradient(120deg, #101016, #28231a 65%, #a37b20); }
      .library-page .summary-card.blue { background: linear-gradient(120deg, #0c0c18, #151bd1); }
      .library-page .summary-card.green { background: linear-gradient(120deg, #111514, #244837); }
      .library-page .filter-button { color: #d4d0da; background: #222228; }
      .library-page .filter-button.active { color: #17130b; background: linear-gradient(135deg, #d9ad39, #f1d779); }
      .library-page .filter-pill { color: #f1d779; background: rgba(217,173,57,.13); }
      .library-page .book-card { background: #1c1c22; border: 1px solid rgba(255,255,255,.08); }
      .library-page .book-info small, .library-page .detail-desc { color: #c5c0cd; }
      .library-page .detail-list li { background: #222228; }
      .library-page .detail-list span { color: #aaa8b3; }
      .library-page .mini-button.secondary { color: #f1d779; background: rgba(217,173,57,.12); border-color: rgba(217,173,57,.28); }
      .library-page .error-state, .library-page .empty-library {
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 1.2rem;
        background: #151519;
        box-shadow: 0 16px 34px rgba(0,0,0,.3);
      }
      .library-page .empty-filter { color: #c5c0cd; }
      .mini-button {
        display: inline-block;
        border: 0;
        text-decoration: none;
        font: inherit;
      }
      @media (max-width: 760px) {
        .summary-grid,
        .library-grid {
          grid-template-columns: 1fr;
        }
        .micro-summary {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
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
