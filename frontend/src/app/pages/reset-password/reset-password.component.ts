import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="reset-shell">
      <section class="reset-card">
        <a routerLink="/login" class="back-link">← Voltar para entrar</a>
        <p class="eyebrow">SUA CONTA, SUA LEITURA</p>
        <h1>Crie uma nova senha</h1>
        <p class="description">Use pelo menos 8 caracteres, com uma letra maiúscula e um número.</p>
        <form (ngSubmit)="submit()" *ngIf="!completed">
          <label for="password">Nova senha</label>
          <input id="password" type="password" [(ngModel)]="password" name="password" autocomplete="new-password" required />
          <label for="confirm-password">Confirme a nova senha</label>
          <input id="confirm-password" type="password" [(ngModel)]="confirmation" name="confirmation" autocomplete="new-password" required />
          <button type="submit" [disabled]="loading">{{ loading ? 'Salvando...' : 'Redefinir senha' }}</button>
        </form>
        <p *ngIf="message" class="feedback" [class.error]="!completed" [attr.role]="completed ? 'status' : 'alert'">{{ message }}</p>
        <a *ngIf="completed" routerLink="/login" class="login-link">Ir para o login</a>
        <a *ngIf="!token" routerLink="/forgot-password" class="login-link">Solicitar outro link</a>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .reset-shell { min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; background: radial-gradient(ellipse at 83% 45%, rgba(60,76,255,.42), transparent 38%), linear-gradient(105deg,#030305 0%,#080914 45%,#1716d8 100%); }
    .reset-card { width: min(460px,100%); padding: 2rem clamp(1.25rem,5vw,2.5rem); border: 1px solid rgba(255,255,255,.2); border-radius: 2rem; background: rgba(139,139,159,.56); box-shadow: 0 28px 70px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.15); backdrop-filter: blur(22px); }
    .back-link,.login-link { color: #fff; font-weight: 700; text-decoration: none; }
    .eyebrow { margin: 2rem 0 .5rem; color: var(--breadle-gold-soft); font-size: .78rem; font-weight: 800; letter-spacing: .12em; }
    h1 { margin: 0; color: #fff; font-size: clamp(1.8rem,5vw,2.4rem); }
    .description { color: rgba(255,255,255,.88); line-height: 1.6; }
    form { display: grid; gap: .8rem; margin-top: 1.5rem; }
    label { color: #fff; font-weight: 700; }
    input { padding: .9rem 1rem; border: 1px solid rgba(255,255,255,.2); border-radius: .55rem; background: rgba(31,33,51,.38); color: #fff; font-size: 1rem; }
    button { width: 100%; margin-top: .5rem; padding: .9rem 1rem; border: 1px solid rgba(255,255,255,.25); border-radius: 999px; background: rgba(235,235,244,.88); color: #292a36; font-weight: 800; cursor: pointer; }
    button:disabled { opacity: .65; cursor: wait; }
    .feedback { color: #fff; font-weight: 700; line-height: 1.5; }
    .error { color: #ffe0d9; }
    .login-link { display: inline-block; margin-top: .5rem; }
  `],
})
export class ResetPasswordComponent {
  readonly token: string;
  password = '';
  confirmation = '';
  loading = false;
  completed = false;
  message = '';

  constructor(
    route: ActivatedRoute,
    private authService: AuthService,
    private changeDetector: ChangeDetectorRef,
  ) {
    this.token = route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.message = 'O link está incompleto ou inválido. Solicite uma nova redefinição.';
    }
  }

  submit(): void {
    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)[A-Za-z0-9]{8,}$/;
    if (!this.token) {
      this.message = 'O link está incompleto ou inválido. Solicite uma nova redefinição.';
    } else if (!passwordPattern.test(this.password)) {
      this.message = 'A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula e um número; use apenas letras e números.';
    } else if (this.password !== this.confirmation) {
      this.message = 'As senhas não coincidem.';
    } else {
      this.loading = true;
      this.message = '';
      this.authService.resetPassword(this.token, this.password).subscribe({
        next: (response) => {
          this.loading = false;
          this.completed = true;
          this.message = response.message;
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          this.loading = false;
          this.message = error?.error?.message || 'Não foi possível redefinir sua senha. Solicite um novo link.';
          this.changeDetector.markForCheck();
        },
      });
      return;
    }

    this.changeDetector.markForCheck();
  }
}
