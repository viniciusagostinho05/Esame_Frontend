import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Assignment, AssignmentStudentStatus } from '../entities';

@Injectable({
  providedIn: 'root',
})
export class AssignmentService {
  private http = inject(HttpClient);

  list(classroomId: string) {
    return this.http.get<Assignment[]>(`/api/classrooms/${classroomId}/assignments`);
  }

  create(classroomId: string, title: string) {
    return this.http.post<Assignment>(`/api/classrooms/${classroomId}/assignments`, { title });
  }

  complete(classroomId: string, assignmentId: string) {
    return this.http.patch<Assignment>(`/api/classrooms/${classroomId}/assignments/${assignmentId}`, {});
  }

  studentsStatus(classroomId: string, assignmentId: string) {
    return this.http.get<AssignmentStudentStatus[]>(
      `/api/classrooms/${classroomId}/assignments/${assignmentId}/students`
    );
  }
}
