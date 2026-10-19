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
            <span>Senha</span>
            <input type="password" [(ngModel)]="form.senha" name="senha" placeholder="Mínimo 8 caracteres" required />
          </label>

          <label>
            <span>Tipo de conta</span>
            <select [(ngModel)]="form.tipo" name="tipo">
              <option value="LEITOR">Leitor</option>
              <option value="PROFESSOR">Professor</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </label>

          <button type="submit" [disabled]="loading">{{ loading ? 'Criando...' : 'Criar conta' }}</button>
          <p class="hint" *ngIf="message">{{ message }}</p>
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
          radial-gradient(ellipse at 83% 45%, rgba(60, 76, 255, .42), transparent 38%),
          linear-gradient(105deg, #030305 0%, #080914 45%, #1716d8 100%);
        padding: 2rem 1rem;
      }
      .register-card {
        width: min(460px, 100%);
        background: rgba(139, 139, 159, 0.56);
        border: 1px solid rgba(255,255,255,.2);
        border-radius: 2rem;
        padding: 2rem clamp(1.25rem, 5vw, 2.5rem);
        box-shadow: 0 28px 70px rgba(0,0,0,.38), inset 0 1px rgba(255,255,255,.15);
        backdrop-filter: blur(22px);
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
        color: #fff;
        font-weight: 700;
      }
      h1 { margin: 0 0 1.2rem; color: #fff; font-size: clamp(1.8rem, 2vw, 2.3rem); }
      form {
        display: grid;
        gap: 1rem;
      }
      label { display: grid; gap: 0.45rem; font-weight: 600; color: rgba(255,255,255,.92); }
      input, select {
        padding: 0.85rem 1rem;
        border-radius: 0.55rem;
        border: 1px solid rgba(255,255,255,.14);
        font-size: 1rem;
        color: #fff;
        background: rgba(31,33,51,.38);
      }
      input::placeholder { color: rgba(255,255,255,.62); }
      button {
        width: 100%;
        border: 1px solid rgba(255,255,255,.25);
        padding: 0.85rem 1rem;
        border-radius: 999px;
        background: rgba(235,235,244,.8);
        color: #292a36;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 10px 22px rgba(0,0,0,.12);
      }
      button:hover:not(:disabled) { background: #fff; }
      .back-link {
        display: inline-block;
        margin-top: 1rem;
        color: #fff;
        text-decoration: none;
        font-weight: 700;
      }
      .hint {
        margin: 0;
        color: #fff;
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
  };
  loading = false;
  message = '';

  constructor(private authService: AuthService, private router: Router, private changeDetector: ChangeDetectorRef) {}

  submit(): void {
    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)[A-Za-z0-9]{8,}$/;

    if (!passwordPattern.test(this.form.senha)) {
      this.message = 'A senha deve ter pelo menos 8 caracteres, incluir uma letra maiúscula, um número e usar apenas letras e números.';
      return;
    }

    this.loading = true;
    this.message = '';

    this.authService.register(this.form).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Conta criada com sucesso! Faça login agora.';
        this.changeDetector.markForCheck();
        setTimeout(() => this.router.navigateByUrl('/login'), 800);
      },
      error: (error) => {
        this.loading = false;
        this.message = error?.error?.message || 'Não foi possível criar a conta. Verifique os dados e tente novamente.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
