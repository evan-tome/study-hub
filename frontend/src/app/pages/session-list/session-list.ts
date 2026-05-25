import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';
import { CampusMap } from '../../components/campus-map/campus-map';
import { RecommendedSession, StudySession } from '../../models/session.model';


@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [RouterLink, FormsModule, CampusMap, NgTemplateOutlet],
  templateUrl: './session-list.html',
  styleUrl: './session-list.css',
})
export class SessionList implements OnInit {
  private sessionService = inject(SessionService);
  private auth = inject(AuthService);

  currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  sessions = signal<StudySession[]>([]);
  userCourses = signal<string[]>([]);
  recommendations = signal<RecommendedSession[]>([]);
  hoveredSessionId = signal<string | null>(null);
  loading = signal(true);
  error = signal('');
  searchQuery = signal('');
  courseFilter = signal('');

  showEnded = signal(false);

  usedCourses = computed(() => {
    const seen = new Map<string, string>();
    for (const s of this.sessions()) {
      if (this.sessionStatus(s.startTime, s.endTime) !== 'ended' && !seen.has(s.courseCode))
        seen.set(s.courseCode, s.courseName);
    }
    return Array.from(seen.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  });

  filteredSessions = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const c = this.courseFilter();
    const enrolled = new Set(this.userCourses());
    return this.sessions().filter((s) => {
      const matchesCourse =
        !c ? true :
        c === '__my_courses__' ? enrolled.has(s.courseCode) :
        s.courseCode === c;
      const matchesSearch =
        !q ||
        s.courseCode.toLowerCase().includes(q) ||
        s.courseName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.topics.some((t) => t.toLowerCase().includes(q)) ||
        s.owner.name.toLowerCase().includes(q);
      return matchesCourse && matchesSearch;
    });
  });

  myJoinedSessions = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.filteredSessions().filter(
      (s) => this.sessionStatus(s.startTime, s.endTime) !== 'ended' &&
             s.participants.some((p) => p.id === uid)
    );
  });

  myCourseSessions = computed(() => {
    const uid = this.currentUserId();
    const enrolled = new Set(this.userCourses());
    if (enrolled.size === 0) return [];
    return this.filteredSessions().filter(
      (s) => this.sessionStatus(s.startTime, s.endTime) !== 'ended' &&
             !(uid && s.participants.some((p) => p.id === uid)) &&
             enrolled.has(s.courseCode)
    );
  });

  otherActiveSessions = computed(() => {
    const uid = this.currentUserId();
    const enrolled = new Set(this.userCourses());
    return this.filteredSessions().filter(
      (s) => this.sessionStatus(s.startTime, s.endTime) !== 'ended' &&
             !(uid && s.participants.some((p) => p.id === uid)) &&
             !enrolled.has(s.courseCode)
    );
  });

  endedSessions = computed(() =>
    this.filteredSessions().filter((s) => this.sessionStatus(s.startTime, s.endTime) === 'ended')
  );

  activeSectionCount = computed(() =>
    (this.myJoinedSessions().length > 0 ? 1 : 0) +
    (this.myCourseSessions().length > 0 ? 1 : 0) +
    (this.otherActiveSessions().length > 0 ? 1 : 0)
  );

  ngOnInit() {
    this.loadSessions();
    this.loadProfile();
    if (this.auth.isLoggedIn()) {
      this.sessionService.getRecommendations().subscribe({
        next: (r) => this.recommendations.set(r),
      });
    }
  }

  loadProfile() {
    this.sessionService.getProfile().subscribe({
      next: (p) => this.userCourses.set(p.courses ?? []),
    });
  }

  loadSessions() {
    this.loading.set(true);
    this.sessionService.getSessions().subscribe({
      next: (s) => { this.sessions.set(s); this.loading.set(false); },
      error: () => { this.error.set('Failed to load sessions. Is the backend running?'); this.loading.set(false); },
    });
  }

  onSearch(value: string) { this.searchQuery.set(value); }
  onCourseFilter(value: string) { this.courseFilter.set(value); }
  clearFilters() { this.searchQuery.set(''); this.courseFilter.set(''); }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  sessionStatus(start: string, end: string): 'ongoing' | 'ended' | null {
    const now = Date.now();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (now >= s && now <= e) return 'ongoing';
    if (now > e) return 'ended';
    return null;
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  duration(start: string, end: string): string {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${mins}m`;
  }
}
