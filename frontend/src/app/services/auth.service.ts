import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface AuthSession {
  token: string;
  nome: string;
  email: string;
  tipo: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly mockSession: AuthSession = {
    token: 'demo-token',
    nome: 'Lucas',
    email: 'lucas@breadle.com',
    tipo: 'LEITOR',
  };

  constructor(private http: HttpClient) {}

  login(payload: LoginPayload): Observable<AuthSession> {
    return this.http
      .post<AuthSession>('http://localhost:8080/api/auth/login', payload)
      .pipe(
        catchError(() => of(this.mockSession)),
        map((session) => ({
          ...session,
          nome: session.nome ?? this.mockSession.nome,
          email: session.email ?? payload.email,
          tipo: session.tipo ?? 'LEITOR',
        })),
      );
  }
}
