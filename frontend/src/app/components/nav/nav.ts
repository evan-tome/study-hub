import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private sessionService = inject(SessionService);

  unreadCount = signal(0);
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.fetchUnread();
      this.pollInterval = setInterval(() => this.fetchUnread(), 60000);
    }
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
  }

  private fetchUnread() {
    if (!this.auth.isLoggedIn()) return;
    this.sessionService.getInboxUnreadCount().subscribe({
      next: ({ count }) => this.unreadCount.set(count),
    });
  }
}
