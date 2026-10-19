import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User } from '../entities';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  listStudents() {
    return this.http.get<User[]>('/api/users', { params: { type: 'student' } });
  }
}
