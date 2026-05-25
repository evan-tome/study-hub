import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';
import { RecommendedSession, StudySession } from '../../models/session.model';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [RouterLink, FormsModule, NgTemplateOutlet],
  templateUrl: './discover.html',
  styleUrl: './discover.css',
})
export class Discover implements OnInit {
  private sessionService = inject(SessionService);
  private auth = inject(AuthService);

  currentUserId = computed(() => this.auth.currentUser()?.id ?? null);
  isLoggedIn = computed(() => this.auth.isLoggedIn());

  sessions = signal<StudySession[]>([]);
  userCourses = signal<string[]>([]);
  recommendations = signal<RecommendedSession[]>([]);
  loading = signal(true);
  error = signal('');

  searchQuery = signal('');
  courseFilter = signal('');   // '' | '__my_courses__'
  deptFilter = signal('');     // e.g. 'CSCI', 'MATH'
  typeFilter = signal('all');  // 'all' | 'online' | 'room'
  sortBy = signal('soonest');  // 'soonest' | 'popular' | 'newest'

  departments = computed(() => {
    const seen = new Set<string>();
    for (const s of this.sessions()) {
      if (this.status(s) !== 'ended') {
        const m = s.courseCode.match(/^[A-Z]+/);
        if (m) seen.add(m[0]);
      }
    }
    return Array.from(seen).sort();
  });

  liveCount = computed(() =>
    this.sessions().filter(s => this.status(s) === 'live').length
  );

  todayUpcoming = computed(() => {
    const today = new Date().toDateString();
    return this.sessions().filter(s =>
      this.status(s) === 'upcoming' &&
      new Date(s.startTime).toDateString() === today
    ).length;
  });

  totalActive = computed(() =>
    this.sessions().filter(s => this.status(s) !== 'ended').length
  );

  hasActiveFilters = computed(() =>
    !!this.searchQuery() || !!this.courseFilter() ||
    !!this.deptFilter() || this.typeFilter() !== 'all'
  );

  private filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const c = this.courseFilter();
    const dept = this.deptFilter();
    const type = this.typeFilter();
    const sort = this.sortBy();
    const enrolled = new Set(this.userCourses());

    let results = this.sessions().filter((s) => {
      const matchesCourse =
        !c ? true :
        c === '__my_courses__' ? enrolled.has(s.courseCode) :
        s.courseCode === c;
      const matchesDept = !dept || s.courseCode.startsWith(dept);
      const matchesType = type === 'all' || s.locationType === type;
      const matchesSearch =
        !q ||
        s.courseCode.toLowerCase().includes(q) ||
        s.courseName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.topics.some((t) => t.toLowerCase().includes(q)) ||
        s.owner.name.toLowerCase().includes(q);
      return matchesCourse && matchesDept && matchesType && matchesSearch;
    });

    if (sort === 'popular') {
      results = [...results].sort((a, b) => b.participants.length - a.participants.length);
    } else if (sort === 'soonest') {
      results = [...results].sort((a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    }

    return results;
  });

  liveSessions = computed(() =>
    this.filtered().filter((s) => this.status(s) === 'live')
  );

  mySessions = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.filtered().filter(
      (s) => this.status(s) !== 'ended' && s.participants.some((p) => p.id === uid)
    );
  });

  myCourseSessions = computed(() => {
    const uid = this.currentUserId();
    const enrolled = new Set(this.userCourses());
    if (!enrolled.size) return [];
    return this.filtered().filter(
      (s) => this.status(s) !== 'ended' &&
             enrolled.has(s.courseCode) &&
             !(uid && s.participants.some((p) => p.id === uid))
    );
  });

  upcomingSessions = computed(() => {
    const uid = this.currentUserId();
    const enrolled = new Set(this.userCourses());
    return this.filtered().filter(
      (s) => this.status(s) === 'upcoming' &&
             !(uid && s.participants.some((p) => p.id === uid)) &&
             !enrolled.has(s.courseCode)
    );
  });

  filteredRecs = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const c = this.courseFilter();
    const dept = this.deptFilter();
    const type = this.typeFilter();
    const enrolled = new Set(this.userCourses());
    const uid = this.currentUserId();
    return this.recommendations().filter((s) => {
      if (uid && s.participants.some((p) => p.id === uid)) return false;
      if (c === '__my_courses__' && !enrolled.has(s.courseCode)) return false;
      if (c && c !== '__my_courses__' && s.courseCode !== c) return false;
      if (dept && !s.courseCode.startsWith(dept)) return false;
      if (type !== 'all' && s.locationType !== type) return false;
      if (!q) return true;
      return s.courseCode.toLowerCase().includes(q) ||
             s.courseName.toLowerCase().includes(q) ||
             s.description.toLowerCase().includes(q);
    });
  });

  hasResults = computed(() =>
    this.liveSessions().length > 0 ||
    this.mySessions().length > 0 ||
    this.myCourseSessions().length > 0 ||
    this.upcomingSessions().length > 0 ||
    this.filteredRecs().length > 0
  );

  ngOnInit() {
    this.sessionService.getSessions().subscribe({
      next: (s) => { this.sessions.set(s); this.loading.set(false); },
      error: () => { this.error.set('Failed to load sessions.'); this.loading.set(false); },
    });
    this.sessionService.getProfile().subscribe({
      next: (p) => this.userCourses.set(p.courses ?? []),
    });
    if (this.auth.isLoggedIn()) {
      this.sessionService.getRecommendations().subscribe({
        next: (r) => this.recommendations.set(r),
      });
    }
  }

  onSearch(value: string) { this.searchQuery.set(value); }

  selectCategory(course: string, dept: string) {
    this.courseFilter.set(course);
    this.deptFilter.set(dept);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.courseFilter.set('');
    this.deptFilter.set('');
    this.typeFilter.set('all');
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
    return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true });
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
