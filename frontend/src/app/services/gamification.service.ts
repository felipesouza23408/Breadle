import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from './api-url';

export interface MissionProgress {
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
}

export interface Achievement {
  title: string;
  description: string;
  unlocked: boolean;
}

export interface RankingEntry {
  userId: number;
  nome: string;
  tipo: string;
  points: number;
  position: number;
}

export interface GamificationDashboard {
  totalPoints: number;
  booksRead: number;
  readingStreakDays: number;
  weeklyPages: number;
  weeklyGoalPages: number;
  averagePagesPerSession: number;
  nextMilestone: string;
  missions: MissionProgress[];
  achievements: Achievement[];
  ranking: RankingEntry[];
}

@Injectable({ providedIn: 'root' })
export class GamificationService {
  constructor(private http: HttpClient) {}

  getDashboard(): Observable<GamificationDashboard> {
    return this.http.get<GamificationDashboard>(apiUrl('/api/gamification/dashboard'), {
      headers: this.getAuthHeaders(),
    });
  }

  private getAuthHeaders(): { Authorization: string } | Record<string, never> {
    const session = localStorage.getItem('breadle.session');
    if (!session) {
      return {};
    }

    try {
      const parsed = JSON.parse(session) as { token?: string };
      if (!parsed.token) {
        return {};
      }
      return { Authorization: `Bearer ${parsed.token}` };
    } catch {
      return {};
    }
  }
}
