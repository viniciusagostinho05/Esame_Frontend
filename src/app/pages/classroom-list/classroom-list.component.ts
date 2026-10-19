import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ClassroomService } from '../../services/classroom.service';
import { AuthService } from '../../services/auth.service';
import { Classroom } from '../../entities';
import { CreateClassroomModalComponent } from '../../components/create-classroom-modal/create-classroom-modal.component';

@Component({
  selector: 'app-classroom-list',
  imports: [RouterLink],
  templateUrl: './classroom-list.component.html',
  styleUrl: './classroom-list.component.css',
})
export class ClassroomListComponent {
  private classroomSrv = inject(ClassroomService);
  private modalSrv = inject(NgbModal);
  protected authSrv = inject(AuthService);

  classrooms = signal<Classroom[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.loadClassrooms();
  }

  loadClassrooms() {
    this.loading.set(true);
    this.classroomSrv.list().subscribe(classrooms => {
      this.classrooms.set(classrooms);
      this.loading.set(false);
    });
  }

  openCreateModal() {
    const modalRef = this.modalSrv.open(CreateClassroomModalComponent);
    modalRef.closed.subscribe(() => this.loadClassrooms());
  }
}
