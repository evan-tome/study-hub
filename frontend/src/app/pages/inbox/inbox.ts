import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { Notification } from '../../models/session.model';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './inbox.html',
  styleUrl: './inbox.css',
})
export class Inbox implements OnInit {
  private sessionService = inject(SessionService);

  notifications = signal<Notification[]>([]);
  loading = signal(true);
  error = signal('');
  attendanceInputs: Record<string, number | null> = {};
  submitting = signal<string | null>(null);
  actioning = signal<string | null>(null);

  ngOnInit() {
    this.sessionService.getInbox().subscribe({
      next: (n) => { this.notifications.set(n); this.loading.set(false); },
      error: () => { this.error.set('Failed to load inbox.'); this.loading.set(false); },
    });
  }

  markRead(notif: Notification) {
    if (notif.read) return;
    this.sessionService.markNotificationRead(notif.id).subscribe({
      next: (updated) => this.updateNotif(updated),
    });
  }

  submitAttendance(notif: Notification) {
    const count = this.attendanceInputs[notif.id];
    if (count == null || count < 0) return;
    this.submitting.set(notif.id);
    this.sessionService.submitAttendance(notif.id, count).subscribe({
      next: (updated) => {
        this.updateNotif(updated);
        this.submitting.set(null);
      },
      error: () => this.submitting.set(null),
    });
  }

  approveRequest(notif: Notification) {
    this.actioning.set(notif.id);
    this.sessionService.approveJoinRequest(notif.id).subscribe({
      next: (updated) => { this.updateNotif(updated); this.actioning.set(null); },
      error: () => this.actioning.set(null),
    });
  }

  denyRequest(notif: Notification) {
    this.actioning.set(notif.id);
    this.sessionService.denyJoinRequest(notif.id).subscribe({
      next: (updated) => { this.updateNotif(updated); this.actioning.set(null); },
      error: () => this.actioning.set(null),
    });
  }

  private updateNotif(updated: Notification) {
    this.notifications.update((list) => list.map((n) => n.id === updated.id ? updated : n));
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return this.formatDate(iso);
  }
}
