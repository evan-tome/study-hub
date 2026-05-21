import {
  Component, input, effect, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StudySession } from '../../models/session.model';

// [lng, lat] — MapLibre / GeoJSON order
const BUILDINGS: Record<string, { coords: [number, number]; label: string }> = {
  ERC:   { coords: [-78.89620, 43.94530], label: 'Engineering Research Centre' },
  ACE:   { coords: [-78.89760, 43.94480], label: 'Academic & Collaborative Environment' },
  SIRC:  { coords: [-78.89580, 43.94610], label: 'Software & Informatics Research Centre' },
  OPG:   { coords: [-78.89650, 43.94660], label: 'OPG Engineering Building' },
  SCI:    { coords: [-78.89700, 43.94390], label: 'Science Building' },
  LIB:   { coords: [-78.89730, 43.94510], label: 'Library' },
  HA:    { coords: [-78.89620, 43.94440], label: 'Health Arts Building' },
  BIT: { coords: [-78.89500, 43.94550], label: 'Business & Information Technology Building' },
  UHQ:   { coords: [-78.89680, 43.94500], label: 'University Headquarters' },
};

function extractBuilding(location: string): string | null {
  const up = location.trim().toUpperCase();
  for (const code of Object.keys(BUILDINGS)) {
    if (up === code || up.startsWith(code + ' ') || up.startsWith(code + '-') || up.startsWith(code + ',')) {
      return code;
    }
  }
  return null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return 'Today';
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

@Component({
  selector: 'app-campus-map',
  standalone: true,
  imports: [],
  templateUrl: './campus-map.html',
  styleUrl: './campus-map.css',
})
export class CampusMap implements AfterViewInit, OnDestroy {
  sessions = input<StudySession[]>([]);

  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private map: any = null;
  private ml: any = null;
  private markers: any[] = [];
  private mapLoaded = false;

  constructor() {
    effect(() => {
      this.sessions(); // track signal changes
      if (this.mapLoaded) this.placeMarkers();
    });
  }

  ngAfterViewInit() {
    if (this.isBrowser) this.initMap();
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  private async initMap() {
    this.ml = await import('maplibre-gl');
    this.map = new this.ml.Map({
      container: this.mapEl.nativeElement,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-78.8968, 43.9452],
      zoom: 15.5,
    });
    this.map.on('load', () => {
      this.mapLoaded = true;
      this.placeMarkers();
    });
  }

  private placeMarkers() {
    // Clear old markers
    this.markers.forEach((m) => m.remove());
    this.markers = [];

    // Group in-person sessions by building code
    const groups = new Map<string, StudySession[]>();
    for (const s of this.sessions()) {
      if (s.locationType !== 'room') continue;
      const code = extractBuilding(s.location);
      if (!code) continue;
      if (!groups.has(code)) groups.set(code, []);
      groups.get(code)!.push(s);
    }

    for (const [code, sessions] of groups) {
      const building = BUILDINGS[code];

      // Outer wrapper - MapLibre owns its transform for positioning
      const el = document.createElement('div');
      el.className = 'map-marker-wrap';
      // Inner badge - safe to scale on hover without fighting MapLibre
      const badge = document.createElement('div');
      badge.className = 'map-badge';
      badge.textContent = String(sessions.length);
      el.appendChild(badge);

      // Popup HTML
      const html = `
        <div class="map-popup">
          <p class="popup-building">${building.label}</p>
          ${sessions
            .map(
              (s) => `
            <a href="/sessions/${s.id}" class="popup-session">
              <span class="popup-course">${s.courseCode}</span>
              <span class="popup-desc">${s.description.length > 58 ? s.description.slice(0, 58) + '…' : s.description}</span>
              <span class="popup-time">${formatDay(s.startTime)} · ${formatTime(s.startTime)}</span>
            </a>`
            )
            .join('')}
        </div>`;

      const popup = new this.ml.Popup({
        closeButton: false,
        maxWidth: '290px',
        className: 'otu-popup',
        offset: 22,
      }).setHTML(html);

      const marker = new this.ml.Marker({ element: el })
        .setLngLat(building.coords)
        .setPopup(popup)
        .addTo(this.map);

      this.markers.push(marker);
    }
  }
}
