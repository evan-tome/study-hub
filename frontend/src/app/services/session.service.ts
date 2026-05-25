import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminSession, AdminStats, AdminUser, ChatMessage, CreateSessionDto, Notification, RecommendedSession, SqlView, StudySession, UserProfile } from '../models/session.model';
import { Course } from '../data/courses';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  private base = '/api';

  getSessions(course?: string): Observable<StudySession[]> {
    let params = new HttpParams();
    if (course) params = params.set('course', course);
    return this.http.get<StudySession[]>(`${this.base}/sessions`, { params });
  }

  getSession(id: string): Observable<StudySession> {
    return this.http.get<StudySession>(`${this.base}/sessions/${id}`);
  }

  createSession(data: CreateSessionDto): Observable<StudySession> {
    return this.http.post<StudySession>(`${this.base}/sessions`, data);
  }

  updateSession(id: string, data: CreateSessionDto): Observable<StudySession> {
    return this.http.put<StudySession>(`${this.base}/sessions/${id}`, data);
  }

  joinSession(id: string): Observable<StudySession> {
    return this.http.post<StudySession>(`${this.base}/sessions/${id}/join`, {});
  }

  leaveSession(id: string): Observable<StudySession> {
    return this.http.post<StudySession>(`${this.base}/sessions/${id}/leave`, {});
  }

  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${id}`);
  }

  getMessages(sessionId: string, after?: string): Observable<ChatMessage[]> {
    let url = `${this.base}/sessions/${sessionId}/messages`;
    if (after) url += `?after=${encodeURIComponent(after)}`;
    return this.http.get<ChatMessage[]>(url);
  }

  sendMessage(sessionId: string, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/sessions/${sessionId}/messages`, { content });
  }

  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.base}/courses`);
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/auth/profile`);
  }

  updateProfile(data: { courses: string[]; program: string; year: number }): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.base}/auth/profile`, data);
  }

  getRecommendations(): Observable<RecommendedSession[]> {
    return this.http.get<RecommendedSession[]>(`${this.base}/recommendations`);
  }

  getAdminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.base}/admin/stats`);
  }

  getAdminUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.base}/admin/users`);
  }

  deleteAdminUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/users/${id}`);
  }

  getAdminSessions(): Observable<AdminSession[]> {
    return this.http.get<AdminSession[]>(`${this.base}/admin/sessions`);
  }

  deleteAdminSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/sessions/${id}`);
  }

  getAdminViews(): Observable<SqlView[]> {
    return this.http.get<SqlView[]>(`${this.base}/admin/views`);
  }

  runAdminView(view: string): Observable<any[]> {
    return this.http.post<any[]>(`${this.base}/admin/query`, { view });
  }

  endSessionEarly(sessionId: string): Observable<StudySession> {
    return this.http.post<StudySession>(`${this.base}/sessions/${sessionId}/end`, {});
  }

  getJoinStatus(sessionId: string): Observable<{ status: 'none' | 'pending' }> {
    return this.http.get<{ status: 'none' | 'pending' }>(`${this.base}/sessions/${sessionId}/join-status`);
  }

  requestJoin(sessionId: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.base}/sessions/${sessionId}/request-join`, {});
  }

  approveJoinRequest(notifId: string): Observable<Notification> {
    return this.http.post<Notification>(`${this.base}/inbox/${notifId}/approve`, {});
  }

  denyJoinRequest(notifId: string): Observable<Notification> {
    return this.http.post<Notification>(`${this.base}/inbox/${notifId}/deny`, {});
  }

  getInbox(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.base}/inbox`);
  }

  getInboxUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/inbox/unread-count`);
  }

  markNotificationRead(id: string): Observable<Notification> {
    return this.http.post<Notification>(`${this.base}/inbox/${id}/read`, {});
  }

  submitAttendance(id: string, attendeeCount: number): Observable<Notification> {
    return this.http.post<Notification>(`${this.base}/inbox/${id}/attendance`, { attendeeCount });
  }

}
