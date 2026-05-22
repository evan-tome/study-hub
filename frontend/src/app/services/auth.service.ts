import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { AuthResponse, AuthUser } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private base = '/api/auth';

  currentUser = signal<AuthUser | null>(this.loadUser());

  private storage(op: 'get' | 'set' | 'remove', key: string, value?: string): string | null {
    if (!this.isBrowser) return null;
    if (op === 'get') return localStorage.getItem(key);
    if (op === 'set') localStorage.setItem(key, value!);
    if (op === 'remove') localStorage.removeItem(key);
    return null;
  }

  private loadUser(): AuthUser | null {
    if (!this.isBrowser) return null;
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        return null;
      }
      return { id: payload.userId, name: payload.name, email: payload.email, isAdmin: payload.isAdmin ?? false };
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.storage('get', 'token');
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  register(name: string, email: string, password: string, program: string, year: number) {
    return this.http.post<AuthResponse>(`${this.base}/register`, { name, email, password, program, year }).pipe(
      tap((res) => this.storeSession(res))
    );
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password }).pipe(
      tap((res) => this.storeSession(res))
    );
  }

  logout() {
    this.storage('remove', 'token');
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  private storeSession(res: AuthResponse) {
    this.storage('set', 'token', res.token);
    this.currentUser.set(this.loadUser());
  }
}
