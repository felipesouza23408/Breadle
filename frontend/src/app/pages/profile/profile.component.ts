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
          <span class="eyebrow">Sua conta</span>
          <h1>Seu perfil</h1>
        </div>
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
