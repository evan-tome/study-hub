import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Nav } from './components/nav/nav';
import { SessionSidebar } from './components/session-sidebar/session-sidebar';
import { AuthService } from './services/auth.service';
import { LayoutService } from './services/layout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Nav, SessionSidebar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  auth = inject(AuthService);
  layout = inject(LayoutService);
  private router = inject(Router);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    )
  );

  private static readonly NO_SIDEBAR_ROUTES = new Set(['/', '/login', '/register']);
  isLanding = computed(() => App.NO_SIDEBAR_ROUTES.has(this.currentUrl() ?? ''));
}
