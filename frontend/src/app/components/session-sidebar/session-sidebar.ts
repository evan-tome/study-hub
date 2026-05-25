import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';
import { StudySession } from '../../models/session.model';

@Component({
  selector: 'app-session-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './session-sidebar.html',
  styleUrl: './session-sidebar.css',
})
export class SessionSidebar implements OnInit, OnDestroy {
  private sessionService = inject(SessionService);
  private auth = inject(AuthService);
  router = inject(Router);

  sessions = signal<StudySession[]>([]);
  collapsed = signal<Record<string, boolean>>({ ended: true });
  private pollInterval?: ReturnType<typeof setInterval>;

  currentUserId = computed(() => this.auth.currentUser()?.id ?? null);
  isLoggedIn = computed(() => this.auth.isLoggedIn());

  private myActiveSessions = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.sessions().filter(
      (s) => this.status(s) !== 'ended' && s.participants.some((p) => p.id === uid)
    );
  });

  createdSessions = computed(() => {
    const uid = this.currentUserId();
    return this.myActiveSessions().filter((s) => s.owner.id === uid);
  });

  joinedSessions = computed(() => {
    const uid = this.currentUserId();
    return this.myActiveSessions().filter((s) => s.owner.id !== uid);
  });

  endedSessions = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.sessions().filter(
      (s) => this.status(s) === 'ended' && s.participants.some((p) => p.id === uid)
    );
  });

  toggleSection(key: string) {
    this.collapsed.update((c) => ({ ...c, [key]: !c[key] }));
  }

  isCollapsed(key: string): boolean {
    return !!this.collapsed()[key];
  }

  ngOnInit() {
    this.load();
    this.pollInterval = setInterval(() => this.load(), 30000);
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
  }

  private load() {
    if (!this.auth.isLoggedIn()) return;
    this.sessionService.getSessions().subscribe({
      next: (s) => this.sessions.set(s),
    });
  }

  isActive(sessionId: string): boolean {
    return this.router.url === `/sessions/${sessionId}`;
  }

  status(s: StudySession): 'live' | 'upcoming' | 'ended' {
    const now = Date.now();
    const start = new Date(s.startTime).getTime();
    const end = new Date(s.endTime).getTime();
    if (now >= start && now <= end) return 'live';
    if (now > end) return 'ended';
    return 'upcoming';
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const time = d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (d.toDateString() === today.toDateString()) return time;
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  }
}
