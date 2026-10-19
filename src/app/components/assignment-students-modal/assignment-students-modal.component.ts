import { DatePipe } from '@angular/common';
import { Component, inject, Input, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AssignmentService } from '../../services/assignment.service';
import { AssignmentStudentStatus } from '../../entities';

@Component({
  selector: 'app-assignment-students-modal',
  imports: [DatePipe],
  templateUrl: './assignment-students-modal.component.html',
  styleUrl: './assignment-students-modal.component.css',
})
export class AssignmentStudentsModalComponent {
  @Input() classroomId!: string;
  @Input() assignmentId!: string;
  @Input() assignmentTitle = '';

  protected activeModal = inject(NgbActiveModal);
  private assignmentSrv = inject(AssignmentService);

  statuses = signal<AssignmentStudentStatus[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.assignmentSrv.studentsStatus(this.classroomId, this.assignmentId)
      .subscribe(statuses => {
        this.statuses.set(statuses);
        this.loading.set(false);
      });
  }
}
