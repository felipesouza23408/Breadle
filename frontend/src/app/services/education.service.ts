import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from './api-url';

export interface StudentProgress {
  userId: number;
  nome: string;
  email: string;
  pontosEducacionais: number;
  livrosConcluidos: number;
  progressoSemanal: number;
}

export interface TeacherDashboard {
  totalAlunos: number;
  alunosAtivos: number;
  livrosConcluidos: number;
  mediaPontosEducacionais: number;
  topAlunos: StudentProgress[];
  page: number;
  size: number;
  hasNext: boolean;
}

export interface TeacherClass {
  id: number;
  name: string;
  totalAlunos: number;
  createdAt: string;
}

export interface CreatedTeacherClass {
  id: number;
  name: string;
  invitationCode: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class EducationService {
  constructor(private http: HttpClient) {}

  getTeacherDashboard(page = 0, size = 20): Observable<TeacherDashboard> {
    return this.http.get<TeacherDashboard>(apiUrl('/api/education/teacher-dashboard'), {
      headers: this.getAuthHeaders(),
      params: new HttpParams().set('page', page).set('size', size),
    });
  }

  getTeacherClasses(): Observable<TeacherClass[]> {
    return this.http.get<TeacherClass[]>(apiUrl('/api/education/classes'), {
      headers: this.getAuthHeaders(),
    });
  }

  createTeacherClass(name: string): Observable<CreatedTeacherClass> {
    return this.http.post<CreatedTeacherClass>(
      apiUrl('/api/education/classes'),
      { name },
      { headers: this.getAuthHeaders() },
    );
  }

  joinTeacherClass(invitationCode: string): Observable<{ className: string }> {
    return this.http.post<{ className: string }>(
      apiUrl('/api/education/classes/join'),
      { invitationCode },
      { headers: this.getAuthHeaders() },
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const session = localStorage.getItem('breadle.session');
    if (!session) {
      return new HttpHeaders();
    }

    try {
      const parsed = JSON.parse(session) as { token?: string };
      if (!parsed.token) {
        return new HttpHeaders();
      }
      return new HttpHeaders({ Authorization: `Bearer ${parsed.token}` });
    } catch {
      return new HttpHeaders();
    }
  }
}
