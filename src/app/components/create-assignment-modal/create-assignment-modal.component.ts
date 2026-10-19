import { Component, inject, Input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { catchError, throwError } from 'rxjs';
import { AssignmentService } from '../../services/assignment.service';

@Component({
  selector: 'app-create-assignment-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './create-assignment-modal.component.html',
  styleUrl: './create-assignment-modal.component.css',
})
export class CreateAssignmentModalComponent {
  @Input() classroomId!: string;

  protected activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);
  private assignmentSrv = inject(AssignmentService);

  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    title: ['', Validators.required],
  });

  create() {
    if (this.form.invalid) {
      return;
    }

    this.assignmentSrv.create(this.classroomId, this.form.value.title!)
      .pipe(
        catchError(response => {
          this.errorMessage.set(response.error?.message ?? "Errore nella creazione dell'attività");
          return throwError(() => response);
        })
      )
      .subscribe(() => this.activeModal.close());
  }
}
