import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterPayload } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="register-shell">
      <section class="register-card">
        <div class="header">
          <div class="brand-lockup" aria-label="Breadle logo">
            <span class="brand-mark" aria-hidden="true">
              <span class="page page-one"></span>
              <span class="page page-two"></span>
              <span class="page page-three"></span>
            </span>
            <span class="brand-name">BREADLE</span>
          </div>
          <h1>Criar conta</h1>
        </div>

        <form (ngSubmit)="submit()">
          <label>
            <span>Nome</span>
            <input type="text" [(ngModel)]="form.nome" name="nome" placeholder="Seu nome" required />
          </label>

          <label>
            <span>E-mail</span>
            <input type="email" [(ngModel)]="form.email" name="email" placeholder="seu@email.com" required />
          </label>

          <label>
            <span>Data de nascimento</span>
            <input type="date" [(ngModel)]="form.dataNascimento" name="dataNascimento" [max]="today" required />
          </label>

          <label *ngIf="isMinor">
            <span>E-mail do responsável</span>
            <input type="email" [(ngModel)]="form.emailResponsavel" name="emailResponsavel"
              placeholder="responsavel@email.com" required autocomplete="email" />
          </label>

          <label>
            <span>Senha</span>
            <input type="password" [(ngModel)]="form.senha" name="senha" placeholder="Mínimo 8 caracteres" required />
          </label>

          <button type="submit" [disabled]="loading">{{ loading ? 'Criando...' : 'Criar conta' }}</button>
          <p class="hint" *ngIf="message" role="status" aria-live="polite">{{ message }}</p>
        </form>

        <a routerLink="/login" class="back-link">← Já tenho conta</a>
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .register-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(ellipse at 82% 18%, rgba(84, 42, 168, .28), transparent 34rem),
          radial-gradient(ellipse at 12% 100%, rgba(255, 217, 0, .07), transparent 28rem),
          #000;
        padding: 2rem 1rem;
      }
      .register-card {
        width: min(460px, 100%);
        background: #1f1f1f;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 1.2rem;
        padding: 2rem clamp(1.25rem, 5vw, 2.5rem);
        box-shadow: 0 24px 70px rgba(0,0,0,.48);
      }
      .header { margin-bottom: 1.2rem; text-align: center; }
      .brand-lockup {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        margin-bottom: 0.8rem;
      }
      .brand-mark {
        position: relative;
        display: block;
        width: 84px;
        height: 66px;
      }
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
      input, select {
        min-height: 2.9rem;
        padding: 0.75rem 1rem;
        border-radius: var(--breadle-radius-small);
        border: 1px solid rgba(255,255,255,.16);
        font-size: 1rem;
        color: var(--breadle-text);
        background: #2a2a2a;
      }
      input::placeholder { color: var(--breadle-text-muted); }
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
      .back-link {
        display: inline-block;
        margin-top: 1rem;
        color: var(--breadle-text-secondary);
        text-decoration: none;
        font-weight: 700;
      }
      .back-link:hover { color: var(--breadle-gold); }
      .hint {
        margin: 0;
        color: var(--breadle-text-secondary);
        font-weight: 700;
        line-height: 1.45;
      }
    `,
  ],
})
export class RegisterComponent {
  form: RegisterPayload = {
    nome: '',
    email: '',
    senha: '',
    tipo: 'LEITOR',
    dataNascimento: '',
  };
  loading = false;
  message = '';

  constructor(private authService: AuthService, private router: Router, private changeDetector: ChangeDetectorRef) {}

  get today(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  get isMinor(): boolean {
    if (!this.form.dataNascimento) {
      return false;
    }

    const birthDate = new Date(`${this.form.dataNascimento}T00:00:00`);
    const eighteenthBirthday = new Date(birthDate);
    eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);
    return eighteenthBirthday > new Date(`${this.today}T00:00:00`);
  }

  submit(): void {
    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)[A-Za-z0-9]{8,}$/;

    if (!this.form.dataNascimento) {
      this.message = 'Informe sua data de nascimento.';
      return;
    }

    if (this.isMinor && !this.form.emailResponsavel?.trim()) {
      this.message = 'Informe o e-mail do responsável.';
      return;
    }

    if (!passwordPattern.test(this.form.senha)) {
      this.message = 'A senha deve ter pelo menos 8 caracteres, incluir uma letra maiúscula, um número e usar apenas letras e números.';
      return;
    }

    this.loading = true;
    this.message = '';

    this.authService.register(this.form).subscribe({
      next: (response) => {
        this.loading = false;
        this.message = response.message;
        this.changeDetector.markForCheck();
        setTimeout(() => {
          this.router.navigateByUrl(response.consentPending ? '/confirm-email?pending=true' : '/login');
        }, response.consentPending ? 0 : 800);
      },
      error: (error) => {
        this.loading = false;
        this.message = error?.error?.message || 'Não foi possível criar a conta. Verifique os dados e tente novamente.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
