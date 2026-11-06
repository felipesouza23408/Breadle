import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="confirm-shell">
      <section class="confirm-card" aria-labelledby="confirm-title">
        <h1 id="confirm-title">Confirmação do responsável</h1>

        <p *ngIf="status === 'loading'" role="status" aria-live="polite">
          Estamos confirmando o link. Aguarde um momento.
        </p>
        <p *ngIf="status === 'success'" role="status" aria-live="polite">
          {{ message }}
        </p>
        <p *ngIf="status === 'pending'" role="status" aria-live="polite">
          {{ message || 'A conta só poderá ser acessada depois que o responsável confirmar o link enviado por e-mail.' }}
        </p>
        <p *ngIf="status === 'error'" class="error" role="alert">
          {{ message }}
        </p>

        <form *ngIf="status === 'pending' || status === 'error'" (ngSubmit)="resend()">
          <label for="student-email">E-mail usado no cadastro</label>
          <input id="student-email" type="email" name="email" [(ngModel)]="email"
            autocomplete="email" required />
          <button type="submit" [disabled]="resending">
            {{ resending ? 'Enviando...' : 'Enviar outro link' }}
          </button>
          <p *ngIf="resendMessage" role="status" aria-live="polite">{{ resendMessage }}</p>
        </form>

        <a *ngIf="status === 'success'" routerLink="/login">Ir para entrar</a>
        <a *ngIf="status !== 'success'" routerLink="/login">Voltar para entrar</a>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .confirm-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 2rem 1rem;
      background:
        radial-gradient(ellipse at 82% 18%, rgba(84, 42, 168, .28), transparent 34rem),
        radial-gradient(ellipse at 12% 100%, rgba(255, 217, 0, .07), transparent 28rem),
        #000;
    }
    .confirm-card {
      width: min(460px, 100%);
      display: grid;
      gap: 1rem;
      padding: 2rem clamp(1.25rem, 5vw, 2.5rem);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 1.2rem;
      background: #1f1f1f;
      color: var(--breadle-text);
      box-shadow: 0 24px 70px rgba(0,0,0,.48);
    }
    h1 { margin: 0; font-size: clamp(1.6rem, 5vw, 2rem); }
    p { margin: 0; color: var(--breadle-text-secondary); line-height: 1.5; }
    .error { color: #ffb4ab; }
    form { display: grid; gap: .75rem; }
    label { color: var(--breadle-text-secondary); font-weight: 600; }
    input, button {
      min-height: 2.9rem;
      padding: .75rem 1rem;
      border-radius: var(--breadle-radius-small);
      font: inherit;
    }
    input {
      border: 1px solid rgba(255,255,255,.16);
      color: var(--breadle-text);
      background: #2a2a2a;
    }
    input:focus, button:focus-visible { outline: 2px solid var(--breadle-gold); outline-offset: 2px; }
    button {
      border: 0;
      border-radius: 999px;
      background: var(--breadle-gold);
      color: #171406;
      font-weight: 800;
      cursor: pointer;
    }
    button:disabled { opacity: .65; cursor: wait; }
    a { color: var(--breadle-lilac); font-weight: 700; }
  `],
})
export class ConfirmEmailComponent {
  status: 'loading' | 'pending' | 'success' | 'error' = 'pending';
  message = '';
  email = '';
  resendMessage = '';
  resending = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
  ) {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.status = 'loading';
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { token: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      this.authService.confirmGuardianConsent(token).subscribe({
        next: (response) => {
          this.status = 'success';
          this.message = response.message;
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          this.status = 'error';
          this.message = error?.error?.message
            || 'Não foi possível confirmar este link. Solicite um novo para continuar.';
          this.changeDetector.markForCheck();
        },
      });
    } else {
      this.status = 'pending';
    }
  }

  resend(): void {
    if (!this.email.trim()) {
      return;
    }

    this.resending = true;
    this.resendMessage = '';
    this.authService.resendGuardianConsent(this.email).subscribe({
      next: (response) => {
        this.resending = false;
        this.resendMessage = response.message;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.resending = false;
        this.resendMessage = 'Não foi possível solicitar outro link agora. Tente novamente mais tarde.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
