import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="profile-page">
      <header class="page-header">
        <div>
          <span class="eyebrow">Conta</span>
          <h1>Perfil do leitor</h1>
        </div>
        <button type="button" class="logout-button" (click)="logout()">Sair</button>
      </header>

      <section class="profile-card" *ngIf="profile; else profileState">
        <div class="cover-banner"></div>
        <div class="profile-content">
          <div class="avatar-wrap">
            <div class="avatar" [ngStyle]="{ background: getAvatarBackground() }" [attr.title]="profile.nome">
              <img *ngIf="profile.fotoUrl" [src]="profile.fotoUrl" [alt]="profile.nome" />
              <span *ngIf="!profile.fotoUrl">{{ getInitials() }}</span>
            </div>
          </div>

          <div class="profile-main">
            <div class="profile-header-row">
              <div>
                <span class="label">{{ profile.tipo }}</span>
                <h2>{{ profile.nome }}</h2>
              </div>
              <button type="button" class="primary-button" (click)="toggleEdit()">
                {{ isEditing ? 'Cancelar' : 'Editar perfil' }}
              </button>
            </div>

            <div class="profile-meta-grid">
              <div class="meta-item"><span>Apelido</span><strong>{{ profile.apelido || 'Não informado' }}</strong></div>
              <div class="meta-item"><span>E-mail</span><strong>{{ profile.email }}</strong></div>
              <div class="meta-item"><span>Gênero</span><strong>{{ profile.genero || 'Não informado' }}</strong></div>
              <div class="meta-item"><span>Gênero favorito</span><strong>{{ profile.generoLiterarioFavorito || 'Não informado' }}</strong></div>
            </div>

            <div class="stats-grid">
              <article class="stat-box">
                <span>Pontos</span>
                <strong>{{ profile.pontosTotais ?? 0 }}</strong>
              </article>
            </div>

            <div class="bio-box">
              <h3>Biografia</h3>
              <p>{{ profile.biografia || 'Ainda não há biografia cadastrada.' }}</p>
            </div>
          </div>
        </div>
      </section>

      <ng-template #profileState>
        <section class="profile-card loading-card" *ngIf="profileLoading" role="status">
          <p>Carregando perfil...</p>
        </section>
        <section class="profile-card error-card" *ngIf="!profileLoading && profileError" role="alert">
          <p>{{ profileError }}</p>
          <button type="button" class="primary-button" (click)="loadProfile()">Tentar novamente</button>
        </section>
      </ng-template>

      <p class="feedback-error" *ngIf="profile && profileError" role="alert">{{ profileError }}</p>

      <section class="panel" *ngIf="isEditing">
        <h2>Atualizar perfil</h2>
        <form class="profile-form" (ngSubmit)="saveProfile()">
          <label>
            <span>Nome</span>
            <input type="text" [(ngModel)]="editForm.nome" name="nome" placeholder="Seu nome completo" />
          </label>
          <label>
            <span>Apelido</span>
            <input type="text" [(ngModel)]="editForm.apelido" name="apelido" placeholder="Seu apelido" />
          </label>
          <label>
            <span>E-mail</span>
            <input type="email" [(ngModel)]="editForm.email" name="email" placeholder="seu@email.com" />
          </label>
          <label>
            <span>Gênero</span>
            <input type="text" [(ngModel)]="editForm.genero" name="genero" placeholder="Ex.: Feminino" />
          </label>
          <label>
            <span>Gênero literário favorito</span>
            <input type="text" [(ngModel)]="editForm.generoLiterarioFavorito" name="generoLiterarioFavorito" placeholder="Ex.: Fantasia" />
          </label>
          <label>
            <span>URL da foto</span>
            <input type="url" [(ngModel)]="editForm.fotoUrl" name="fotoUrl" placeholder="https://..." />
          </label>
          <label>
            <span>Biografia</span>
            <textarea rows="4" [(ngModel)]="editForm.biografia" name="biografia" placeholder="Fale um pouco sobre você..."></textarea>
          </label>
          <div class="form-actions">
            <button type="submit" class="primary-button">Salvar alterações</button>
          </div>
        </form>
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; }
      .profile-page {
        min-height: 100vh;
        background: radial-gradient(circle at top left, rgba(214,169,74,0.18), transparent 18%),
                    linear-gradient(180deg, #f5efe7 0%, #eef3f8 100%);
        padding: 2rem;
        color: #172033;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .eyebrow {
        display: inline-block;
        background: rgba(214,169,74,0.14);
        color: #2b3b58;
        border: 1px solid rgba(214,169,74,0.25);
        border-radius: 999px;
        padding: 0.45rem 0.7rem;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 { margin: 0.7rem 0 0; }
      .logout-button,
      .primary-button {
        border: none;
        border-radius: 999px;
        padding: 0.7rem 1rem;
        font-weight: 700;
        cursor: pointer;
      }
      .logout-button {
        background: linear-gradient(135deg, #1d2b42, #324d74);
        color: white;
      }
      .primary-button {
        background: linear-gradient(135deg, #d6a94a, #f3d98a);
        color: #1d2b42;
      }
      .profile-card,
      .panel {
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(23,32,51,0.06);
        border-radius: 1.3rem;
        box-shadow: 0 16px 34px rgba(23,32,51,0.06);
      }
      .cover-banner {
        height: 110px;
        background: linear-gradient(135deg, #1d2b42, #2d486d, #d6a94a);
        border-radius: 1.3rem 1.3rem 0 0;
      }
      .profile-content {
        display: grid;
        grid-template-columns: 120px minmax(0, 1fr);
        gap: 1.25rem;
        padding: 1.5rem;
      }
      .avatar-wrap {
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .avatar {
        width: 110px;
        height: 110px;
        border-radius: 50%;
        border: 4px solid rgba(214,169,74,0.45);
        display: grid;
        place-items: center;
        font-size: 2rem;
        font-weight: 800;
        color: #1d2b42;
        margin-top: -56px;
        overflow: hidden;
        box-shadow: 0 16px 30px rgba(23,32,51,0.08);
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .profile-main {
        display: grid;
        gap: 1rem;
      }
      .profile-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      .label {
        display: inline-block;
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #4d677d;
      }
      h2 { margin: 0.35rem 0 0; }
      .profile-meta-grid,
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: 1rem;
      }
      .meta-item,
      .stat-box {
        background: #f7f9fc;
        border-radius: 0.9rem;
        padding: 0.9rem 1rem;
        display: grid;
        gap: 0.35rem;
      }
      .stat-box {
        background: linear-gradient(135deg, #f8fafc, #eef4f9);
      }
      .stat-box.accent {
        background: linear-gradient(135deg, rgba(214,169,74,0.18), rgba(214,169,74,0.06));
      }
      .meta-item span,
      .stat-box span {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #597089;
      }
      .stat-box strong {
        font-size: 1.5rem;
        color: #1d2b42;
      }
      .bio-box {
        background: #f8fafc;
        border: 1px solid rgba(23,32,51,0.05);
        border-radius: 1rem;
        padding: 1rem 1.1rem;
      }
      .bio-box h3 { margin: 0 0 0.6rem; }
      .bio-box p { margin: 0; color: #314156; line-height: 1.6; }
      .panel {
        margin-top: 1.5rem;
        padding: 1.4rem;
      }
      .profile-form {
        display: grid;
        grid-template-columns: repeat(2, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }
      .profile-form label {
        display: grid;
        gap: 0.45rem;
        font-weight: 600;
        color: #24324e;
      }
      .profile-form label:nth-child(6),
      .profile-form label:nth-child(7) {
        grid-column: 1 / -1;
      }
      .profile-form input,
      .profile-form textarea {
        width: 100%;
        border: 1px solid rgba(24, 34, 53, 0.12);
        border-radius: 0.8rem;
        padding: 0.8rem 0.9rem;
        font: inherit;
        resize: vertical;
      }
      .form-actions {
        grid-column: 1 / -1;
        display: flex;
        justify-content: flex-end;
      }
      .loading-card {
        display: grid;
        place-items: center;
        min-height: 180px;
        color: #4d677d;
      }
      .error-card { display: grid; justify-items: start; gap: 1rem; padding: 1.5rem; color: #f3f0f8; }
      .error-card p, .feedback-error { margin: 0; color: #ffc2bc; }
      .profile-page {
        background: radial-gradient(ellipse at 95% 0%, rgba(37, 46, 224, .2), transparent 28rem), #08080b;
        color: #f3f0f8;
      }
      .profile-page h1, .profile-page h2, .profile-page h3 { color: #fff; }
      .eyebrow {
        background: rgba(217,173,57,.12);
        border-color: rgba(217,173,57,.28);
        color: #f1d779;
      }
      .profile-card, .panel {
        background: #151519;
        border-color: rgba(255,255,255,.09);
        box-shadow: 0 16px 34px rgba(0,0,0,.3);
      }
      .cover-banner { background: linear-gradient(105deg, #09090c, #141bd1); }
      .meta-item, .stat-box, .bio-box {
        color: #f3f0f8;
        background: #202027;
        border-color: rgba(255,255,255,.08);
      }
      .meta-item span, .stat-box span, .mini-label, .label { color: #c3b477; }
      .meta-item strong, .stat-box strong, .bio-box p, .profile-form label { color: #f3f0f8; }
      .stat-box.accent { background: rgba(217,173,57,.11); }
      .profile-form input, .profile-form textarea {
        color: #fff;
        background: #202027;
        border-color: rgba(255,255,255,.14);
      }
      .loading-card { color: #d7d1e0; }
      .stats-grid { grid-template-columns: minmax(180px, 260px); }
      .logout-button { background: #282831; border: 1px solid rgba(255,255,255,.12); }
      @media (max-width: 760px) {
        .profile-content,
        .profile-form,
        .profile-meta-grid,
        .stats-grid {
          grid-template-columns: 1fr;
        }
        .page-header,
        .profile-header-row {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  isEditing = false;
  profileLoading = true;
  profileError = '';
  editForm: Partial<UserProfile> = {};

  constructor(private authService: AuthService, private router: Router, private changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loadProfile();
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing && this.profile) {
      this.editForm = { ...this.profile };
    }
  }

  saveProfile(): void {
    this.authService.updateProfile(this.editForm).subscribe({
      next: (updatedProfile) => {
        this.profile = updatedProfile;
        this.profileError = '';
        this.isEditing = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.profileError = 'Não foi possível salvar seu perfil. Tente novamente.';
        this.changeDetector.markForCheck();
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }

  getInitials(): string {
    const name = this.profile?.nome ?? 'Leitor';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'L';
  }

  getAvatarBackground(): string {
    const palettes = [
      'linear-gradient(135deg, #f3d98a 0%, #e6b95b 100%)',
      'linear-gradient(135deg, #dfeaf7 0%, #a9bfd9 100%)',
      'linear-gradient(135deg, #dfeadf 0%, #9cc0a6 100%)',
      'linear-gradient(135deg, #f8d6d9 0%, #d9a0ad 100%)',
    ];
    return palettes[(this.profile?.id ?? 0) % palettes.length];
  }

  loadProfile(): void {
    this.profileLoading = true;
    this.profileError = '';
    this.authService.me().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.profileLoading = false;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.profile = null;
        this.profileError = 'Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.';
        this.profileLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }
}
