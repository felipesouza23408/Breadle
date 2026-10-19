import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface StudentProgress {
  userId: number;
  nome: string;
  email: string;
  pontosTotais: number;
  livrosConcluidos: number;
  progressoSemanal: number;
}

export interface TeacherDashboard {
  totalAlunos: number;
  alunosAtivos: number;
  livrosConcluidos: number;
  mediaPontos: number;
  topAlunos: StudentProgress[];
}

@Injectable({ providedIn: 'root' })
export class EducationService {
  constructor(private http: HttpClient) {}

  getTeacherDashboard(): Observable<TeacherDashboard> {
    return this.http.get<TeacherDashboard>('http://localhost:8080/api/education/teacher-dashboard', {
      headers: this.getAuthHeaders(),
    });
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
