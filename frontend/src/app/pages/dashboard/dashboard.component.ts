import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="dashboard">
      <header class="topbar">
        <div>
          <span class="brand">Breadle</span>
          <h1>Dashboard do leitor</h1>
        </div>
        <a routerLink="/" class="home-link">Home</a>
      </header>

      <section class="cards">
        <article class="card highlight">
          <span>Pontos totais</span>
          <strong>1.280</strong>
          <small>+230 esta semana</small>
        </article>
        <article class="card">
          <span>Livros lidos</span>
          <strong>7</strong>
          <small>meta: 10</small>
        </article>
        <article class="card">
          <span>Missões</span>
          <strong>4/6</strong>
          <small>2 em andamento</small>
        </article>
        <article class="card">
          <span>Ranking</span>
          <strong>#12</strong>
          <small>Brasil</small>
        </article>
      </section>

      <section class="content-grid">
        <article class="panel">
          <h2>Progresso da semana</h2>
          <div class="bar-group">
            <div class="bar-row"><label>Leitura</label><div class="bar"><span style="width: 74%"></span></div></div>
            <div class="bar-row"><label>Questões</label><div class="bar"><span style="width: 61%"></span></div></div>
            <div class="bar-row"><label>Meta de páginas</label><div class="bar"><span style="width: 88%"></span></div></div>
          </div>
        </article>

        <article class="panel">
          <h2>Próximas conquistas</h2>
          <ul class="achievement-list">
            <li>Leitor constante — 3 dias seguidos</li>
            <li>Explorador — 5 livros lidos</li>
            <li>Rumo ao topo — 500 pontos em rankings</li>
          </ul>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .dashboard {
        min-height: 100vh;
        background: #f6f8fc;
        padding: 2rem;
        color: #172033;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
      }
      .brand {
        display: inline-block;
        background: #ebf9f2;
        color: #1f7a5f;
        padding: 0.4rem 0.75rem;
        border-radius: 999px;
        font-weight: 800;
      }
      h1 { margin: 0.8rem 0 0; }
      .home-link {
        color: #172033;
        text-decoration: none;
        font-weight: 700;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: 1rem;
      }
      .card {
        background: white;
        border-radius: 1rem;
        padding: 1.2rem;
        box-shadow: 0 10px 30px rgba(23,32,51,0.05);
      }
      .card.highlight { background: linear-gradient(135deg, #1f7a5f, #2c8b6d); color: white; }
      .card span, .card small { display: block; color: inherit; opacity: 0.8; }
      .card strong { display: block; font-size: 2rem; margin: 0.4rem 0; }
      .content-grid {
        margin-top: 2rem;
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 1rem;
      }
      .panel {
        background: white;
        border-radius: 1rem;
        padding: 1.25rem;
        box-shadow: 0 10px 30px rgba(23,32,51,0.04);
      }
      .bar-group { display: grid; gap: 1rem; }
      .bar-row { display: grid; gap: 0.5rem; }
      .bar { height: 10px; background: #edf0f5; border-radius: 999px; overflow: hidden; }
      .bar span { display: block; height: 100%; background: linear-gradient(90deg, #1f7a5f, #7cc6a4); border-radius: inherit; }
      .achievement-list { margin: 1rem 0 0; padding-left: 1.1rem; display: grid; gap: 0.8rem; }
      @media (max-width: 900px) {
        .cards, .content-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class DashboardComponent {}
