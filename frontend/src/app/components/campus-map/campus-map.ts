import {
  Component, input, effect, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, inject, PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StudySession } from '../../models/session.model';

// [lng, lat] — MapLibre / GeoJSON order
const BUILDINGS: Record<string, { coords: [number, number]; label: string }> = {
  SCI:    { coords: [-78.89630473936765, 43.944542718281625], label: 'Science Building' },
  BIT: { coords: [-78.89597448487845, 43.94519984975245], label: 'Business & Information Technology Building' },
  ERC:   { coords: [-78.89627409103717, 43.94567719866937], label: 'Energy Research Centre' },
  SHA: { coords: [-78.89643660007148, 43.94612175302942], label: 'Shawenjigewining Hall' },
  ACE:   { coords: [-78.89932126226566, 43.945645698145235], label: 'Academic & Collaborative Environment' },
  OPG:   { coords: [-78.8983223079879, 43.945759800878946], label: 'OPG Engineering Building' },
  SIRC:  { coords: [-78.89913953129742, 43.947791624575046], label: 'Software & Informatics Research Centre' },
  LIB:   { coords: [-78.89728975390315, 43.94585734955008], label: 'Library' },
  CRWC:   { coords: [-78.89603854208995, 43.94389457591058], label: 'Campus Recreation and Wellness Centre' },
  DC:   { coords: [-78.89603854208995, 43.94389457591058], label: 'Durham College' },
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

function sessionStatus(start: string, end: string): 'ongoing' | 'ended' | null {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now >= s && now <= e) return 'ongoing';
  if (now > e) return 'ended';
  return null;
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return 'Today';
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

interface MarkerEntry {
  marker: any;
  badge: HTMLElement;
  popup: any;
  building: { coords: [number, number]; label: string };
  sessions: StudySession[];
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
  userCourses = input<string[]>([]);
  activeSessionId = input<string | null>(null);

  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private map: any = null;
  private ml: any = null;
  private markers: any[] = [];
  private markerData = new Map<string, MarkerEntry>();
  private mapLoaded = false;

  constructor() {
    effect(() => {
      this.sessions();
      this.userCourses();
      if (this.mapLoaded) this.placeMarkers();
    });

    effect(() => {
      const activeId = this.activeSessionId();
      if (this.mapLoaded) this.updateActiveState(activeId);
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

  private buildPopupHtml(building: MarkerEntry['building'], sessions: StudySession[], activeId: string | null): string {
    return `
      <div class="map-popup">
        <p class="popup-building">${building.label}</p>
        ${sessions.map((s) => `
          <a href="/sessions/${s.id}" class="popup-session${s.id === activeId ? ' popup-session--active' : ''}">
            <span class="popup-course">${s.courseCode} - ${s.courseName}</span>
            <span class="popup-desc">${s.description.length > 58 ? s.description.slice(0, 58) + '…' : s.description}</span>
            <span class="popup-time">${sessionStatus(s.startTime, s.endTime) === 'ongoing' ? '<span class="popup-status ongoing">Live</span>' : sessionStatus(s.startTime, s.endTime) === 'ended' ? '<span class="popup-status ended">Ended</span>' : ''}${formatDay(s.startTime)} · ${formatTime(s.startTime)} - ${formatTime(s.endTime)}</span>
          </a>`).join('')}
      </div>`;
  }

  private placeMarkers() {
    this.markers.forEach((m) => m.remove());
    this.markers = [];
    this.markerData.clear();

    const enrolled = new Set(this.userCourses());

    const groups = new Map<string, StudySession[]>();
    for (const s of this.sessions()) {
      if (s.locationType !== 'room') continue;
      if (sessionStatus(s.startTime, s.endTime) === 'ended') continue;
      const code = extractBuilding(s.location);
      if (!code) continue;
      if (!groups.has(code)) groups.set(code, []);
      groups.get(code)!.push(s);
    }

    for (const [code, sessions] of groups) {
      const building = BUILDINGS[code];
      const hasEnrolled = enrolled.size > 0 && sessions.some((s) => enrolled.has(s.courseCode));

      const el = document.createElement('div');
      el.className = 'map-marker-wrap';
      const badge = document.createElement('div');
      badge.className = 'map-badge' + (hasEnrolled ? ' map-badge--enrolled' : '');
      badge.textContent = String(sessions.length);
      el.appendChild(badge);

      const popup = new this.ml.Popup({
        closeButton: false,
        maxWidth: '290px',
        className: 'otu-popup',
        offset: 22,
      }).setHTML(this.buildPopupHtml(building, sessions, null));

      const marker = new this.ml.Marker({ element: el })
        .setLngLat(building.coords)
        .setPopup(popup)
        .addTo(this.map);

      this.markerData.set(code, { marker, badge, popup, building, sessions });
      this.markers.push(marker);
    }

    this.updateActiveState(this.activeSessionId());
  }

  private updateActiveState(activeId: string | null) {
    for (const [, data] of this.markerData) {
      const isActive = activeId !== null && data.sessions.some((s) => s.id === activeId);
      data.badge.classList.toggle('map-badge--active', isActive);
      data.popup.setHTML(this.buildPopupHtml(data.building, data.sessions, activeId));
    }
  }
}
