import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="login-shell">
      <section class="login-card">
        <div class="header">
          <span class="brand">Breadle</span>
          <h1>Entrar</h1>
        </div>

        <form (ngSubmit)="submit()">
          <label>
            <span>E-mail</span>
            <input type="email" [(ngModel)]="email" name="email" placeholder="seu@email.com" required />
          </label>

          <label>
            <span>Senha</span>
            <input type="password" [(ngModel)]="senha" name="senha" placeholder="••••••••" required />
          </label>

          <button type="submit" [disabled]="loading">{{ loading ? 'Entrando...' : 'Entrar' }}</button>
          <p class="hint" *ngIf="message">{{ message }}</p>
        </form>

        <a routerLink="/" class="back-link">← Voltar para a home</a>
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .login-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #101a2b, #1e2c48);
      }
      .login-card {
        width: min(420px, calc(100% - 2rem));
        background: rgba(255,255,255,0.95);
        border-radius: 1.2rem;
        padding: 2rem;
        box-shadow: 0 20px 60px rgba(12,17,30,0.35);
      }
      .brand {
        display: inline-block;
        background: #edf9f3;
        color: #1f7a5f;
        padding: 0.4rem 0.7rem;
        font-weight: 800;
        border-radius: 999px;
        margin-bottom: 1rem;
      }
      h1 { margin: 0 0 1rem; color: #172033; }
      form {
        display: grid;
        gap: 1rem;
      }
      label { display: grid; gap: 0.45rem; font-weight: 600; color: #24324e; }
      input {
        padding: 0.9rem 1rem;
        border-radius: 0.8rem;
        border: 1px solid #dfe5ee;
        font-size: 1rem;
      }
      button {
        width: 100%;
        border: none;
        padding: 0.95rem 1rem;
        border-radius: 0.8rem;
        background: #1f7a5f;
        color: white;
        font-weight: 700;
        cursor: pointer;
      }
      .back-link {
        display: inline-block;
        margin-top: 1rem;
        color: #1f7a5f;
        text-decoration: none;
        font-weight: 600;
      }
      .hint {
        margin: 0;
        color: #1f7a5f;
        font-weight: 600;
      }
    `,
  ],
})
export class LoginComponent {
  email = 'lucas@breadle.com';
  senha = '123456';
  loading = false;
  message = '';

  constructor(private authService: AuthService, private router: Router) {}

  submit(): void {
    this.loading = true;
    this.message = '';

    this.authService.login({ email: this.email, senha: this.senha }).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Login simulado realizado com sucesso!';
        this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.loading = false;
        this.message = 'Não foi possível entrar agora. Tente novamente.';
      },
    });
  }
}
