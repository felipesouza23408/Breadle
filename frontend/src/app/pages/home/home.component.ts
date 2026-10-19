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
    <main class="home-shell">
      <section class="hero">
        <div class="hero-copy">
          <div class="brand-lockup" aria-label="Breadle logo">
            <span class="brand-mark" aria-hidden="true">
              <span class="page page-one"></span>
              <span class="page page-two"></span>
              <span class="page page-three"></span>
            </span>
            <span class="brand-name">BREADLE</span>
          </div>

          <span class="eyebrow">Leitura gamificada • tranquila • inspiradora</span>
          <h1>Transforme a leitura em hábito, desafio e conquista.</h1>
          <p>
            O Breadle combina livros, rankings, missões, IA e ambiente educacional para ajudar
            pessoas e escolas a lerem mais com prazer, calma e consistência.
          </p>
          <div class="actions">
            <a routerLink="/login" class="primary">Entrar</a>
            <a routerLink="/books" class="secondary">Ver acervo</a>
          </div>
          <ul class="feature-list">
            <li>Acervo gratuito em domínio público</li>
            <li>Pontos, conquistas e rankings</li>
            <li>Narração em áudio e suporte de IA</li>
          </ul>
        </div>

        <div class="hero-card">
          <div class="badge">Leitura refinada</div>
          <h2>Em destaque</h2>
          <div class="stat-grid">
            <div>
              <strong>+42%</strong>
              <span>engajamento</span>
            </div>
            <div>
              <strong>18k</strong>
              <span>sessões</span>
            </div>
            <div>
              <strong>6.4h</strong>
              <span>média semanal</span>
            </div>
            <div>
              <strong>3x</strong>
              <span>mais retorno</span>
            </div>
          </div>
        </div>
      </section>

      <section class="featured-books">
        <div class="section-header">
          <span class="mini-label">Acervo em destaque</span>
          <h3>Descubra leituras que encaixam no seu ritmo</h3>
        </div>

        <div class="book-grid" *ngIf="featuredBooks.length; else loadingBooks">
          <article class="book-card" *ngFor="let book of featuredBooks">
            <div class="book-cover" [attr.aria-label]="book.titulo">
              <span>{{ book.titulo.charAt(0) }}</span>
            </div>
            <div class="book-info">
              <span class="book-tag">{{ book.origem === 'DOMINIO_PUBLICO' ? 'Domínio público' : 'Coleção' }}</span>
              <h4>{{ book.titulo }}</h4>
              <p>{{ book.autor }}</p>
              <small>{{ book.totalPaginas }} páginas • {{ book.pontuacaoBase }} pts</small>
            </div>
          </article>
        </div>

        <ng-template #loadingBooks>
          <div class="book-grid empty-state">
            <div class="book-card placeholder-card">
              <div class="book-cover placeholder-cover">…</div>
              <div class="book-info">
                <span class="book-tag">Carregando</span>
                <h4>Preparando leituras</h4>
                <p>Acervo em atualização</p>
              </div>
            </div>
          </div>
        </ng-template>
      </section>

      <section class="feature-strip">
        <div class="section-header">
          <span class="mini-label">Por que Breadle?</span>
          <h3>Leitura com calma, propósito e progresso.</h3>
        </div>

        <div class="feature-cards">
          <article class="feature-card">
            <span class="icon">📖</span>
            <h4>Acervo cuidadoso</h4>
            <p>Livros em domínio público selecionados para manter a experiência acessível e rica.</p>
          </article>
          <article class="feature-card">
            <span class="icon">🏆</span>
            <h4>Motivação leve</h4>
            <p>Pontos, rankings e missões transformam a leitura em rotina sem perder a suavidade.</p>
          </article>
          <article class="feature-card">
            <span class="icon">🎓</span>
            <h4>Ambiente escolar</h4>
            <p>Professores acompanham progresso, metas e engajamento com clareza e sem peso.</p>
          </article>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .home-shell {
        min-height: 100vh;
        display: grid;
        gap: 2rem;
        place-items: center;
        background:
          radial-gradient(ellipse at 92% 15%, rgba(56, 67, 255, .38), transparent 32rem),
          linear-gradient(110deg, #030305 0%, #090a15 57%, #1717cc 100%);
        color: #f7f4ee;
        padding: 2rem 0 3.5rem;
      }
      .hero {
        width: min(1180px, calc(100% - 2rem));
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 2rem;
        align-items: center;
        padding-top: 1rem;
      }
      .hero-copy { padding: 2rem 0; }
      .brand-lockup {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }
      .brand-mark {
        position: relative;
        display: block;
        width: 120px;
        height: 90px;
      }
      .page {
        position: absolute;
        display: block;
        width: 82px;
        height: 52px;
        border: 3px solid var(--breadle-gold);
        border-radius: 12px 12px 0 0;
        border-bottom: none;
        background: rgba(214, 169, 74, 0.02);
        transform-origin: center;
      }
      .page-one {
        left: 12px;
        top: 18px;
        transform: rotate(-18deg);
        border-color: rgba(214, 169, 74, 0.95);
        box-shadow: inset 0 0 0 1px rgba(214,169,74,0.2);
      }
      .page-two {
        left: 22px;
        top: 12px;
        transform: rotate(-10deg);
        border-color: rgba(214, 169, 74, 0.9);
      }
      .page-three {
        left: 32px;
        top: 6px;
        transform: rotate(-2deg);
        border-color: rgba(214, 169, 74, 0.9);
      }
      .brand-name {
        font-size: clamp(2.3rem, 4vw, 5rem);
        letter-spacing: 0.08em;
        font-weight: 700;
        color: #f4efe8;
      }
      .eyebrow {
        display: inline-block;
        background: rgba(241, 210, 143, 0.18);
        color: var(--breadle-gold-soft);
        border: 1px solid rgba(241, 210, 143, 0.25);
        padding: 0.55rem 0.8rem;
        border-radius: 999px;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      h1 {
        max-width: 620px;
        font-size: clamp(2.6rem, 4vw, 4.6rem);
        line-height: 1.04;
        color: #f9f6f2;
        margin: 1.1rem 0 1rem;
      }
      p {
        max-width: 560px;
        color: rgba(255,255,255,0.8);
        font-size: 1.08rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin: 2rem 0 1.5rem;
      }
      .primary, .secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        font-weight: 700;
        border-radius: 0.9rem;
        padding: 0.95rem 1.4rem;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .primary {
        background: linear-gradient(135deg, var(--breadle-gold), #f6d98a);
        color: #1f2436;
        box-shadow: 0 10px 22px rgba(214, 169, 74, 0.35);
      }
      .secondary {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        color: #f9f6f2;
      }
      .actions a:hover { transform: translateY(-2px); }
      .feature-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.7rem;
        color: rgba(255,255,255,0.9);
      }
      .feature-list li::before {
        content: '✓';
        color: var(--breadle-gold-soft);
        margin-right: 0.6rem;
        font-weight: 700;
      }
      .hero-card {
        background: rgba(133, 133, 151, 0.18);
        border: 1px solid rgba(255,255,255,0.14);
        backdrop-filter: blur(16px);
        border-radius: 1.25rem;
        padding: 1.4rem;
        box-shadow: 0 20px 50px rgba(3, 7, 17, 0.35);
      }
      .badge {
        display: inline-block;
        background: rgba(214, 169, 74, 0.16);
        color: var(--breadle-gold-soft);
        border: 1px solid rgba(214, 169, 74, 0.35);
        padding: 0.45rem 0.7rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
      }
      h2 {
        color: white;
        margin: 1rem 0 1.5rem;
      }
      .stat-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(110px, 1fr));
        gap: 1rem;
      }
      .stat-grid div {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1rem;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .stat-grid strong {
        color: white;
        font-size: 1.8rem;
      }
      .stat-grid span {
        color: rgba(255,255,255,0.7);
      }
      .featured-books,
      .feature-strip {
        width: min(1180px, calc(100% - 2rem));
        background: rgba(15,15,21,.72);
        border: 1px solid rgba(255,255,255,0.08);
        backdrop-filter: blur(14px);
        border-radius: 1.2rem;
        padding: 2rem;
        box-shadow: 0 24px 45px rgba(2, 7, 17, 0.25);
      }
      .section-header {
        margin-bottom: 1.5rem;
      }
      .mini-label {
        display: inline-block;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.72rem;
        font-weight: 800;
        color: var(--breadle-gold-soft);
      }
      h3 {
        margin: 0.7rem 0 0;
        font-size: clamp(1.8rem, 3vw, 2.6rem);
        color: #f9f6f2;
      }
      .book-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 1rem;
      }
      .book-card {
        display: flex;
        gap: 1rem;
        align-items: center;
        padding: 1rem;
        border-radius: 1.2rem;
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .book-cover {
        width: 64px;
        height: 88px;
        border-radius: 0.9rem;
        display: grid;
        place-items: center;
        background: linear-gradient(180deg, #d9ad39 0%, #9b6e18 100%);
        color: #1f2436;
        font-size: 2rem;
        font-weight: 800;
        box-shadow: inset 0 0 0 1px rgba(31, 36, 54, 0.18);
      }
      .placeholder-cover {
        background: rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.74);
      }
      .book-info {
        flex: 1;
        min-width: 0;
      }
      .book-tag {
        display: inline-block;
        margin-bottom: 0.4rem;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        font-size: 0.64rem;
        font-weight: 800;
        color: var(--breadle-gold-soft);
      }
      .book-card h4 {
        margin: 0;
        color: white;
        font-size: 1.1rem;
      }
      .book-card p,
      .book-card small {
        margin: 0.35rem 0 0;
        color: rgba(255,255,255,0.72);
      }
      .feature-cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 1rem;
      }
      .feature-card {
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.2rem;
        padding: 1.4rem;
      }
      .icon {
        display: inline-grid;
        place-items: center;
        width: 3rem;
        height: 3rem;
        border-radius: 0.9rem;
        background: rgba(214,169,74,0.12);
        font-size: 1.5rem;
      }
      .feature-card h4 {
        margin: 1rem 0 0.55rem;
        color: white;
        font-size: 1.2rem;
      }
      .feature-card p {
        margin: 0;
        color: rgba(255,255,255,0.74);
        line-height: 1.6;
      }
      @media (max-width: 900px) {
        .hero {
          grid-template-columns: 1fr;
          padding-top: 1.25rem;
        }
        .book-grid,
        .feature-cards {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class HomeComponent implements OnInit {
  featuredBooks: Book[] = [];

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

    this.bookService.getBooks().subscribe({
      next: (books) => {
        this.featuredBooks = books.slice(0, 3);
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.featuredBooks = [];
        this.changeDetector.markForCheck();
      },
    });
  }
}
