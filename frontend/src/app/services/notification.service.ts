import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Observable, timeout } from 'rxjs';
import { apiUrl, webSocketUrl } from './api-url';

export interface UserNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  seen: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private stompClient: Client | null = null;

  constructor(private http: HttpClient) {}

  list(): Observable<UserNotification[]> {
    return this.http
      .get<UserNotification[]>(apiUrl('/api/notifications'), {
        headers: this.getAuthHeaders(),
      })
      .pipe(timeout(8000));
  }

  markAllAsRead(): Observable<string> {
    return this.http
      .post<string>(apiUrl('/api/notifications/read'), {}, {
        headers: this.getAuthHeaders(),
      })
      .pipe(timeout(8000));
  }

  connect(userId: number | null | undefined, onMessage: (notification: UserNotification) => void): void {
    if (!userId || this.stompClient?.active) {
      return;
    }

    this.stompClient = new Client({
      webSocketFactory: () => new WebSocket(webSocketUrl('/api/ws/websocket')),
      connectHeaders: this.getAuthHeaders(),
      reconnectDelay: 5000,
      onConnect: () => {
        this.stompClient?.subscribe(`/topic/notifications/${userId}`, (message: IMessage) => {
          const notification = JSON.parse(message.body) as UserNotification;
          onMessage(notification);
        });
      },
    });

    this.stompClient.activate();
  }

  disconnect(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
  }

  private getAuthHeaders(): { Authorization: string } | Record<string, never> {
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private getAuthToken(): string | null {
    const raw = localStorage.getItem('breadle.session');
    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as { token?: string };
      return session.token || null;
    } catch {
      return null;
    }
  }
}
