import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="home-shell">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Leitura gamificada • gratuita • inspiradora</span>
          <h1>Transforme a leitura em hábito, desafio e conquista.</h1>
          <p>
            O Breadle combina livros, rankings, missões, IA e ambiente educacional para
            ajudar pessoas e escolas a lerem mais com prazer.
          </p>
          <div class="actions">
            <a routerLink="/login" class="primary">Entrar</a>
            <a routerLink="/dashboard" class="secondary">Ver dashboard</a>
          </div>
          <ul class="feature-list">
            <li>Acervo gratuito em domínio público</li>
            <li>Pontos, conquistas e rankings</li>
            <li>Narração em áudio e suporte de IA</li>
          </ul>
        </div>

        <div class="hero-card">
          <div class="badge">MVP</div>
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
              <span>média por semana</span>
            </div>
            <div>
              <strong>3x</strong>
              <span>mais retorno</span>
            </div>
          </div>
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
        place-items: center;
        background: linear-gradient(135deg, #f5f7ff 0%, #edf7ef 100%);
      }
      .hero {
        width: min(1180px, calc(100% - 2rem));
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 2rem;
        align-items: center;
      }
      .hero-copy {
        padding: 2rem 0;
      }
      .eyebrow {
        display: inline-block;
        background: #e7f5ff;
        color: #0f4c81;
        padding: 0.5rem 0.75rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      h1 {
        font-size: clamp(2.5rem, 4vw, 4.5rem);
        line-height: 1.05;
        color: #172033;
        margin: 1rem 0;
      }
      p {
        color: #42506a;
        font-size: 1.08rem;
        max-width: 560px;
      }
      .actions {
        display: flex;
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
        padding: 0.9rem 1.4rem;
        transition: transform 0.2s ease;
      }
      .primary {
        background: #1f7a5f;
        color: white;
      }
      .secondary {
        background: white;
        border: 1px solid #dce5ee;
        color: #172033;
      }
      .actions a:hover { transform: translateY(-2px); }
      .feature-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.7rem;
        color: #24324e;
      }
      .feature-list li::before {
        content: '✓';
        color: #1f7a5f;
        margin-right: 0.6rem;
        font-weight: 700;
      }
      .hero-card {
        background: #172033;
        border-radius: 1.5rem;
        padding: 1.25rem;
        box-shadow: 0 20px 50px rgba(22, 27, 45, 0.18);
      }
      .badge {
        display: inline-block;
        background: rgba(76, 175, 125, 0.18);
        color: #8fe0b3;
        padding: 0.45rem 0.65rem;
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
        grid-template-columns: repeat(2, minmax(100px, 1fr));
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
        font-size: 1.6rem;
      }
      .stat-grid span {
        color: rgba(255,255,255,0.72);
      }
      @media (max-width: 900px) {
        .hero { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class HomeComponent {}
