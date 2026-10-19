import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { catchError, throwError } from 'rxjs';
import { ClassroomService } from '../../services/classroom.service';
import { UserService } from '../../services/user.service';
import { User } from '../../entities';

@Component({
  selector: 'app-create-classroom-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './create-classroom-modal.component.html',
  styleUrl: './create-classroom-modal.component.css',
})
export class CreateClassroomModalComponent {
  protected activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);
  private classroomSrv = inject(ClassroomService);
  private userSrv = inject(UserService);

  students = signal<User[]>([]);
  selectedStudentIds = signal<Set<string>>(new Set());
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
  });

  ngOnInit() {
    this.userSrv.listStudents().subscribe(students => this.students.set(students));
  }

  toggleStudent(studentId: string, checked: boolean) {
    const current = new Set(this.selectedStudentIds());
    if (checked) {
      current.add(studentId);
    } else {
      current.delete(studentId);
    }
    this.selectedStudentIds.set(current);
  }

  isSelected(studentId: string): boolean {
    return this.selectedStudentIds().has(studentId);
  }

  create() {
    if (this.form.invalid || this.selectedStudentIds().size === 0) {
      this.errorMessage.set('Inserisci un nome e seleziona almeno uno studente');
      return;
    }

    const name = this.form.value.name!;
    const students = Array.from(this.selectedStudentIds());

    this.classroomSrv.create(name, students)
      .pipe(
        catchError(response => {
          this.errorMessage.set(response.error?.message ?? 'Errore nella creazione della classe');
          return throwError(() => response);
        })
      )
      .subscribe(() => this.activeModal.close());
  }
}
