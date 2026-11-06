import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Book, BookService } from '../../services/book.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="home-page">
      <section class="home-hero">
        <div class="hero-copy">
          <span class="home-eyebrow">Um livro de cada vez</span>
          <h1>Faça da leitura um lugar para voltar.</h1>
          <p>
            Descubra obras, acompanhe seu progresso e encontre uma rotina de leitura que caiba no seu dia.
            No Breadle, cada passo é seu.
          </p>
          <div class="hero-actions">
            <a routerLink="/books" class="home-primary">Explorar livros <span aria-hidden="true">→</span></a>
            <a routerLink="/login" class="home-secondary">Já tenho uma conta</a>
          </div>
          <ul class="home-benefits">
            <li>Obras disponíveis sem custo</li>
            <li>Progresso e metas acompanhados pelo sistema</li>
            <li>Recursos de leitura e apoio à compreensão</li>
          </ul>
        </div>

        <aside class="hero-note">
          <span class="note-symbol" aria-hidden="true">✦</span>
          <span class="note-label">Seu próximo capítulo</span>
          <h2>Descubra uma história no seu ritmo.</h2>
          <p>Escolha uma obra do acervo e continue de onde parou quando quiser.</p>
          <a routerLink="/books">Ver o acervo <span aria-hidden="true">→</span></a>
        </aside>
      </section>

      <section class="home-books" aria-labelledby="featured-heading">
        <div class="home-section-heading">
          <div>
            <span class="home-eyebrow">Leituras disponíveis</span>
            <h2 id="featured-heading">Encontre sua próxima leitura</h2>
          </div>
          <a routerLink="/books" class="all-books-link">Ver todos os livros <span aria-hidden="true">→</span></a>
        </div>

        <p class="home-feedback" *ngIf="booksError" role="alert">
          {{ booksError }}
          <button type="button" (click)="loadFeaturedBooks()">Tentar novamente</button>
        </p>

        <div class="featured-grid" *ngIf="!booksError && featuredBooks.length; else bookPlaceholder">
          <a class="featured-book" *ngFor="let book of featuredBooks; trackBy: trackBook" [routerLink]="['/books', book.id]">
            <div class="book-cover" [class.has-cover]="book.capaUrl">
              <img *ngIf="book.capaUrl" [src]="book.capaUrl" [alt]="'Capa de ' + book.titulo" loading="lazy" />
              <div *ngIf="!book.capaUrl" class="cover-placeholder" aria-hidden="true">
                <span>{{ book.tipo }}</span><strong>{{ book.titulo }}</strong><small>{{ book.autor }}</small>
              </div>
            </div>
            <div class="featured-book-info">
              <span class="book-category">{{ book.tipo }}</span>
              <h3>{{ book.titulo }}</h3>
              <p>{{ book.autor }}</p>
              <span class="book-meta">{{ book.totalPaginas | number }} páginas <span aria-hidden="true">·</span> {{ book.pontosConclusao | number }} pts ao concluir</span>
            </div>
          </a>
        </div>

        <ng-template #bookPlaceholder>
          <div class="featured-grid skeleton-grid" *ngIf="loadingBooks" role="status" aria-label="Carregando livros">
            <div class="book-skeleton" *ngFor="let slot of skeletonSlots">
              <span></span><i></i><i></i>
            </div>
          </div>
          <p class="empty-books" *ngIf="!loadingBooks && !booksError && !featuredBooks.length">
            Ainda não há obras disponíveis no acervo. Volte em breve para descobrir novas leituras.
          </p>
        </ng-template>
      </section>

      <section class="home-features" aria-labelledby="features-heading">
        <div class="home-section-heading">
          <div><span class="home-eyebrow">Uma experiência completa</span><h2 id="features-heading">Leia com propósito e no seu tempo</h2></div>
        </div>
        <div class="feature-grid">
          <article class="feature-card">
            <span class="feature-icon" aria-hidden="true">▤</span>
            <h3>Um acervo para descobrir</h3>
            <p>Explore obras disponíveis para leitura e veja os detalhes antes de começar.</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon" aria-hidden="true">✦</span>
            <h3>Progresso que acompanha você</h3>
            <p>Seu avanço, suas metas e suas conquistas são registrados pelo Breadle.</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon" aria-hidden="true">◎</span>
            <h3>Leitura em comunidade</h3>
            <p>Participe de grupos de leitura e compartilhe a jornada com outras pessoas.</p>
          </article>
        </div>
      </section>
    </main>
  `,
})
export class HomeComponent implements OnInit {
  featuredBooks: Book[] = [];
  loadingBooks = true;
  booksError = '';
  readonly skeletonSlots = [0, 1, 2];

  constructor(
    private authService: AuthService,
    private router: Router,
    private bookService: BookService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/dashboard');
      return;
    }
    this.loadFeaturedBooks();
  }

  loadFeaturedBooks(): void {
    this.loadingBooks = true;
    this.booksError = '';
    this.bookService.getBooks().subscribe({
      next: (books) => {
        this.featuredBooks = books.slice(0, 3);
        this.loadingBooks = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.featuredBooks = [];
        this.loadingBooks = false;
        this.booksError = 'Não foi possível carregar as leituras agora.';
        this.changeDetector.markForCheck();
      },
    });
  }

  trackBook(_index: number, book: Book): number {
    return book.id;
  }
}
