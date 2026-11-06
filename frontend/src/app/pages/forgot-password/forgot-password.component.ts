import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="reset-shell">
      <section class="reset-card">
        <a routerLink="/login" class="back-link">← Voltar para entrar</a>
        <p class="eyebrow">ACESSO À CONTA</p>
        <h1>Esqueceu sua senha?</h1>
        <p class="description">Informe o e-mail da sua conta. Se estiver cadastrado, enviaremos um link seguro para criar uma nova senha.</p>
        <form (ngSubmit)="submit()" *ngIf="!submitted">
          <label for="email">E-mail</label>
          <input id="email" type="email" [(ngModel)]="email" name="email" placeholder="seu@email.com" autocomplete="email" required />
          <button type="submit" [disabled]="loading">{{ loading ? 'Enviando...' : 'Enviar link de redefinição' }}</button>
        </form>
        <p *ngIf="message" class="feedback" role="status">{{ message }}</p>
        <p *ngIf="error" class="feedback error" role="alert">{{ error }}</p>
        <button *ngIf="submitted" type="button" class="secondary-button" (click)="submit()" [disabled]="loading">
          {{ loading ? 'Enviando...' : 'Enviar novamente' }}
        </button>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .reset-shell { min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; background: radial-gradient(ellipse at 82% 18%,rgba(84,42,168,.28),transparent 34rem),radial-gradient(ellipse at 12% 100%,rgba(255,217,0,.07),transparent 28rem),#000; }
    .reset-card { width: min(460px,100%); padding: 2rem clamp(1.25rem,5vw,2.5rem); border: 1px solid rgba(255,255,255,.12); border-radius: 1.2rem; background: #1f1f1f; box-shadow: 0 24px 70px rgba(0,0,0,.48); }
    .back-link { color: var(--breadle-text-secondary); font-weight: 700; text-decoration: none; }
    .back-link:hover,.login-link:hover { color: var(--breadle-gold); }
    .eyebrow { margin: 2rem 0 .5rem; color: var(--breadle-gold); font-size: .78rem; font-weight: 800; letter-spacing: .12em; }
    h1 { margin: 0; color: var(--breadle-text); font-size: clamp(1.8rem,5vw,2.4rem); }
    .description { color: var(--breadle-text-secondary); line-height: 1.6; }
    form { display: grid; gap: .8rem; margin-top: 1.5rem; }
    label { color: var(--breadle-text-secondary); font-weight: 700; }
    input { min-height: 2.9rem; padding: .75rem 1rem; border: 1px solid rgba(255,255,255,.16); border-radius: var(--breadle-radius-small); background: #2a2a2a; color: var(--breadle-text); font-size: 1rem; }
    input::placeholder { color: var(--breadle-text-muted); }
    button { min-height: 2.9rem; width: 100%; margin-top: .5rem; padding: .75rem 1rem; border: 0; border-radius: 999px; background: var(--breadle-gold); color: #171406; font-weight: 800; cursor: pointer; }
    button:hover:not(:disabled) { background: #ffe84a; }
    button:disabled { opacity: .65; cursor: wait; }
    .feedback { color: var(--breadle-text-secondary); font-weight: 700; line-height: 1.5; }
    .error { color: #ffd2cc; }
    .secondary-button { margin-top: .5rem; }
  `],
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  submitted = false;
  message = '';
  error = '';

  constructor(private authService: AuthService, private changeDetector: ChangeDetectorRef) {}

  submit(): void {
    if (!this.email.trim()) {
      this.error = 'Informe seu e-mail para continuar.';
      return;
    }

    this.loading = true;
    this.message = '';
    this.error = '';
    this.authService.requestPasswordReset(this.email).subscribe({
      next: (response) => {
        this.loading = false;
        this.submitted = true;
        this.message = response.message;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.error = 'Não foi possível processar sua solicitação agora. Tente novamente em alguns instantes.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
