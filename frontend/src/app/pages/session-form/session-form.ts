import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { Course } from '../../data/courses';

@Component({
  selector: 'app-session-form',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './session-form.html',
  styleUrl: './session-form.css',
})
export class SessionForm implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sessionService = inject(SessionService);

  editId: string | null = null;
  get isEdit() { return !!this.editId; }

  allCourses = signal<Course[]>([]);
  coursesLoading = signal(true);
  courseQuery = signal('');
  dropdownOpen = signal(false);
  selectedCourse = signal<Course | null>(null);

  filteredCourses = computed(() => {
    const q = this.courseQuery().toLowerCase().trim();
    const all = this.allCourses();
    if (!q) return all;
    return all.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    ).slice(0, 12);
  });

  topics = signal<string[]>([]);
  topicInput = signal('');
  submitting = signal(false);
  submitError = signal('');
  locationType = signal<'room' | 'online'>('room');

  form = this.fb.group({
    courseCode: ['', Validators.required],
    description: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    location: ['', Validators.required],
    maxParticipants: [null as number | null, [Validators.min(2)]],
  });

  ngOnInit() {
    this.editId = this.route.snapshot.paramMap.get('id');

    this.sessionService.getCourses().subscribe({
      next: (courses) => {
        this.allCourses.set(courses);
        this.coursesLoading.set(false);
        if (this.editId) this.loadSession(courses);
      },
      error: () => this.coursesLoading.set(false),
    });

    if (!this.editId) {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const start = new Date(now.getTime() + 3600000);
      const end = new Date(now.getTime() + 7200000);
      this.form.patchValue({ startTime: this.toLocal(start), endTime: this.toLocal(end) });
    }
  }

  private loadSession(courses: Course[]) {
    this.sessionService.getSession(this.editId!).subscribe({
      next: (s) => {
        const course = courses.find((c) => c.code === s.courseCode)
          ?? { code: s.courseCode, name: s.courseName, faculty: '' };
        this.selectedCourse.set(course);
        this.courseQuery.set(course.code + ' — ' + course.name);
        this.locationType.set(s.locationType);
        this.topics.set([...s.topics]);
        this.form.patchValue({
          courseCode: s.courseCode,
          description: s.description,
          startTime: this.toLocal(new Date(s.startTime)),
          endTime: this.toLocal(new Date(s.endTime)),
          location: s.location,
          maxParticipants: s.maxParticipants ?? null,
        });
      },
    });
  }

  private toLocal(d: Date): string {
    const p = (n: number) => n.toString().padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  onCourseInput(value: string) {
    this.courseQuery.set(value);
    this.dropdownOpen.set(true);
    if (!value) {
      this.selectedCourse.set(null);
      this.form.patchValue({ courseCode: '' });
    }
  }

  selectCourse(course: Course) {
    this.selectedCourse.set(course);
    this.courseQuery.set(course.code + ' — ' + course.name);
    this.form.patchValue({ courseCode: course.code });
    this.dropdownOpen.set(false);
  }

  clearCourse() {
    this.selectedCourse.set(null);
    this.courseQuery.set('');
    this.form.patchValue({ courseCode: '' });
    this.dropdownOpen.set(false);
  }

  onCourseBlur() {
    setTimeout(() => this.dropdownOpen.set(false), 150);
  }

  setLocationType(type: 'room' | 'online') {
    this.locationType.set(type);
    this.form.patchValue({ location: '' });
  }

  addTopic() {
    const t = this.topicInput().trim();
    if (t && !this.topics().includes(t)) this.topics.update((a) => [...a, t]);
    this.topicInput.set('');
  }

  onTopicKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.addTopic(); }
  }

  removeTopic(topic: string) {
    this.topics.update((a) => a.filter((x) => x !== topic));
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    const start = new Date(v.startTime!);
    const end = new Date(v.endTime!);
    if (end <= start) { this.submitError.set('End time must be after start time.'); return; }

    this.submitting.set(true);
    this.submitError.set('');
    const payload = {
      courseCode: v.courseCode!,
      topics: this.topics(),
      description: v.description!,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      locationType: this.locationType(),
      location: v.location!,
      maxParticipants: v.maxParticipants ? Number(v.maxParticipants) : null,
    };

    const req$ = this.isEdit
      ? this.sessionService.updateSession(this.editId!, payload)
      : this.sessionService.createSession(payload);

    req$.subscribe({
      next: (s) => this.router.navigate(['/sessions', s.id]),
      error: () => {
        this.submitError.set(this.isEdit ? 'Failed to save changes.' : 'Failed to create session.');
        this.submitting.set(false);
      },
    });
  }

  fieldError(name: string) {
    const c = this.form.get(name);
    return c?.invalid && c?.touched;
  }
}
