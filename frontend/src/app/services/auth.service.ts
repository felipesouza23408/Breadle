import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, timeout } from 'rxjs';

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
  tipo: 'LEITOR' | 'PROFESSOR' | 'ADMINISTRADOR';
}

export interface AuthSession {
  token: string;
  nome: string;
  email: string;
  tipo: string;
}

export interface UserProfile {
  id: number;
  nome: string;
  email: string;
  tipo: string;
  pontosTotais?: number;
  apelido?: string;
  biografia?: string;
  fotoUrl?: string;
  genero?: string;
  generoLiterarioFavorito?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'breadle.session';

  constructor(private http: HttpClient) {}

  login(payload: LoginPayload): Observable<AuthSession> {
    const normalizedPayload = {
      email: (payload.email ?? '').trim().toLowerCase(),
      senha: payload.senha,
    };

    return this.http
      .post<AuthSession>('http://localhost:8080/api/auth/login', normalizedPayload)
      .pipe(tap((session) => this.persistSession(session)));
  }

  register(payload: RegisterPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('http://localhost:8080/api/auth/register', payload);
  }

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('http://localhost:8080/api/auth/password/forgot', {
      email: email.trim().toLowerCase(),
    });
  }

  resetPassword(token: string, senha: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('http://localhost:8080/api/auth/password/reset', { token, senha });
  }

  updateProfile(payload: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>('http://localhost:8080/api/auth/me', payload, {
      headers: this.getAuthHeaders(),
    });
  }

  me(): Observable<UserProfile> {
    return this.http
      .get<UserProfile>('http://localhost:8080/api/auth/me', {
        headers: this.getAuthHeaders(),
      })
      .pipe(timeout(4000));
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }

  isAuthenticated(): boolean {
    return !!this.getSession()?.token;
  }

  getSession(): AuthSession | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private persistSession(session: AuthSession): void {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private getAuthHeaders(): HttpHeaders {
    const session = this.getSession();
    if (!session?.token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({ Authorization: `Bearer ${session.token}` });
  }
}
