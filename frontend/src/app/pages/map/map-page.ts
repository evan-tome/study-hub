import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';
import { CampusMap } from '../../components/campus-map/campus-map';
import { StudySession } from '../../models/session.model';

@Component({
  selector: 'app-map-page',
  standalone: true,
  imports: [RouterLink, CampusMap],
  templateUrl: './map-page.html',
  styleUrl: './map-page.css',
})
export class MapPage implements OnInit {
  private sessionService = inject(SessionService);
  private auth = inject(AuthService);

  sessions = signal<StudySession[]>([]);
  userCourses = signal<string[]>([]);
  hoveredSessionId = signal<string | null>(null);
  loading = signal(true);

  inPersonSessions = computed(() =>
    this.sessions().filter(
      (s) => s.locationType === 'room' && this.sessionStatus(s.startTime, s.endTime) !== 'ended'
    )
  );

  ngOnInit() {
    this.sessionService.getSessions().subscribe({
      next: (s) => { this.sessions.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    if (this.auth.isLoggedIn()) {
      this.sessionService.getProfile().subscribe({
        next: (p) => this.userCourses.set(p.courses ?? []),
      });
    }
  }

  sessionStatus(start: string, end: string): 'ongoing' | 'ended' | null {
    const now = Date.now();
    if (now >= new Date(start).getTime() && now <= new Date(end).getTime()) return 'ongoing';
    if (now > new Date(end).getTime()) return 'ended';
    return null;
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
}
