import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Book, BookService } from '../../services/book.service';

interface BookCollection {
  name: string;
  books: Book[];
}

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="books-page">
      <section class="books-intro">
        <span class="books-eyebrow">Biblioteca Breadle</span>
        <h1>Um acervo para descobrir</h1>
        <p>Encontre sua próxima leitura, conheça novos autores e acompanhe suas descobertas no seu ritmo.</p>
      </section>

      <section class="books-toolbar" aria-label="Buscar e filtrar livros">
        <label class="books-search">
          <span class="visually-hidden">Buscar por título ou autor</span>
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input type="search" [(ngModel)]="query" placeholder="Buscar por título ou autor" (ngModelChange)="updateFilters()" />
        </label>
        <label class="books-filter">
          <span>Categoria</span>
          <select [(ngModel)]="selectedType" (ngModelChange)="updateFilters()" aria-label="Filtrar por categoria">
            <option value="TODOS">Todas as categorias</option>
            <option value="LITERATURA">Literatura</option>
            <option value="AVENTURA">Aventura</option>
            <option value="INFANTOJUVENIL">Infantojuvenil</option>
            <option value="GIBI">Quadrinhos</option>
          </select>
        </label>
        <label class="books-filter">
          <span>Ordenar por</span>
          <select [(ngModel)]="sortBy" (ngModelChange)="updateFilters()" aria-label="Ordenar livros">
            <option value="title">Título</option>
            <option value="points">Pontos</option>
            <option value="pages">Número de páginas</option>
          </select>
        </label>
      </section>

      <div class="books-list-heading">
        <div>
          <span class="books-eyebrow">Seu próximo capítulo</span>
          <h2>Explore as leituras</h2>
        </div>
        <p class="results-count" *ngIf="!loading && !errorMessage" aria-live="polite">
          {{ visibleBooks.length }} {{ visibleBooks.length === 1 ? 'obra' : 'obras' }}
        </p>
      </div>

      <nav class="books-view-tabs" aria-label="Organizar acervo">
        <button type="button" [class.active]="viewMode === 'books'" [attr.aria-pressed]="viewMode === 'books'" (click)="viewMode = 'books'">
          Todos os livros
        </button>
        <button type="button" [class.active]="viewMode === 'collections'" [attr.aria-pressed]="viewMode === 'collections'" (click)="viewMode = 'collections'">
          Organizar por coleção
        </button>
      </nav>

      <p class="books-feedback" *ngIf="loading" role="status">Carregando o acervo...</p>

      <section class="books-feedback error" *ngIf="!loading && errorMessage" role="alert">
        <p>{{ errorMessage }}</p>
        <button type="button" (click)="loadBooks()">Tentar novamente</button>
      </section>

      <section class="books-content" *ngIf="!loading && !errorMessage && visibleBooks.length">
        <div class="books-results">
          <ng-container *ngIf="viewMode === 'books'; else collectionsView">
            <div class="books-grid">
              <ng-container *ngFor="let book of visibleBooks; trackBy: trackBook">
                <ng-container *ngTemplateOutlet="bookCard; context: { $implicit: book }"></ng-container>
              </ng-container>
            </div>
          </ng-container>

          <ng-template #collectionsView>
            <section class="book-collection" *ngFor="let collection of bookCollections">
              <div class="collection-heading">
                <h3>{{ collection.name }}</h3>
                <span>{{ collection.books.length }} {{ collection.books.length === 1 ? 'livro' : 'livros' }}</span>
              </div>
              <div class="books-grid">
                <ng-container *ngFor="let book of collection.books; trackBy: trackBook">
                  <ng-container *ngTemplateOutlet="bookCard; context: { $implicit: book }"></ng-container>
                </ng-container>
              </div>
            </section>
          </ng-template>
        </div>

        <aside class="book-details" *ngIf="selectedBook as selected">
          <div class="details-cover" [ngClass]="coverClass(selected)">
            <img *ngIf="selected.capaUrl" [src]="selected.capaUrl" [alt]="'Capa de ' + selected.titulo" />
            <div class="cover-art" *ngIf="!selected.capaUrl" aria-hidden="true">
              <span>{{ selected.tipo }}</span><strong>{{ selected.titulo }}</strong><small>{{ selected.autor }}</small>
            </div>
          </div>
          <span class="details-label">Sobre esta obra</span>
          <h2>{{ selected.titulo }}</h2>
          <a class="details-author" [routerLink]="['/authors', selected.autor]">{{ selected.autor }}</a>
          <p class="details-synopsis">{{ selected.sinopse || 'Sem sinopse disponível.' }}</p>
          <dl class="details-facts">
            <div><dt>Categoria</dt><dd>{{ selected.tipo }}</dd></div>
            <div><dt>Páginas</dt><dd>{{ selected.totalPaginas | number }}</dd></div>
            <div><dt>Origem</dt><dd>{{ selected.origem }}</dd></div>
            <div><dt>Conclusão</dt><dd>{{ selected.pontosConclusao | number }} pontos</dd></div>
          </dl>
          <a [routerLink]="['/books', selected.id]" class="details-action secondary">Ver descrição completa</a>
          <a *ngIf="authService.isAuthenticated()" [routerLink]="['/books', selected.id, 'read']" class="details-action">Começar a ler</a>
        </aside>
      </section>

      <ng-template #bookCard let-book>
        <article class="book-card" [class.selected]="selectedBook?.id === book.id">
          <button type="button" class="book-preview" (click)="selectedBook = book" [attr.aria-pressed]="selectedBook?.id === book.id" [attr.aria-label]="'Ver detalhes de ' + book.titulo">
            <div class="book-cover" [ngClass]="coverClass(book)">
              <img *ngIf="book.capaUrl" [src]="book.capaUrl" [alt]="'Capa de ' + book.titulo" loading="lazy" />
              <div class="cover-art" *ngIf="!book.capaUrl" aria-hidden="true">
                <span>{{ book.tipo }}</span><strong>{{ book.titulo }}</strong><small>{{ book.autor }}</small>
              </div>
            </div>
            <span class="book-category">{{ book.tipo }}</span>
            <h3>{{ book.titulo }}</h3>
            <p class="book-author">{{ book.autor }}</p>
            <span class="book-pages">{{ book.totalPaginas | number }} páginas</span>
          </button>
          <div class="book-card-actions">
            <span class="book-points">{{ book.pontosConclusao | number }} pts ao concluir</span>
            <a *ngIf="authService.isAuthenticated(); else detailsOnly" [routerLink]="['/books', book.id, 'read']">Ler agora <span aria-hidden="true">→</span></a>
            <ng-template #detailsOnly><a [routerLink]="['/books', book.id]">Ver detalhes <span aria-hidden="true">→</span></a></ng-template>
          </div>
        </article>
      </ng-template>

      <section class="books-empty" *ngIf="!loading && !errorMessage && !visibleBooks.length">
        <span class="empty-symbol" aria-hidden="true">⌕</span>
        <h2>{{ books.length ? 'Não encontramos essa leitura' : 'O acervo está temporariamente indisponível' }}</h2>
        <p>{{ books.length ? 'Tente outra busca ou ajuste os filtros para ver mais obras.' : 'Não foi possível carregar os livros do servidor.' }}</p>
        <button *ngIf="books.length" type="button" (click)="clearFilters()">Limpar filtros</button>
        <button *ngIf="!books.length" type="button" (click)="loadBooks()">Tentar novamente</button>
      </section>
    </main>
  `,
})
export class BooksComponent implements OnInit {
  books: Book[] = [];
  query = '';
  selectedBook: Book | null = null;
  selectedType = 'TODOS';
  sortBy: 'title' | 'points' | 'pages' = 'title';
  viewMode: 'books' | 'collections' = 'books';
  loading = false;
  errorMessage = '';
  private requestNumber = 0;

  constructor(
    public authService: AuthService,
    private bookService: BookService,
    private changeDetector: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) {}

  get visibleBooks(): Book[] {
    const query = this.normalize(this.query);
    const typeFilteredBooks = this.books.filter((book) => {
      const matchesType = this.selectedType === 'TODOS'
        || ((book.tipo ?? '').toUpperCase().includes(this.selectedType));
      const matchesQuery = !query || this.normalize(`${book.titulo} ${book.autor}`).includes(query);
      if (this.selectedType === 'GIBI') {
        return (book.tipo ?? '').toUpperCase().match(/GIBI|QUADRINHO/) !== null && matchesQuery;
      }
      return matchesType && matchesQuery;
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

  get bookCollections(): BookCollection[] {
    const collections = new Map<string, Book[]>();
    for (const book of this.visibleBooks) {
      const name = book.tipo?.trim() || 'Outras leituras';
      collections.set(name, [...(collections.get(name) ?? []), book]);
    }
    return [...collections].map(([name, books]) => ({ name, books }));
  }

  ngOnInit(): void {
    this.query = this.route.snapshot.queryParamMap.get('q')?.trim() ?? '';
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
        this.selectedBook = this.visibleBooks[0] ?? null;
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

  trackBook(_index: number, book: Book): number {
    return book.id;
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  }
}
