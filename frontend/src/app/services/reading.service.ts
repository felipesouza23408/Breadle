import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';

export interface ReadingSessionRequest {
  userId: number;
  bookId: number;
  pagesDefined: number;
}

export interface ReadingProgressRequest {
  pagesRead: number;
  excerptHash?: string | null;
}

export interface ReadingSession {
  id: number;
  userId: number;
  bookId: number;
  pagesDefined: number;
  pagesRead: number;
  status: string;
  pointsAwarded: number;
  alreadyAwarded: boolean;
}

export interface ReadingSessionSummary {
  id: number;
  bookId: number;
  title: string;
  author: string;
  coverUrl: string | null;
  totalPages: number;
  pagesDefined: number;
  pagesRead: number;
  status: string;
  pointsAwarded: number;
  createdAt: string;
  finishedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReadingService {
  constructor(private http: HttpClient) {}

  listMySessions(): Observable<ReadingSessionSummary[]> {
    return this.http
      .get<ReadingSessionSummary[]>('http://localhost:8080/api/reading/sessions', {
        headers: this.getAuthHeaders(),
      })
      .pipe(timeout(8000));
  }

  createSession(payload: ReadingSessionRequest): Observable<ReadingSession> {
    return this.http.post<ReadingSession>('http://localhost:8080/api/reading/sessions', payload, {
      headers: this.getAuthHeaders(),
    });
  }

  updateProgress(sessionId: number, payload: ReadingProgressRequest): Observable<ReadingSession> {
    return this.http.post<ReadingSession>(`http://localhost:8080/api/reading/sessions/${sessionId}/progress`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  completeSession(sessionId: number): Observable<ReadingSession> {
    return this.http.post<ReadingSession>(`http://localhost:8080/api/reading/sessions/${sessionId}/complete`, {}, {
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
