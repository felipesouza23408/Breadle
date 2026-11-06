import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then((module) => module.HomeComponent) },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then((module) => module.HomeComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then((module) => module.LoginComponent), canActivate: [guestGuard] },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password.component').then((module) => module.ForgotPasswordComponent), canActivate: [guestGuard] },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password.component').then((module) => module.ResetPasswordComponent) },
  { path: 'confirm-email', loadComponent: () => import('./pages/confirm-email/confirm-email.component').then((module) => module.ConfirmEmailComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then((module) => module.RegisterComponent), canActivate: [guestGuard] },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then((module) => module.DashboardComponent), canActivate: [authGuard] },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then((module) => module.ProfileComponent), canActivate: [authGuard] },
  { path: 'groups', loadComponent: () => import('./pages/groups/groups.component').then((module) => module.GroupsComponent), canActivate: [authGuard] },
  { path: 'chat', loadComponent: () => import('./pages/chat/chat.component').then((module) => module.ChatComponent), canActivate: [authGuard] },
  { path: 'library', loadComponent: () => import('./pages/library/library.component').then((module) => module.LibraryComponent), canActivate: [authGuard] },
  { path: 'rankings', loadComponent: () => import('./pages/rankings/rankings.component').then((module) => module.RankingsComponent), canActivate: [authGuard] },
  { path: 'missions', loadComponent: () => import('./pages/missions/missions.component').then((module) => module.MissionsComponent), canActivate: [authGuard] },
  {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications/notifications.component').then((module) => module.NotificationsComponent),
    canActivate: [authGuard],
  },
  { path: 'teacher', loadComponent: () => import('./pages/teacher-dashboard/teacher-dashboard.component').then((module) => module.TeacherDashboardComponent), canActivate: [authGuard] },
  { path: 'books', loadComponent: () => import('./pages/books/books.component').then((module) => module.BooksComponent) },
  { path: 'books/:id', loadComponent: () => import('./pages/book-detail/book-detail.component').then((module) => module.BookDetailComponent) },
  { path: 'authors/:name', loadComponent: () => import('./pages/author-detail/author-detail.component').then((module) => module.AuthorDetailComponent) },
  { path: 'books/:id/read', loadComponent: () => import('./pages/book-reader/book-reader.component').then((module) => module.BookReaderComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
