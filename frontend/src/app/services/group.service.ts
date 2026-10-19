import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ReadingGroup {
  id: number;
  name: string;
  description: string;
  ownerId: number;
  challengeName: string;
  challengeTargetPages: number;
  memberCount: number;
  joined: boolean;
  createdAt: string;
}

export interface CreateGroupPayload {
  name: string;
  description: string;
}

export interface GroupLeaderboardEntry {
  userId: number;
  userName: string;
  userType: string;
  pagesRead: number;
  position: number;
}

export interface GroupChallenge {
  id: number;
  title: string;
  description: string;
  targetPages: number;
  progress: number;
  startsAt: string;
  endsAt: string;
  status: string;
}

export interface GroupActivity {
  id: number;
  userId: number;
  userName: string;
  message: string;
  type: string;
  createdAt: string;
}

export interface GroupChatMessage {
  id: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class GroupService {
  constructor(private http: HttpClient) {}

  list(): Observable<ReadingGroup[]> {
    return this.http.get<ReadingGroup[]>('http://localhost:8080/api/groups', {
      headers: this.getAuthHeaders(),
    });
  }

  myGroups(): Observable<ReadingGroup[]> {
    return this.http.get<ReadingGroup[]>('http://localhost:8080/api/groups/me', {
      headers: this.getAuthHeaders(),
    });
  }

  create(payload: CreateGroupPayload): Observable<ReadingGroup> {
    return this.http.post<ReadingGroup>('http://localhost:8080/api/groups', payload, {
      headers: this.getAuthHeaders(),
    });
  }

  join(groupId: number): Observable<ReadingGroup> {
    return this.http.post<ReadingGroup>(`http://localhost:8080/api/groups/${groupId}/join`, {}, {
      headers: this.getAuthHeaders(),
    });
  }

  leaderboard(groupId: number): Observable<GroupLeaderboardEntry[]> {
    return this.http.get<GroupLeaderboardEntry[]>(`http://localhost:8080/api/groups/${groupId}/leaderboard`, {
      headers: this.getAuthHeaders(),
    });
  }

  challenges(groupId: number): Observable<GroupChallenge[]> {
    return this.http.get<GroupChallenge[]>(`http://localhost:8080/api/groups/${groupId}/challenges`, {
      headers: this.getAuthHeaders(),
    });
  }

  createChallenge(groupId: number, payload: { title: string; description: string; targetPages: number }): Observable<GroupChallenge> {
    return this.http.post<GroupChallenge>(`http://localhost:8080/api/groups/${groupId}/challenges`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  activities(groupId: number): Observable<GroupActivity[]> {
    return this.http.get<GroupActivity[]>(`http://localhost:8080/api/groups/${groupId}/activity`, {
      headers: this.getAuthHeaders(),
    });
  }

  messages(groupId: number): Observable<GroupChatMessage[]> {
    return this.http.get<GroupChatMessage[]>(`http://localhost:8080/api/groups/${groupId}/chat`, {
      headers: this.getAuthHeaders(),
    });
  }

  sendMessage(groupId: number, content: string): Observable<GroupChatMessage> {
    return this.http.post<GroupChatMessage>(`http://localhost:8080/api/groups/${groupId}/chat`, { content }, {
      headers: this.getAuthHeaders(),
    });
  }

  private getAuthHeaders(): { Authorization: string } | Record<string, never> {
    const raw = localStorage.getItem('breadle.session');
    if (!raw) {
      return {};
    }

    try {
      const session = JSON.parse(raw) as { token?: string };
      if (!session.token) {
        return {};
      }
      return { Authorization: `Bearer ${session.token}` };
    } catch {
      return {};
    }
  }
}
