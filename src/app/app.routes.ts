import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ClassroomListComponent } from './pages/classroom-list/classroom-list.component';
import { ClassroomDetailComponent } from './pages/classroom-detail/classroom-detail.component';
import { authGuard } from './utils/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'classrooms',
    component: ClassroomListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'classrooms/:id',
    component: ClassroomDetailComponent,
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: '/classrooms',
    pathMatch: 'full'
  }
];
