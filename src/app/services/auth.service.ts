import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';
import { JwtService } from './jwt.service';
import { Role, User } from '../entities';

export interface RegisterData {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  picture: string;
  role: Role;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  protected http = inject(HttpClient);
  protected jwtSrv = inject(JwtService);

  protected _currentUser = signal<User | null>(null);
  currentUser = this._currentUser.asReadonly();

  isAuthenticated = computed(() => !!this.currentUser());
  isTeacher = computed(() => this.currentUser()?.role === 'teacher');
  isStudent = computed(() => this.currentUser()?.role === 'student');

  constructor() {
    this.fetchUser().subscribe();
  }

  fetchUser() {
    return this.http.get<User>('/api/users/me')
      .pipe(
        catchError(() => {
          this.jwtSrv.removeToken();
          return of(null);
        }),
        tap(user => this._currentUser.set(user))
      );
  }

  login(username: string, password: string) {
    return this.http.post<{ user: User, token: string }>('/api/login', { username, password })
      .pipe(
        tap(res => this.jwtSrv.setToken(res.token)),
        map(res => res.user),
        tap(user => this._currentUser.set(user))
      );
  }

  register(data: RegisterData) {
    return this.http.post<User>('/api/register', data);
  }

  logout() {
    this.jwtSrv.removeToken();
    this._currentUser.set(null);
  }

}
