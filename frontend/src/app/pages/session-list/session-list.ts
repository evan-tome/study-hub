import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { CampusMap } from '../../components/campus-map/campus-map';
import { StudySession } from '../../models/session.model';


@Component({
  selector: 'app-session-list',
  standalone: true,
  imports: [RouterLink, FormsModule, CampusMap],
  templateUrl: './session-list.html',
  styleUrl: './session-list.css',
})
export class SessionList implements OnInit {
  private sessionService = inject(SessionService);

  sessions = signal<StudySession[]>([]);
  loading = signal(true);
  error = signal('');
  searchQuery = signal('');
  courseFilter = signal('');

  usedCourses = computed(() => {
    const seen = new Map<string, string>();
    for (const s of this.sessions()) {
      if (!seen.has(s.courseCode)) seen.set(s.courseCode, s.courseName);
    }
    return Array.from(seen.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  });

  filteredSessions = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const c = this.courseFilter();
    return this.sessions().filter((s) => {
      const matchesCourse = !c || s.courseCode === c;
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

  ngOnInit() { this.loadSessions(); }

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
    const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${mins}m`;
  }
}
