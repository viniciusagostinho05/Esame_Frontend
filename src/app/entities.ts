export type Role = 'student' | 'teacher';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  picture: string;
  role: Role;
}

export interface Classroom {
  id: string;
  name: string;
  createdBy: User;
  studentsCount: number;
}

export interface Assignment {
  id: string;
  title: string;
  studentsCount: number;
  completedCount: number;
  completed?: boolean; // presente solo se chi chiama l'api è uno studente
  completedAt?: string | null; // idem, bonus data di completamento
  createdAt: string;
  createdBy: User;
}

// bonus: vista dettagliata per il docente
export interface AssignmentStudentStatus {
  student: User;
  completed: boolean;
  completedAt: string | null;
}
