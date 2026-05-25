import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav implements OnInit, OnDestroy {
  auth = inject(AuthService);
  layout = inject(LayoutService);
  private sessionService = inject(SessionService);

  readonly unreadCount = this.sessionService.unreadCount;

  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.sessionService.refreshUnreadCount();
      this.pollInterval = setInterval(() => this.sessionService.refreshUnreadCount(), 60000);
    }
  }

  ngOnDestroy() {
    clearInterval(this.pollInterval);
  }
}
