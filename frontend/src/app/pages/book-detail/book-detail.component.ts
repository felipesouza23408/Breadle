import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Book, BookService } from '../../services/book.service';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="book-detail-page">
      <header class="detail-topbar">
        <a routerLink="/books" class="back-to-books"><span aria-hidden="true">←</span> Voltar ao acervo</a>
        <a routerLink="/" class="detail-brand">BREADLE</a>
      </header>

      <p class="detail-state" *ngIf="loading" role="status">Carregando informações do livro...</p>
      <section class="detail-state error" *ngIf="!loading && errorMessage" role="alert">
        <p>{{ errorMessage }}</p>
        <button type="button" (click)="loadBook()">Tentar novamente</button>
      </section>

      <ng-container *ngIf="!loading && book as currentBook">
        <section class="book-profile">
          <div class="profile-cover">
            <img *ngIf="currentBook.capaUrl" [src]="currentBook.capaUrl" [alt]="'Capa de ' + currentBook.titulo" />
            <div class="cover-art" *ngIf="!currentBook.capaUrl" aria-hidden="true">
              <span>{{ currentBook.tipo }}</span><strong>{{ currentBook.titulo }}</strong><small>{{ currentBook.autor }}</small>
            </div>
          </div>
          <div class="profile-copy">
            <span class="detail-eyebrow">{{ currentBook.tipo }} <span aria-hidden="true">·</span> {{ currentBook.origem }}</span>
            <h1>{{ currentBook.titulo }}</h1>
            <p class="byline">por <a [routerLink]="['/authors', currentBook.autor]">{{ currentBook.autor }}</a></p>
            <p class="profile-summary">{{ currentBook.sinopse || 'Não há uma sinopse disponível para esta obra.' }}</p>
            <div class="book-stats">
              <div><strong>{{ currentBook.totalPaginas | number }}</strong><span>páginas</span></div>
              <div><strong>{{ currentBook.dificuldade }}</strong><span>dificuldade</span></div>
              <div><strong>{{ currentBook.pontosConclusao | number }}</strong><span>pontos ao concluir</span></div>
            </div>
            <a *ngIf="authService.isAuthenticated(); else loginToRead" [routerLink]="['/books', currentBook.id, 'read']" class="start-reading">
              Começar a ler <span aria-hidden="true">→</span>
            </a>
            <ng-template #loginToRead><a routerLink="/login" class="start-reading">Entre para começar a ler</a></ng-template>
          </div>
        </section>

        <section class="book-description">
          <div>
            <span class="detail-eyebrow">Sobre a obra</span>
            <h2>Uma leitura no seu tempo</h2>
          </div>
          <p>{{ currentBook.sinopse || 'O acervo ainda não possui uma descrição editorial para esta obra.' }}</p>
          <a class="author-callout" [routerLink]="['/authors', currentBook.autor]">
            <span class="author-initial" aria-hidden="true">{{ currentBook.autor.charAt(0) }}</span>
            <span><small>Conheça também</small><strong>{{ currentBook.autor }}</strong></span>
            <span class="author-arrow" aria-hidden="true">→</span>
          </a>
        </section>
      </ng-container>
    </main>
  `,
})
export class BookDetailComponent implements OnInit {
  book: Book | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    public authService: AuthService,
    private bookService: BookService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadBook();
  }

  loadBook(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.loading = false;
      this.errorMessage = 'Este livro não foi encontrado no acervo.';
      this.changeDetector.markForCheck();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.bookService.getBook(id).subscribe({
      next: (book) => {
        this.book = book;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.book = null;
        this.loading = false;
        this.errorMessage = 'Não foi possível carregar este livro do acervo.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
