import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Book, BookService } from '../../services/book.service';

@Component({
  selector: 'app-author-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="author-shell">
      <header class="topbar">
        <a routerLink="/books" class="back-link">← Voltar ao acervo</a>
        <span class="brand">Breadle · Autores</span>
      </header>

      <p class="loading-state" *ngIf="loading" role="status">Carregando informações do autor...</p>
      <section class="error-state" *ngIf="!loading && errorMessage" role="alert">
        <p>{{ errorMessage }}</p>
        <a routerLink="/books" class="action-link">Voltar ao acervo</a>
      </section>

      <ng-container *ngIf="!loading && !errorMessage">
        <section class="author-card">
          <span class="eyebrow">AUTOR(A)</span>
          <h1>{{ authorName }}</h1>
          <p class="biography">{{ biography }}</p>
          <p class="catalog-count">
            {{ books.length }} {{ books.length === 1 ? 'obra disponível no acervo' : 'obras disponíveis no acervo' }}
          </p>
        </section>

        <section class="works-section">
          <h2>Obras no acervo</h2>
          <p class="empty-state" *ngIf="!books.length">Ainda não há obras deste autor no acervo.</p>
          <div class="works-grid" *ngIf="books.length">
            <article class="work-card" *ngFor="let book of books">
              <div class="work-info">
                <span class="work-type">{{ book.tipo }}</span>
                <h3>{{ book.titulo }}</h3>
                <p>{{ book.totalPaginas | number }} páginas · {{ book.pontosConclusao | number }} pts ao concluir</p>
              </div>
              <a [routerLink]="['/books', book.id]" class="action-link">Ver descrição</a>
            </article>
          </div>
        </section>
      </ng-container>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .author-shell { min-height: 100vh; padding: 2rem; color: #f5f3f8; background: radial-gradient(ellipse at 95% 0%,rgba(37,46,224,.2),transparent 28rem),#08080b; }
    .topbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .back-link { color: #f4f0f9; font-weight: 700; text-decoration: underline; text-underline-offset: .2rem; }
    .brand { padding: .45rem .75rem; border: 1px solid rgba(217,173,57,.32); border-radius: 999px; color: #ffe18a; background: rgba(217,173,57,.12); font-weight: 800; }
    .author-card,.work-card,.loading-state,.error-state { border: 1px solid rgba(255,255,255,.1); border-radius: 1.2rem; background: #151519; box-shadow: 0 16px 34px rgba(0,0,0,.28); }
    .author-card { padding: clamp(1.4rem,4vw,2.5rem); }
    .eyebrow,.work-type { color: #ffe18a; font-size: .76rem; font-weight: 800; letter-spacing: .1em; }
    h1 { margin: .6rem 0; color: #fff; font-size: clamp(2rem,6vw,3.2rem); }
    .biography { max-width: 70ch; color: #e0dce6; font-size: 1.08rem; line-height: 1.75; }
    .catalog-count { color: #c7c2d0; font-weight: 700; }
    .works-section { margin-top: 2rem; }
    h2 { color: #fff; }
    .works-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%, 300px),1fr)); gap: 1rem; margin-top: 1rem; }
    .work-card { display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; padding: 1.2rem; }
    .work-info h3 { margin: .45rem 0; color: #fff; }
    .work-info p,.empty-state { color: #d0ccd6; }
    .action-link { align-self: flex-start; display: inline-block; padding: .7rem 1rem; border-radius: .75rem; color: #fff; background: #2929c9; font-weight: 800; text-decoration: none; }
    .action-link:hover { background: #4545ef; }
    .loading-state,.error-state { margin: 1rem 0; padding: 1.3rem; color: #f5f3f8; }
    @media (max-width: 600px) { .author-shell { padding: 1rem; } .topbar { align-items: flex-start; flex-direction: column; } }
  `],
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
