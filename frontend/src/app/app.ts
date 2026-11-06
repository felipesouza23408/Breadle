import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';

interface NavigationLink {
  path: string;
  label: string;
  glyph: string;
  exact?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  showShell = true;
  sidebarOpen = false;
  accountMenuOpen = false;
  @ViewChild('menuToggle') private menuToggle?: ElementRef<HTMLButtonElement>;
  private readonly routeSubscription: Subscription;

  constructor(public authService: AuthService, private router: Router) {
    this.updateShell(this.router.url);
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateShell(event.urlAfterRedirects);
        this.closeMenus();
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get primaryLinks(): NavigationLink[] {
    if (!this.isAuthenticated()) {
      return [
        { path: '/', label: 'Início', glyph: '⌂', exact: true },
        { path: '/books', label: 'Livros', glyph: '▤' },
      ];
    }

    return [
      { path: '/dashboard', label: 'Início', glyph: '⌂' },
      { path: '/books', label: 'Livros', glyph: '▤' },
      { path: '/library', label: 'Minha biblioteca', glyph: '▥' },
      { path: '/missions', label: 'Metas', glyph: '✦' },
    ];
  }

  get navigationLinks(): NavigationLink[] {
    if (!this.isAuthenticated()) {
      return [
        { path: '/', label: 'Início', glyph: '⌂', exact: true },
        { path: '/books', label: 'Livros', glyph: '▤' },
        { path: '/login', label: 'Entrar', glyph: '↪' },
        { path: '/register', label: 'Criar conta', glyph: '+' },
      ];
    }

    const links: NavigationLink[] = [
      { path: '/dashboard', label: 'Visão geral', glyph: '⌂' },
      { path: '/books', label: 'Livros e coleções', glyph: '▤' },
      { path: '/library', label: 'Minha biblioteca', glyph: '▥' },
      { path: '/missions', label: 'Metas e missões', glyph: '✦' },
      { path: '/rankings', label: 'Ranking', glyph: '♜' },
      { path: '/groups', label: 'Grupos de leitura', glyph: '◎' },
      { path: '/chat', label: 'Chat', glyph: '◌' },
      { path: '/notifications', label: 'Notificações', glyph: '♧' },
    ];

    if (this.isEducator()) {
      links.push({ path: '/teacher', label: 'Ambiente educacional', glyph: '▦' });
    }
    return links;
  }

  get accountName(): string {
    return this.authService.getSession()?.nome?.trim() || (this.isAuthenticated() ? 'Minha conta' : 'Entrar');
  }

  get accountInitials(): string {
    return this.accountName.split(/\s+/).filter(Boolean).slice(0, 2)
      .map((part) => part.charAt(0)).join('').toLocaleUpperCase('pt-BR');
  }

  get accountTypeLabel(): string {
    const type = this.authService.getSession()?.tipo;
    const labels: Record<string, string> = {
      LEITOR: 'Conta de leitor',
      PROFESSOR: 'Conta de professor',
      ADMINISTRADOR: 'Conta administrativa',
    };
    return type ? labels[type] ?? 'Conta Breadle' : 'Entre para acessar sua conta';
  }

  submitSearch(event: Event, value: string): void {
    event.preventDefault();
    const query = value.trim();
    this.router.navigate(['/books'], { queryParams: query ? { q: query } : {} });
  }

  logout(): void {
    this.authService.logout();
    this.closeMenus();
    this.router.navigateByUrl('/login');
  }

  closeMenus(): void {
    this.sidebarOpen = false;
    this.accountMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeSidebarOnEscape(): void {
    if (!this.sidebarOpen) {
      return;
    }

    this.closeMenus();
    this.menuToggle?.nativeElement.focus();
  }

  trackLink(_index: number, item: NavigationLink): string {
    return item.path;
  }

  private isEducator(): boolean {
    const type = this.authService.getSession()?.tipo;
    return type === 'PROFESSOR' || type === 'ADMINISTRADOR';
  }

  private updateShell(url: string): void {
    const path = url.split('?')[0];
    this.showShell = ![
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
    ].some((route) => path === route || path.startsWith(`${route}/`))
      && !path.startsWith('/books/')
      && !path.startsWith('/authors/');
  }
}
