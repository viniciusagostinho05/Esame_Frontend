import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { catchError, throwError } from 'rxjs';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authSrv = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    picture: ['', Validators.required],
    role: ['student' as 'student' | 'teacher', Validators.required],
  });

  errorMessage = signal<string | null>(null);

  register() {
    if (this.registerForm.invalid) {
      return;
    }

    this.errorMessage.set(null);
    const value = this.registerForm.getRawValue();

    this.authSrv.register({
      username: value.username!,
      password: value.password!,
      firstName: value.firstName!,
      lastName: value.lastName!,
      picture: value.picture!,
      role: value.role!,
    }).pipe(
      catchError(response => {
        this.errorMessage.set(response.error?.message ?? 'Errore durante la registrazione');
        return throwError(() => response);
      })
    ).subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
