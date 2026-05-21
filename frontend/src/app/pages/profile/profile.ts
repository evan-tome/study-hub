import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';
import { Course } from '../../data/courses';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private sessionService = inject(SessionService);
  auth = inject(AuthService);

  allCourses = signal<Course[]>([]);
  selectedCodes = signal<string[]>([]);
  program = signal('');
  year = signal(1);
  courseQuery = signal('');
  dropdownOpen = signal(false);
  loading = signal(true);
  saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  filteredCourses = computed(() => {
    const q = this.courseQuery().toLowerCase().trim();
    const selected = new Set(this.selectedCodes());
    const all = this.allCourses().filter((c) => !selected.has(c.code));
    if (!q) return all.slice(0, 10);
    return all.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    ).slice(0, 10);
  });

  selectedCourses = computed(() =>
    this.selectedCodes()
      .map((code) => this.allCourses().find((c) => c.code === code))
      .filter((c): c is Course => !!c)
  );

  ngOnInit() {
    this.sessionService.getCourses().subscribe({
      next: (courses) => {
        this.allCourses.set(courses);
        this.sessionService.getProfile().subscribe({
          next: (p) => {
            this.selectedCodes.set(p.courses);
            this.program.set(p.program ?? '');
            this.year.set(Math.min(10, Math.max(1, p.year || 1)));
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  incrementYear() { this.year.update((y) => Math.min(10, y + 1)); this.saveState.set('idle'); }
  decrementYear() { this.year.update((y) => Math.max(1, y - 1)); this.saveState.set('idle'); }

  onCourseInput(value: string) {
    this.courseQuery.set(value);
    this.dropdownOpen.set(true);
  }

  selectCourse(course: Course) {
    this.selectedCodes.update((codes) => [...codes, course.code]);
    this.courseQuery.set('');
    this.dropdownOpen.set(false);
    this.saveState.set('idle');
  }

  removeCourse(code: string) {
    this.selectedCodes.update((codes) => codes.filter((c) => c !== code));
    this.saveState.set('idle');
  }

  onBlur() {
    setTimeout(() => this.dropdownOpen.set(false), 150);
  }

  save() {
    this.saveState.set('saving');
    this.sessionService.updateProfile({
      courses: this.selectedCodes(),
      program: this.program(),
      year: this.year(),
    }).subscribe({
      next: () => {
        this.saveState.set('saved');
        setTimeout(() => this.saveState.set('idle'), 2500);
      },
      error: (e) => { console.error('Profile save failed:', e); this.saveState.set('error'); },
    });
  }
}
