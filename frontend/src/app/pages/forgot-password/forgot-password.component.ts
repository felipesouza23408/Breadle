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
    .reset-shell { min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; background: radial-gradient(ellipse at 83% 45%, rgba(60,76,255,.42), transparent 38%), linear-gradient(105deg,#030305 0%,#080914 45%,#1716d8 100%); }
    .reset-card { width: min(460px,100%); padding: 2rem clamp(1.25rem,5vw,2.5rem); border: 1px solid rgba(255,255,255,.2); border-radius: 2rem; background: rgba(139,139,159,.56); box-shadow: 0 28px 70px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.15); backdrop-filter: blur(22px); }
    .back-link { color: #fff; font-weight: 700; text-decoration: none; }
    .eyebrow { margin: 2rem 0 .5rem; color: var(--breadle-gold-soft); font-size: .78rem; font-weight: 800; letter-spacing: .12em; }
    h1 { margin: 0; color: #fff; font-size: clamp(1.8rem,5vw,2.4rem); }
    .description { color: rgba(255,255,255,.88); line-height: 1.6; }
    form { display: grid; gap: .8rem; margin-top: 1.5rem; }
    label { color: #fff; font-weight: 700; }
    input { padding: .9rem 1rem; border: 1px solid rgba(255,255,255,.2); border-radius: .55rem; background: rgba(31,33,51,.38); color: #fff; font-size: 1rem; }
    input::placeholder { color: rgba(255,255,255,.62); }
    button { width: 100%; margin-top: .5rem; padding: .9rem 1rem; border: 1px solid rgba(255,255,255,.25); border-radius: 999px; background: rgba(235,235,244,.88); color: #292a36; font-weight: 800; cursor: pointer; }
    button:disabled { opacity: .65; cursor: wait; }
    .feedback { color: #fff; font-weight: 700; line-height: 1.5; }
    .error { color: #ffe0d9; }
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
