import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';

export interface AiUsageResponse {
  usedToday: number;
  dailyLimit: number;
  remainingToday: number;
  resetsAt: string;
}

export interface AiResultResponse extends AiUsageResponse {
  result: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  constructor(private http: HttpClient) {}

  getUsage(): Observable<AiUsageResponse> {
    return this.http
      .get<unknown>('http://localhost:8080/api/ai/usage', {
        headers: this.getAuthHeaders(),
      })
      .pipe(timeout(8000), map((response) => this.requireUsageResponse(response)));
  }

  generateQuestions(bookTitle: string, text: string): Observable<AiResultResponse> {
    return this.post('questions', { bookTitle, text });
  }

  summarize(text: string): Observable<AiResultResponse> {
    return this.post('summarize', { text });
  }

  explainPassage(passage: string, context: string): Observable<AiResultResponse> {
    return this.post('explain', { passage, context });
  }

  generateCharacterSheet(characterName: string, context: string): Observable<AiResultResponse> {
    return this.post('character-sheet', { characterName, context });
  }

  simulateScenario(scene: string, context: string): Observable<AiResultResponse> {
    return this.post('scenario', { scene, context });
  }

  chat(message: string, context: string): Observable<AiResultResponse> {
    return this.post('chat', { message, context });
  }

  private post(endpoint: string, payload: object): Observable<AiResultResponse> {
    return this.http
      .post<unknown>(`http://localhost:8080/api/ai/${endpoint}`, payload, {
        headers: this.getAuthHeaders(),
      })
      .pipe(timeout(12_000), map((response) => this.requireResultResponse(response)));
  }

  private requireUsageResponse(response: unknown): AiUsageResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('O backend precisa ser reiniciado para habilitar as cotas diárias da IA.');
    }

    const usage = response as Record<string, unknown>;
    if (
      typeof usage['usedToday'] !== 'number'
      || typeof usage['dailyLimit'] !== 'number'
      || typeof usage['remainingToday'] !== 'number'
      || typeof usage['resetsAt'] !== 'string'
    ) {
      throw new Error('O backend precisa ser reiniciado para habilitar as cotas diárias da IA.');
    }
    return {
      usedToday: usage['usedToday'],
      dailyLimit: usage['dailyLimit'],
      remainingToday: usage['remainingToday'],
      resetsAt: usage['resetsAt'],
    };
  }

  private requireResultResponse(response: unknown): AiResultResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('O backend precisa ser reiniciado para habilitar a versão atual do assistente.');
    }

    const result = response as Record<string, unknown>;
    if (
      typeof result['result'] !== 'string'
      || typeof result['usedToday'] !== 'number'
      || typeof result['dailyLimit'] !== 'number'
      || typeof result['remainingToday'] !== 'number'
      || typeof result['resetsAt'] !== 'string'
    ) {
      throw new Error('O backend precisa ser reiniciado para habilitar a versão atual do assistente.');
    }
    return {
      result: result['result'],
      usedToday: result['usedToday'],
      dailyLimit: result['dailyLimit'],
      remainingToday: result['remainingToday'],
      resetsAt: result['resetsAt'],
    };
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
