import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Book, BookService } from '../../services/book.service';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="detail-shell" *ngIf="book; else loading">
      <header class="topbar">
        <div>
          <span class="brand">Breadle</span>
          <h1>{{ book.titulo }}</h1>
        </div>
        <nav class="nav">
          <a routerLink="/books">Voltar ao acervo</a>
          <a *ngIf="authService.isAuthenticated()" routerLink="/dashboard">Dashboard</a>
        </nav>
      </header>

      <section class="detail-card">
        <div class="cover" [ngClass]="book.tipo.toLowerCase()">
          <span>{{ book.titulo.slice(0, 1) }}</span>
        </div>

        <div class="meta-block">
          <a class="author" [routerLink]="['/authors', book.autor]">Conheça {{ book.autor }}</a>
          <p class="type">{{ book.tipo }} • {{ book.origem }}</p>
          <p class="synopsis">{{ book.sinopse || 'Sem sinopse disponível.' }}</p>
          <div class="stats">
            <span>{{ book.totalPaginas }} páginas</span>
            <span>{{ book.pontosConclusao | number }} pts ao concluir</span>
            <span>Dificuldade {{ book.dificuldade }}</span>
          </div>
          <a *ngIf="authService.isAuthenticated(); else lockedRead" [routerLink]="['/books', book.id, 'read']" class="read-button">Começar leitura</a>
          <ng-template #lockedRead>
            <a routerLink="/login" class="read-button secondary">Entre para ler</a>
          </ng-template>
        </div>
      </section>
    </main>

    <ng-template #loading>
      <main class="detail-shell">
        <p class="loading-state" *ngIf="loading" role="status">Carregando livro...</p>
        <section class="loading-state" *ngIf="!loading && errorMessage" role="alert">
          <p>{{ errorMessage }}</p>
          <button type="button" class="read-button" (click)="loadBook()">Tentar novamente</button>
        </section>
      </main>
    </ng-template>
  `,
  styles: [
    `
      :host { display: block; }
      .detail-shell {
        min-height: 100vh;
        background: radial-gradient(circle at top left, rgba(214,169,74,0.14), transparent 25%),
                    linear-gradient(180deg, #f8f4ee 0%, #edf1f5 100%);
        padding: 2rem;
        color: #172033;
      }
      .topbar, .nav { display: flex; align-items: center; justify-content: space-between; }
      .nav { gap: 1rem; }
      .nav a { color: #172033; text-decoration: none; font-weight: 700; }
      .brand {
        display: inline-block;
        background: rgba(214,169,74,0.12);
        color: #2b3b58;
        padding: 0.42rem 0.8rem;
        border-radius: 999px;
        border: 1px solid rgba(214,169,74,0.2);
        font-weight: 800;
      }
      h1 { margin: 0.8rem 0 0; color: #1b2c45; }
      .detail-card {
        margin-top: 2rem;
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(22,35,48,0.05);
        border-radius: 1.4rem;
        box-shadow: 0 14px 30px rgba(23,32,51,0.08);
        padding: 1.5rem;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 2rem;
      }
      .cover {
        min-height: 280px; display: grid; place-items: center; border-radius: 1.2rem; font-size: 3rem; color: white; font-weight: 800;
      }
      .cover.literatura { background: linear-gradient(135deg, #213857, #4e7093); }
      .cover.gibi { background: linear-gradient(135deg, #d1954c, #f1cf8a); color: #1b2c45; }
      .cover.default { background: linear-gradient(135deg, #304f42, #5f8d75); }
      .author { font-size: 1.3rem; font-weight: 700; margin: 0; }
      a.author { display: inline-block; color: #ffe18a; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .2rem; }
      a.author:hover { color: #fff2c6; }
      .type { color: #4d677d; font-weight: 600; }
      .synopsis { color: #42506a; line-height: 1.7; }
      .stats { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; font-weight: 700; color: #2b3b58; }
      .read-button {
        display: inline-block;
        background: linear-gradient(135deg, #1d2b42, #2d486d);
        color: white;
        padding: 0.9rem 1.2rem;
        border-radius: 0.9rem;
        font-weight: 800;
        cursor: pointer;
        text-decoration: none;
      }
      .read-button.secondary {
        background: linear-gradient(135deg, #d9ad39, #f1d779);
        color: #17130b;
      }
      .loading-state { padding: 2rem; text-align: center; }
      .loading-state { color: #f3f0f8; background: #17171c; border-radius: .8rem; }
      .detail-shell {
        background: radial-gradient(ellipse at 95% 0%, rgba(37,46,224,.2), transparent 28rem), #08080b;
        color: #f3f0f8;
      }
      .detail-shell h1 { color: #fff; }
      .detail-shell .nav a { color: #d7d1de; }
      .detail-shell .brand { color: #f1d779; background: rgba(217,173,57,.12); border-color: rgba(217,173,57,.28); }
      .detail-card { color: #f3f0f8; background: #151519; border-color: rgba(255,255,255,.09); box-shadow: 0 18px 40px rgba(0,0,0,.3); }
      .detail-card .type { color: #f1d779; }
      .detail-card .synopsis { color: #c8c3ce; }
      .detail-card .stats { color: #e6d58f; }
      .detail-card .author { margin: 0; }
      .read-button { background: linear-gradient(135deg, #1717ca, #343ff3); }
      .loading-state { color: #f3f0f8; background: #17171c; }
      @media (max-width: 760px) { .detail-card { grid-template-columns: 1fr; } }
    `,
  ],
})
export class BookDetailComponent implements OnInit {
  book: Book | null = null;
  loading = true;
  errorMessage = '';

  constructor(private route: ActivatedRoute, private router: Router, public authService: AuthService, private bookService: BookService, private changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadBook();
  }

  loadBook(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
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
