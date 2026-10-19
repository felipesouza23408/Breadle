import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Book, BookService } from '../../services/book.service';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="books-shell">
      <header class="topbar">
        <div>
          <span class="brand">Breadle</span>
          <h1>Acervo</h1>
        </div>
        <nav class="nav">
          <a *ngIf="authService.isAuthenticated()" routerLink="/dashboard">Dashboard</a>
        </nav>
      </header>

      <section class="hero-banner">
        <div>
          <span class="eyebrow">Biblioteca pública</span>
          <h2>Descubra obras em domínio público e continue lendo sem custo.</h2>
        </div>
      </section>

      <section class="toolbar">
        <p class="results-count" *ngIf="!loading && !errorMessage">
          {{ visibleBooks.length }} {{ visibleBooks.length === 1 ? 'obra disponível' : 'obras disponíveis' }}
        </p>
        <input type="search" [(ngModel)]="query" placeholder="Buscar livro por título ou autor" (ngModelChange)="updateFilters()" />
        <label class="filter-control">
          <span>Categoria</span>
          <select [(ngModel)]="selectedType" (ngModelChange)="updateFilters()" aria-label="Filtrar por categoria">
            <option value="TODOS">Todas</option>
            <option value="LITERATURA">Literatura</option>
            <option value="AVENTURA">Aventura</option>
            <option value="INFANTOJUVENIL">Infantojuvenil</option>
            <option value="GIBI">Quadrinhos</option>
          </select>
        </label>
        <label class="filter-control">
          <span>Ordenar</span>
          <select [(ngModel)]="sortBy" (ngModelChange)="updateFilters()" aria-label="Ordenar livros">
            <option value="title">Título</option>
            <option value="points">Pontos</option>
            <option value="pages">Número de páginas</option>
          </select>
        </label>
      </section>

      <p class="loading-state" *ngIf="loading" role="status">Carregando o acervo...</p>

      <section class="error-state" *ngIf="!loading && errorMessage" role="alert">
        <p>{{ errorMessage }}</p>
        <button type="button" class="read-link secondary" (click)="loadBooks()">Tentar novamente</button>
      </section>

      <section class="books-layout" *ngIf="!loading && !errorMessage && visibleBooks.length">
        <div class="books-grid">
          <article class="book-card" *ngFor="let book of visibleBooks" [class.highlight]="selectedBook?.id === book.id" (click)="selectedBook = book">
            <div class="cover" [ngClass]="coverClass(book)">
              <img *ngIf="book.capaUrl" [src]="book.capaUrl" [alt]="'Capa de ' + book.titulo" loading="lazy" />
              <div class="cover-art" *ngIf="!book.capaUrl" aria-hidden="true">
                <span class="cover-edition">{{ book.tipo }}</span>
                <span class="cover-emblem">✦</span>
                <strong class="cover-title">{{ book.titulo }}</strong>
                <small class="cover-author">{{ book.autor }}</small>
                <span class="cover-imprint">BREADLE · CLÁSSICOS</span>
              </div>
            </div>
            <div class="book-info">
              <h2>{{ book.titulo }}</h2>
              <p class="meta">{{ book.autor }} • {{ book.tipo }}</p>
              <p class="sinopse">{{ book.sinopse || 'Sem sinopse disponível.' }}</p>
              <div class="book-footer">
                <span>{{ book.totalPaginas }} páginas</span>
                <span>{{ book.pontosConclusao | number }} pts ao concluir</span>
              </div>
              <a *ngIf="authService.isAuthenticated(); else detailsOnly" [routerLink]="['/books', book.id, 'read']" class="read-link">Ler agora</a>
              <ng-template #detailsOnly>
                <a [routerLink]="['/books', book.id]" class="read-link secondary">Ver detalhes</a>
              </ng-template>
            </div>
          </article>
        </div>

        <aside class="detail-panel" *ngIf="selectedBook">
          <div class="detail-cover" [ngClass]="coverClass(selectedBook)">
            <img *ngIf="selectedBook.capaUrl" [src]="selectedBook.capaUrl" [alt]="'Capa de ' + selectedBook.titulo" />
            <div class="cover-art" *ngIf="!selectedBook.capaUrl" aria-hidden="true">
              <span class="cover-edition">{{ selectedBook.tipo }}</span>
              <span class="cover-emblem">✦</span>
              <strong class="cover-title">{{ selectedBook.titulo }}</strong>
              <small class="cover-author">{{ selectedBook.autor }}</small>
              <span class="cover-imprint">BREADLE · CLÁSSICOS</span>
            </div>
          </div>
          <span class="detail-tag">Em destaque</span>
          <h3>{{ selectedBook.titulo }}</h3>
          <a class="detail-author" [routerLink]="['/authors', selectedBook.autor]">{{ selectedBook.autor }}</a>
          <p class="detail-sinopse">{{ selectedBook.sinopse || 'Sem sinopse disponível.' }}</p>
          <ul class="detail-list">
            <li><span>Tipo</span><strong>{{ selectedBook.tipo }}</strong></li>
            <li><span>Páginas</span><strong>{{ selectedBook.totalPaginas }}</strong></li>
            <li><span>Origem</span><strong>{{ selectedBook.origem }}</strong></li>
            <li><span>Ao concluir</span><strong>{{ selectedBook.pontosConclusao | number }} pontos</strong></li>
          </ul>
          <div class="detail-actions">
            <a [routerLink]="['/books', selectedBook.id]" class="read-link secondary">Ver descrição completa</a>
            <a *ngIf="authService.isAuthenticated()" [routerLink]="['/books', selectedBook.id, 'read']" class="read-link">Ler agora</a>
          </div>
        </aside>
      </section>

      <section class="empty-state" *ngIf="!loading && !errorMessage && !visibleBooks.length">
        <h2>{{ books.length ? 'Nenhum livro corresponde aos filtros' : 'Acervo temporariamente indisponível' }}</h2>
        <p>{{ books.length ? 'Tente outra busca ou remova os filtros.' : 'Não foi possível carregar os livros do servidor.' }}</p>
        <button *ngIf="books.length" type="button" class="read-link secondary" (click)="clearFilters()">Limpar filtros</button>
        <button *ngIf="!books.length" type="button" class="read-link secondary" (click)="loadBooks()">Tentar novamente</button>
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .books-shell {
        min-height: 100vh;
        background:
          radial-gradient(ellipse at 95% 0%, rgba(36, 45, 220, .2), transparent 30rem),
          #08080b;
        padding: 2rem;
        color: #f3f0f8;
      }
      .topbar, .nav { display: flex; align-items: center; justify-content: space-between; }
      .nav { gap: 1rem; }
      .nav a { color: #d5d0dc; text-decoration: none; font-weight: 700; }
      .brand {
        display: inline-block;
        background: rgba(217,173,57,.11);
        color: #f1d779;
        padding: 0.42rem 0.8rem;
        border-radius: 0.5rem;
        border: 1px solid rgba(217,173,57,.25);
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      h1 { margin: 0.8rem 0 0; color: #fff; }
      .hero-banner {
        margin-top: 1.5rem;
        background: linear-gradient(105deg, #101010 0%, #101326 48%, #151bd7 100%);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 1rem;
        padding: 1.5rem;
        color: white;
        box-shadow: 0 18px 40px rgba(0,0,0,.25);
      }
      .eyebrow {
        display: inline-block;
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 999px;
        padding: 0.45rem 0.7rem;
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 800;
      }
      .hero-banner h2 {
        max-width: 620px;
        margin: 0.9rem 0 0;
        font-size: clamp(1.5rem, 2.6vw, 2.5rem);
        line-height: 1.2;
      }
      .toolbar { margin-top: 1.5rem; margin-bottom: 1.5rem; }
      .results-count { margin: 0 0 .65rem; color: #d5d0dc; font-weight: 700; }
      .toolbar input {
        flex: 1 1 22rem;
        min-width: min(100%, 16rem);
        padding: 0.95rem 1rem;
        border-radius: 0.7rem;
        border: 1px solid rgba(255,255,255,.12);
        background: #17171c;
        color: #fff;
        font-size: 1rem;
        box-shadow: 0 12px 24px rgba(0,0,0,.15);
      }
      .toolbar { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 0.75rem; }
      .filter-control { display: grid; gap: 0.35rem; color: #aaa8b3; font-size: 0.75rem; font-weight: 800; }
      .filter-control select {
        min-width: 10rem; padding: 0.85rem 0.9rem; border: 1px solid rgba(255,255,255,.12);
        border-radius: 0.7rem; color: #f3f0f8; background: #17171c; font: inherit;
      }
      .books-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.8fr);
        gap: 1rem;
      }
      .books-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; }
      .book-card {
        background: #141418;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 0.9rem;
        box-shadow: 0 12px 28px rgba(0,0,0,.24);
        display: grid;
        grid-template-columns: 110px 1fr;
        padding: 1rem;
        gap: 1rem;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .book-card:hover,
      .book-card.highlight {
        transform: translateY(-3px);
        border-color: rgba(217,173,57,.38);
        box-shadow: 0 18px 36px rgba(0,0,0,.4);
      }
      .cover,
      .detail-cover {
        --cover-accent: #e8c679;
        position: relative; display: grid; place-items: center; overflow: hidden; border-radius: 0.55rem; font-size: 2rem; font-weight: 800; color: white; min-height: 160px;
      }
      .cover img, .detail-cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .cover-art {
        position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
        padding: 0.7rem 0.55rem; border: 1px solid color-mix(in srgb, var(--cover-accent) 72%, transparent);
        color: #fff8e8; text-align: center; background: linear-gradient(155deg, rgba(255,255,255,.1), transparent 42%, rgba(0,0,0,.34));
      }
      .cover-art::before {
        position: absolute; top: 29%; left: 50%; width: 64%; aspect-ratio: 1; border: 1px solid color-mix(in srgb, var(--cover-accent) 60%, transparent);
        border-radius: 50%; content: ''; transform: translateX(-50%);
      }
      .cover-art > * { position: relative; z-index: 1; }
      .cover-edition, .cover-imprint { color: var(--cover-accent); font-size: 0.43rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
      .cover-edition { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cover-emblem { display: grid; place-items: center; width: 1.8rem; height: 1.8rem; margin: auto 0 0.2rem; border: 1px solid var(--cover-accent); border-radius: 50%; color: var(--cover-accent); font-size: 0.85rem; }
      .cover-title { display: -webkit-box; overflow: hidden; max-width: 100%; margin: 0.25rem 0; font: 700 clamp(0.72rem, 1.1vw, 0.95rem)/1.1 Georgia, serif; text-overflow: ellipsis; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
      .cover-author { display: -webkit-box; overflow: hidden; max-width: 100%; color: rgba(255,248,232,.78); font-size: 0.55rem; line-height: 1.2; text-overflow: ellipsis; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
      .cover-imprint { margin-top: auto; font-size: 0.37rem; }
      .cover.theme-0, .detail-cover.theme-0 { --cover-accent: #edcb7d; background: linear-gradient(145deg, #162b48, #315d70 54%, #101a2d); }
      .cover.theme-1, .detail-cover.theme-1 { --cover-accent: #f0c584; background: linear-gradient(145deg, #452327, #955238 56%, #251823); }
      .cover.theme-2, .detail-cover.theme-2 { --cover-accent: #d6dc9b; background: linear-gradient(145deg, #1d3b32, #54724c 56%, #182a2b); }
      .cover.theme-3, .detail-cover.theme-3 { --cover-accent: #e8c5a2; background: linear-gradient(145deg, #3a2639, #75475a 56%, #211d32); }
      .cover.theme-4, .detail-cover.theme-4 { --cover-accent: #f2d992; background: linear-gradient(145deg, #34301d, #806d35 56%, #20211e); }
      .cover.theme-5, .detail-cover.theme-5 { --cover-accent: #b8d8df; background: linear-gradient(145deg, #172d3b, #357082 56%, #152433); }
      .detail-cover {
        min-height: 220px;
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      .book-info h2 { margin: 0 0 0.4rem; font-size: 1.2rem; }
      .meta { margin: 0; color: #b6b1bf; font-weight: 600; }
      .sinopse { color: #c8c3ce; line-height: 1.5; margin: 0.8rem 0; }
      .book-footer { display: flex; justify-content: space-between; font-weight: 600; color: #e1c56e; margin-bottom: 0.8rem; }
      .read-link {
        display: inline-block;
        background: linear-gradient(135deg, #1616ca, #343ff3);
        color: white;
        padding: 0.7rem 1rem;
        border-radius: 0.8rem;
        text-decoration: none;
        font-weight: 700;
      }
      .read-link.secondary {
        background: rgba(217,173,57,.14);
        border: 1px solid rgba(217,173,57,.32);
        color: #f1d779;
      }
      .detail-panel {
        background: #141418;
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 0.9rem;
        box-shadow: 0 12px 28px rgba(0,0,0,.24);
        padding: 1.2rem;
        align-self: start;
      }
      .detail-tag {
        display: inline-block;
        color: #e1c56e;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 0.72rem;
        font-weight: 800;
      }
      .detail-panel h3 { margin: 0.5rem 0 0; font-size: 1.6rem; }
      .detail-author { margin: 0.35rem 0 0; color: #b6b1bf; font-weight: 700; }
      a.detail-author { display: inline-block; color: #ffe18a; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .2rem; }
      a.detail-author:hover { color: #fff2c6; }
      .detail-sinopse { color: #c8c3ce; line-height: 1.6; margin: 1rem 0; }
      .detail-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.7rem;
      }
      .detail-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        background: #1d1d23;
        border-radius: 0.55rem;
        padding: 0.7rem 0.8rem;
      }
      .detail-list span { color: #aaa8b3; }
      .detail-actions { display: flex; flex-wrap: wrap; gap: .65rem; margin-top: 1rem; }
      .empty-state {
        background: #141418;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 12px 28px rgba(0,0,0,.24);
        color: #c8c3ce;
      }
      .empty-state h2 { margin: 0 0 .4rem; color: #fff; }
      .empty-state p { margin: 0 0 1rem; }
      .loading-state, .error-state {
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 1rem;
        padding: 1.25rem;
        color: #d4d0da;
        background: #151519;
      }
      .error-state p { margin-top: 0; }
      @media (max-width: 960px) {
        .books-layout {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 760px) {
        .books-shell { padding: 1rem; }
        .topbar { align-items: flex-start; }
        .books-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class BooksComponent implements OnInit {
  books: Book[] = [];
  query = '';
  selectedBook: Book | null = null;
  selectedType = 'TODOS';
  sortBy: 'title' | 'points' | 'pages' = 'title';
  loading = false;
  errorMessage = '';
  private requestNumber = 0;

  constructor(public authService: AuthService, private bookService: BookService, private changeDetector: ChangeDetectorRef) {}

  get visibleBooks(): Book[] {
    const typeFilteredBooks = this.books.filter((book) => {
      if (this.selectedType === 'TODOS') {
        return true;
      }
      const type = (book.tipo ?? '').toUpperCase();
      return this.selectedType === 'GIBI'
        ? type.includes('GIBI') || type.includes('QUADRINHO')
        : type.includes(this.selectedType);
    });

    return [...typeFilteredBooks].sort((first, second) => {
      if (this.sortBy === 'points') {
        return second.pontuacaoBase - first.pontuacaoBase;
      }
      if (this.sortBy === 'pages') {
        return second.totalPaginas - first.totalPaginas;
      }
      return first.titulo.localeCompare(second.titulo, 'pt-BR');
    });
  }

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    const requestNumber = ++this.requestNumber;
    this.loading = true;
    this.errorMessage = '';
    this.bookService.getBooks().subscribe({
      next: (books) => {
        if (requestNumber !== this.requestNumber) {
          return;
        }
        this.books = books;
        this.selectedBook = this.books[0] ?? null;
        this.updateFilters();
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        if (requestNumber !== this.requestNumber) {
          return;
        }
        this.books = [];
        this.selectedBook = null;
        this.loading = false;
        this.errorMessage = 'Não foi possível conectar ao acervo. Verifique sua conexão e tente novamente.';
        this.changeDetector.markForCheck();
      },
    });
  }

  updateFilters(): void {
    if (!this.visibleBooks.some((book) => book.id === this.selectedBook?.id)) {
      this.selectedBook = this.visibleBooks[0] ?? null;
    }
  }

  clearFilters(): void {
    this.query = '';
    this.selectedType = 'TODOS';
    this.sortBy = 'title';
    this.loadBooks();
  }

  coverClass(book: Book): string {
    return `theme-${Math.abs(book.id) % 6}`;
  }
}
