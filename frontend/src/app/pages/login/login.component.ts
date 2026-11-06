import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="login-shell">
      <section class="login-card">
        <div class="header">
          <div class="brand-lockup" aria-label="Breadle logo">
            <span class="brand-mark" aria-hidden="true">
              <span class="page page-one"></span>
              <span class="page page-two"></span>
              <span class="page page-three"></span>
            </span>
            <span class="brand-name">BREADLE</span>
          </div>
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

          <a routerLink="/forgot-password" class="forgot-link">Esqueci minha senha</a>
          <button type="submit" [disabled]="loading">{{ loading ? 'Entrando...' : 'Entrar' }}</button>
          <p class="hint" *ngIf="message" role="status" aria-live="polite">{{ message }}</p>
        </form>

        <div class="footer-links">
          <a routerLink="/register" class="secondary-link">Criar conta</a>
          <a routerLink="/" class="back-link">← Home</a>
        </div>
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
        background:
          radial-gradient(ellipse at 82% 18%, rgba(84, 42, 168, .28), transparent 34rem),
          radial-gradient(ellipse at 12% 100%, rgba(255, 217, 0, .07), transparent 28rem),
          #000;
        padding: 2rem 1rem;
      }
      .login-card {
        width: min(440px, 100%);
        background: #1f1f1f;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 1.2rem;
        padding: 2rem clamp(1.25rem, 5vw, 2.5rem);
        box-shadow: 0 24px 70px rgba(0,0,0,.48);
      }
      .header {
        margin-bottom: 1.2rem;
        text-align: center;
      }
      .brand-lockup {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        margin-bottom: 1rem;
      }
      .brand-mark { position: relative; display: block; width: 84px; height: 66px; }
      .page {
        position: absolute;
        display: block;
        width: 62px;
        height: 38px;
        border: 3px solid var(--breadle-gold);
        border-bottom: none;
        border-radius: 10px 10px 0 0;
        background: rgba(214,169,74,0.03);
      }
      .page-one { left: 9px; top: 14px; transform: rotate(-16deg); }
      .page-two { left: 15px; top: 10px; transform: rotate(-8deg); }
      .page-three { left: 22px; top: 6px; transform: rotate(-1deg); }
      .brand-name {
        font-size: clamp(1.8rem, 7vw, 2.45rem);
        letter-spacing: 0.04em;
        color: var(--breadle-text);
        font-weight: 700;
      }
      h1 { margin: 0 0 1.2rem; color: var(--breadle-text); font-size: clamp(1.8rem, 2vw, 2.3rem); }
      form {
        display: grid;
        gap: 1rem;
      }
      label { display: grid; gap: 0.45rem; font-weight: 600; color: var(--breadle-text-secondary); }
      input {
        min-height: 2.9rem;
        padding: 0.75rem 1rem;
        border-radius: var(--breadle-radius-small);
        border: 1px solid rgba(255,255,255,.16);
        font-size: 1rem;
        color: var(--breadle-text);
        background: #2a2a2a;
      }
      input::placeholder { color: var(--breadle-text-muted); }
      input:focus { outline: 2px solid var(--breadle-gold); outline-offset: 1px; }
      button {
        width: 100%;
        min-height: 2.9rem;
        border: 1px solid transparent;
        padding: 0.75rem 1rem;
        border-radius: 999px;
        background: var(--breadle-gold);
        color: #171406;
        font-weight: 800;
        cursor: pointer;
        transition: background var(--breadle-motion-fast), transform var(--breadle-motion-fast);
      }
      button:hover:not(:disabled) { background: #ffe84a; transform: translateY(-1px); }
      button:disabled { opacity: .65; cursor: wait; }
      .footer-links {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
        gap: 1rem;
      }
      .forgot-link {
        justify-self: end;
        color: var(--breadle-lilac);
        font-size: .9rem;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: .2rem;
      }
      .back-link,
      .secondary-link {
        color: var(--breadle-text-secondary);
        text-decoration: none;
        font-weight: 700;
      }
      .back-link:hover, .secondary-link:hover, .forgot-link:hover { color: var(--breadle-gold); }
      .hint {
        margin: 0;
        color: var(--breadle-text-secondary);
        font-weight: 700;
        line-height: 1.45;
      }
    `,
  ],
})
export class LoginComponent {
  email = '';
  senha = '';
  loading = false;
  message = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
  ) {
    if (this.route.snapshot.queryParamMap.get('sessionExpired') === 'true') {
      this.message = 'Sua sessão expirou. Entre novamente para continuar.';
    }
  }

  submit(): void {
    if (!this.email || !this.senha) {
      this.message = 'Preencha e-mail e senha para continuar.';
      return;
    }

    this.loading = true;
    this.message = '';

    this.authService.login({ email: this.email, senha: this.senha }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/dashboard');
      },
      error: (error: unknown) => {
        this.loading = false;
        this.message = this.getLoginErrorMessage(error);
        this.changeDetector.markForCheck();
      },
    });
  }

  private getLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Não foi possível conectar ao servidor do Breadle. Confirme se o backend está em execução e tente novamente.';
      }
      if (error.status === 401) {
        return error.error?.message ?? 'E-mail ou senha inválidos.';
      }
      if (typeof error.error?.message === 'string') {
        return error.error.message;
      }
    }

    return 'Não foi possível entrar agora. Tente novamente.';
  }
}
