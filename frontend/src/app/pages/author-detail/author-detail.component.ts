import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Book, BookService } from '../../services/book.service';

@Component({
  selector: 'app-author-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="author-detail-page">
      <header class="author-topbar">
        <a routerLink="/books" class="back-to-books"><span aria-hidden="true">←</span> Voltar ao acervo</a>
        <a routerLink="/" class="detail-brand">BREADLE</a>
      </header>

      <p class="author-state" *ngIf="loading" role="status">Carregando informações do autor...</p>
      <section class="author-state error" *ngIf="!loading && errorMessage" role="alert">
        <p>{{ errorMessage }}</p>
        <a routerLink="/books" class="author-action">Voltar ao acervo</a>
      </section>

      <ng-container *ngIf="!loading && !errorMessage">
        <section class="author-profile">
          <div class="author-monogram" aria-hidden="true">{{ authorName.charAt(0) }}</div>
          <div>
            <span class="detail-eyebrow">AUTOR(A)</span>
            <h1>{{ authorName }}</h1>
            <p class="author-biography">{{ biography }}</p>
            <p class="author-count">{{ books.length }} {{ books.length === 1 ? 'obra disponível' : 'obras disponíveis' }} no acervo</p>
          </div>
        </section>

        <section class="author-works">
          <div class="works-heading">
            <div><span class="detail-eyebrow">NA BIBLIOTECA</span><h2>Obras no acervo</h2></div>
            <span>{{ books.length }}</span>
          </div>
          <p class="author-state" *ngIf="!books.length">Ainda não há obras deste autor no acervo.</p>
          <div class="works-grid" *ngIf="books.length">
            <article class="author-work" *ngFor="let book of books">
              <div class="work-cover">
                <img *ngIf="book.capaUrl" [src]="book.capaUrl" [alt]="'Capa de ' + book.titulo" loading="lazy" />
                <div *ngIf="!book.capaUrl" class="cover-art" aria-hidden="true">
                  <span>{{ book.tipo }}</span><strong>{{ book.titulo }}</strong>
                </div>
              </div>
              <div class="work-info">
                <span class="detail-eyebrow">{{ book.tipo }}</span>
                <h3>{{ book.titulo }}</h3>
                <p>{{ book.totalPaginas | number }} páginas <span aria-hidden="true">·</span> {{ book.pontosConclusao | number }} pontos ao concluir</p>
                <a [routerLink]="['/books', book.id]" class="author-action">Ver descrição <span aria-hidden="true">→</span></a>
              </div>
            </article>
          </div>
        </section>
      </ng-container>
    </main>
  `,
})
export class AuthorDetailComponent implements OnInit {
  authorName = '';
  biography = '';
  books: Book[] = [];
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private bookService: BookService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.authorName = this.route.snapshot.paramMap.get('name')?.trim() ?? '';
    if (!this.authorName) {
      this.loading = false;
      this.errorMessage = 'Não foi possível identificar este autor.';
      return;
    }

    this.bookService.getBooks().subscribe({
      next: (allBooks) => {
        const normalizedAuthor = this.normalize(this.authorName);
        this.books = allBooks.filter((book) => this.normalize(book.autor) === normalizedAuthor);
        this.authorName = this.books[0]?.autor ?? this.authorName;
        this.biography = this.getBiography(this.authorName);
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Não foi possível carregar as informações deste autor.';
        this.changeDetector.markForCheck();
      },
    });
  }

  private getBiography(author: string): string {
    const biographies: Record<string, string> = {
      'bram stoker': 'Abraham “Bram” Stoker (1847–1912) foi um escritor irlandês. Seu romance Drácula, publicado em 1897, tornou-se uma das obras mais conhecidas da literatura gótica.',
      'mary wollstonecraft shelley': 'Mary Wollstonecraft Shelley (1797–1851) foi uma escritora inglesa. Frankenstein, publicado em 1818, é considerado um marco da ficção científica e explora responsabilidade, criação e pertencimento.',
      'mary shelley': 'Mary Wollstonecraft Shelley (1797–1851) foi uma escritora inglesa. Frankenstein, publicado em 1818, é considerado um marco da ficção científica e explora responsabilidade, criação e pertencimento.',
      'william shakespeare': 'William Shakespeare (1564–1616) foi um dramaturgo e poeta inglês. Suas peças e poemas continuam sendo lidos e encenados em todo o mundo.',
    };
    return biographies[this.normalize(author)]
      ?? 'O Breadle ainda não tem uma biografia editorial verificada para este autor. Aqui você pode consultar as obras dele disponíveis no acervo.';
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
  }
}
