import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  sessionPanelOpen = signal(false);

  toggleSessionPanel() {
    this.sessionPanelOpen.update((v) => !v);
  }

  closeSessionPanel() {
    this.sessionPanelOpen.set(false);
  }
}
