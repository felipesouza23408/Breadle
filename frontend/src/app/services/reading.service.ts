import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { apiUrl } from './api-url';
import type { AssessmentAnswer, ReadingAssessment } from './ai.service';
import { BookPage } from './book.service';

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

export interface PendingReadingProgress {
  sessionId: number;
  pagesRead: number;
}

@Injectable({ providedIn: 'root' })
export class ReadingService {
  private readonly pendingProgressPrefix = 'breadle.reading-progress.v1.';

  constructor(private http: HttpClient) {}

  listMySessions(): Observable<ReadingSessionSummary[]> {
    return this.http
      .get<ReadingSessionSummary[]>(apiUrl('/api/reading/sessions'), {
        headers: this.getAuthHeaders(),
      })
      .pipe(timeout(8000));
  }

  createSession(payload: ReadingSessionRequest): Observable<ReadingSession> {
    return this.http.post<ReadingSession>(apiUrl('/api/reading/sessions'), payload, {
      headers: this.getAuthHeaders(),
    });
  }

  updateProgress(sessionId: number, payload: ReadingProgressRequest): Observable<ReadingSession> {
    return this.http.post<ReadingSession>(apiUrl(`/api/reading/sessions/${sessionId}/progress`), payload, {
      headers: this.getAuthHeaders(),
    });
  }

  openPage(sessionId: number, pageNumber: number): Observable<BookPage> {
    return this.http.post<BookPage>(
      apiUrl(`/api/reading/sessions/${sessionId}/pages/${pageNumber}`),
      {},
      { headers: this.getAuthHeaders() },
    ).pipe(timeout(8000));
  }

  queueProgress(userId: number, sessionId: number, pagesRead: number): void {
    if (!Number.isSafeInteger(userId) || userId < 1
        || !Number.isSafeInteger(sessionId) || sessionId < 1
        || !Number.isSafeInteger(pagesRead) || pagesRead < 1) {
      return;
    }

    const pending = this.getPendingProgress(userId);
    const existing = pending.find((item) => item.sessionId === sessionId);
    if (existing) {
      existing.pagesRead = Math.max(existing.pagesRead, pagesRead);
    } else {
      pending.push({ sessionId, pagesRead });
    }
    this.storePendingProgress(userId, pending);
  }

  getPendingProgress(userId: number): PendingReadingProgress[] {
    try {
      const raw = localStorage.getItem(this.pendingProgressKey(userId));
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item): item is PendingReadingProgress =>
        item !== null
        && typeof item === 'object'
        && Number.isSafeInteger((item as PendingReadingProgress).sessionId)
        && (item as PendingReadingProgress).sessionId > 0
        && Number.isSafeInteger((item as PendingReadingProgress).pagesRead)
        && (item as PendingReadingProgress).pagesRead > 0,
      );
    } catch {
      return [];
    }
  }

  confirmProgress(userId: number, sessionId: number, pagesRead: number): void {
    const pending = this.getPendingProgress(userId);
    const remaining = pending.filter((item) =>
      item.sessionId !== sessionId || item.pagesRead > pagesRead,
    );
    this.storePendingProgress(userId, remaining);
  }

  completeSession(sessionId: number): Observable<ReadingSession> {
    return this.http.post<ReadingSession>(apiUrl(`/api/reading/sessions/${sessionId}/complete`), {}, {
      headers: this.getAuthHeaders(),
    });
  }

  createAssessment(sessionId: number): Observable<ReadingAssessment> {
    return this.http.post<ReadingAssessment>(
      apiUrl(`/api/reading/sessions/${sessionId}/assessments`),
      {},
      { headers: this.getAuthHeaders() },
    ).pipe(timeout(20_000));
  }

  answerAssessmentQuestion(
    sessionId: number,
    questionId: number,
    answer: string | null,
    selectedOption: number | null,
  ): Observable<AssessmentAnswer> {
    return this.http.post<AssessmentAnswer>(
      apiUrl(`/api/reading/sessions/${sessionId}/assessments/${questionId}/answers`),
      { answer, selectedOption },
      { headers: this.getAuthHeaders() },
    ).pipe(timeout(20_000));
  }

  private pendingProgressKey(userId: number): string {
    return `${this.pendingProgressPrefix}${userId}`;
  }

  private storePendingProgress(userId: number, pending: PendingReadingProgress[]): void {
    try {
      const key = this.pendingProgressKey(userId);
      if (pending.length) {
        localStorage.setItem(key, JSON.stringify(pending));
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // A storage restriction must not prevent the server write from being attempted.
    }
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
