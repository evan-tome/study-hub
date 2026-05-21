import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatMessage, CreateSessionDto, StudySession, UserProfile } from '../models/session.model';
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
}
