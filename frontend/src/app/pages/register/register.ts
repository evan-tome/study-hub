import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    program: [''],
  });

  loading = signal(false);
  error = signal('');

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const { name, email, password, program } = this.form.value;
    this.authService.register(name!, email!, password!, program ?? '', 1).subscribe({
      next: () => this.router.navigate(['/profile']),
      error: (e) => {
        this.error.set(e.error?.error ?? 'Registration failed. Please try again.');
        this.loading.set(false);
      },
    });
  }

  fieldError(name: string) {
    const c = this.form.get(name);
    return c?.invalid && c?.touched;
  }
}
