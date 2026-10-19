import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  protected fb = inject(FormBuilder);
  protected authSrv = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  loginForm = this.fb.group({
    username: ['', { validators: [Validators.required] }],
    password: ['', { validators: [Validators.required] }]
  });

  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loginForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.errorMessage.set(null));
  }

  login() {
    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;
      this.authSrv.login(username!, password!)
        .pipe(
          catchError(response => {
            const message = response.error?.message ?? 'Errore di login';
            this.errorMessage.set(message);
            return throwError(() => response);
          })
        )
        .subscribe(() => {
          const dest = this.activatedRoute.snapshot.queryParams['dest'] || '/classrooms';
          this.router.navigate([dest]);
        });
    }
  }
}
