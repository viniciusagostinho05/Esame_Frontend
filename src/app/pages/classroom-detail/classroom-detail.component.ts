import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AssignmentService } from '../../services/assignment.service';
import { AuthService } from '../../services/auth.service';
import { Assignment } from '../../entities';
import { CreateAssignmentModalComponent } from '../../components/create-assignment-modal/create-assignment-modal.component';
import { AssignmentStudentsModalComponent } from '../../components/assignment-students-modal/assignment-students-modal.component';

@Component({
  selector: 'app-classroom-detail',
  imports: [DatePipe],
  templateUrl: './classroom-detail.component.html',
  styleUrl: './classroom-detail.component.css',
})
export class ClassroomDetailComponent {
  private route = inject(ActivatedRoute);
  private assignmentSrv = inject(AssignmentService);
  private modalSrv = inject(NgbModal);
  protected authSrv = inject(AuthService);

  classroomId = this.route.snapshot.paramMap.get('id')!;

  assignments = signal<Assignment[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  completingId = signal<string | null>(null);

  ngOnInit() {
    this.loadAssignments();
  }

  loadAssignments() {
    this.loading.set(true);
    this.assignmentSrv.list(this.classroomId).subscribe({
      next: assignments => {
        this.assignments.set(assignments);
        this.loading.set(false);
      },
      error: response => {
        this.errorMessage.set(response.error?.message ?? 'Non hai accesso a questa classe');
        this.loading.set(false);
      }
    });
  }

  openCreateModal() {
    const modalRef = this.modalSrv.open(CreateAssignmentModalComponent);
    modalRef.componentInstance.classroomId = this.classroomId;
    modalRef.closed.subscribe(() => this.loadAssignments());
  }

  // bonus: il docente clicca un'attività e vede chi l'ha completata
  openStudentsModal(assignment: Assignment) {
    if (!this.authSrv.isTeacher()) {
      return;
    }
    const modalRef = this.modalSrv.open(AssignmentStudentsModalComponent, { size: 'lg' });
    modalRef.componentInstance.classroomId = this.classroomId;
    modalRef.componentInstance.assignmentId = assignment.id;
    modalRef.componentInstance.assignmentTitle = assignment.title;
  }

  complete(assignment: Assignment) {
    this.completingId.set(assignment.id);
    this.assignmentSrv.complete(this.classroomId, assignment.id).subscribe({
      next: () => {
        this.completingId.set(null);
        this.loadAssignments();
      },
      error: () => {
        this.completingId.set(null);
      }
    });
  }
}
