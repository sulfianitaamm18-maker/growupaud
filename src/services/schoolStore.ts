import { SchoolProfile, TeacherProfile, ClassRoom, ParentProfile, StudentProfile, UserProfile } from '../types';
import { schoolService } from './schoolService';
import { classService } from './classService';
import { studentService } from './studentService';
import { userStore, isUnwantedTargetUser } from './userStore';
import { formatAuthEmail, auth } from '../lib/firebase';

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  id: 'main-school',
  schoolName: '',
  schoolLogo: '',
  address: '',
  phone: '',
  email: '',
  principalName: '',
  academicYear: '2026/2027',
  semester: 'Semester I (Ganjil)',
};

export const DEFAULT_TEACHERS: TeacherProfile[] = [];
export const DEFAULT_CLASSES: ClassRoom[] = [];
export const DEFAULT_PARENTS: ParentProfile[] = [];

class SchoolStoreService {
  private listeners: (() => void)[] = [];
  private cachedSchool: SchoolProfile = DEFAULT_SCHOOL_PROFILE;
  private cachedClasses: ClassRoom[] = [];
  private cachedStudents: StudentProfile[] = [];
  private cachedTeachers: TeacherProfile[] = [];
  private cachedParents: ParentProfile[] = [];
  private isInitialized = false;
  private isFetching = false;
  private fetchError: string | null = null;

  constructor() {
    // Initialized empty - refresh is explicitly called after user authentication
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Reset store memory state on logout
   */
  public clearCache(): void {
    this.cachedSchool = DEFAULT_SCHOOL_PROFILE;
    this.cachedClasses = [];
    this.cachedStudents = [];
    this.cachedTeachers = [];
    this.cachedParents = [];
    this.isInitialized = false;
    this.isFetching = false;
    this.fetchError = null;
    this.notifyListeners();
  }

  /**
   * Refreshes all master data (School, Classes, Students) directly from Firestore.
   * Only queries master users collection if the current authenticated user has administrative privileges.
   */
  async refreshFromFirestore(
    schoolId: string = 'main-school',
    userRole?: string,
    parentStudentIds?: string[]
  ): Promise<void> {
    if (!auth.currentUser) {
      this.clearCache();
      return;
    }

    this.isFetching = true;
    this.fetchError = null;
    try {
      console.log('[SCHOOL SYNC]\nSTART');
      const [school, classes, students] = await Promise.all([
        schoolService.getSchoolProfile(schoolId),
        classService.getClasses(schoolId),
        studentService.getStudents(schoolId, userRole, parentStudentIds),
      ]);

      if (school) {
        this.cachedSchool = school;
        console.log('[SCHOOL DATA]\nSUCCESS');
      } else {
        console.log('[SCHOOL DATA]\nDEFAULT');
      }

      this.cachedClasses = classes || [];
      console.log('[CLASSES]\nSUCCESS');

      this.cachedStudents = students || [];
      console.log('[STUDENTS]\nSUCCESS');

      // Determine if current user has permission to read the users collection
      const effectiveRole =
        userRole ||
        (auth.currentUser ? userStore.getCachedProfile(auth.currentUser.uid)?.role : undefined);

      const canQueryUsers =
        effectiveRole === 'ADMIN' ||
        effectiveRole === 'SUPER_ADMIN' ||
        effectiveRole === 'PRINCIPAL';

      if (canQueryUsers) {
        try {
          const users = await userStore.getAllUserProfiles(schoolId);
          if (users && users.length > 0) {
            this.syncTeachersAndParentsFromUsers(users);
          }
        } catch (uErr) {
          // Ignored if user not authorized
        }
      }

      this.isInitialized = true;
      this.notifyListeners();
    } catch (err: any) {
      this.fetchError = err.message || 'Gagal terhubung ke Firestore.';
      console.warn('SchoolStore Firestore sync warning:', err);
      console.log('[SCHOOL SYNC]\nERROR: ' + err.message);
    } finally {
      this.isFetching = false;
    }
  }

  public syncTeachersAndParentsFromUsers(users: UserProfile[], notify: boolean = false): void {
    const teachers: TeacherProfile[] = users
      .filter((u) => (u.role === 'TEACHER' || u.role === 'GURU') && u.isActive !== false && !isUnwantedTargetUser(u))
      .map((u) => ({
        id: u.id,
        name: u.name || u.displayName || u.username,
        email: u.email || '',
        phone: '',
        className: u.className || '',
        classId: u.className || '',
        status: u.isActive ? 'ACTIVE' : 'INACTIVE',
      }));

    const parents: ParentProfile[] = users
      .filter((u) => (u.role === 'PARENT' || u.role === 'ORANG_TUA') && u.isActive !== false && !isUnwantedTargetUser(u))
      .map((u) => ({
        id: u.id,
        name: u.name || u.displayName || u.username,
        email: u.email || '',
        phone: '',
        studentIds: u.studentIds || u.linkedStudentIds || (u.childId ? [u.childId] : []),
      }));

    this.cachedTeachers = teachers;
    this.cachedParents = parents;
    if (notify) {
      this.notifyListeners();
    }
  }

  public getFetchError(): string | null {
    return this.fetchError;
  }

  public isLoading(): boolean {
    return this.isFetching;
  }

  // School Profile
  getSchoolProfile(): SchoolProfile {
    return this.cachedSchool;
  }

  async saveSchoolProfile(profile: SchoolProfile): Promise<SchoolProfile> {
    const saved = await schoolService.saveSchoolProfile(profile);
    this.cachedSchool = saved;
    this.notifyListeners();
    return saved;
  }

  // Teachers (Cached for UI)
  getTeachers(): TeacherProfile[] {
    return this.cachedTeachers;
  }

  saveTeachers(teachers: TeacherProfile[]): void {
    this.cachedTeachers = teachers;
    this.notifyListeners();
  }

  async addTeacher(teacher: Omit<TeacherProfile, 'id'>): Promise<TeacherProfile> {
    const school = this.getSchoolProfile();
    const cleanUsername = teacher.email ? teacher.email.split('@')[0].toLowerCase() : `guru_${Date.now()}`;
    const generatedId = formatAuthEmail(cleanUsername);

    const userProfile: UserProfile = {
      id: generatedId,
      username: cleanUsername,
      name: teacher.name,
      displayName: teacher.name,
      role: 'TEACHER',
      email: teacher.email || `${cleanUsername}@sekolah.sch.id`,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      schoolId: school.id || 'main-school',
      schoolName: school.schoolName || 'Sekolah PAUD',
      isActive: teacher.status === 'ACTIVE',
      className: teacher.className,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await userStore.saveUserProfile(userProfile);

    const newTeacher: TeacherProfile = {
      ...teacher,
      id: userProfile.id,
    };
    this.cachedTeachers = [newTeacher, ...this.cachedTeachers.filter((t) => t.id !== newTeacher.id)];
    this.notifyListeners();
    return newTeacher;
  }

  updateTeacher(updatedTeacher: TeacherProfile): void {
    const index = this.cachedTeachers.findIndex((t) => t.id === updatedTeacher.id);
    if (index !== -1) {
      this.cachedTeachers[index] = updatedTeacher;
      this.notifyListeners();
    }
  }

  // Classes
  getClasses(): ClassRoom[] {
    return this.cachedClasses;
  }

  async addClass(cls: Omit<ClassRoom, 'id'>): Promise<ClassRoom> {
    const created = await classService.addClass(cls);
    this.cachedClasses = [created, ...this.cachedClasses];
    this.notifyListeners();
    return created;
  }

  async updateClass(updatedClass: ClassRoom): Promise<void> {
    await classService.updateClass(updatedClass);
    const index = this.cachedClasses.findIndex((c) => c.id === updatedClass.id);
    if (index !== -1) {
      this.cachedClasses[index] = updatedClass;
    } else {
      this.cachedClasses.push(updatedClass);
    }
    this.notifyListeners();
  }

  async deleteClass(classId: string): Promise<void> {
    await classService.deleteClass(classId);
    this.cachedClasses = this.cachedClasses.filter((c) => c.id !== classId);
    this.notifyListeners();
  }

  // Students
  getStudents(): StudentProfile[] {
    return this.cachedStudents;
  }

  async addStudent(student: Omit<StudentProfile, 'id'>): Promise<StudentProfile> {
    const created = await studentService.addStudent(student);
    this.cachedStudents = [created, ...this.cachedStudents];
    this.notifyListeners();
    return created;
  }

  async updateStudent(updatedStudent: StudentProfile): Promise<void> {
    try {
      await studentService.updateStudent(updatedStudent);
    } catch (err) {
      // Non-admin roles (e.g. Teacher updating local observation count) are restricted by Firestore rules.
      // We keep the local in-memory cache synchronized gracefully.
    }
    const index = this.cachedStudents.findIndex((s) => s.id === updatedStudent.id);
    if (index !== -1) {
      this.cachedStudents[index] = updatedStudent;
    } else {
      this.cachedStudents.push(updatedStudent);
    }
    this.notifyListeners();
  }

  async deleteStudent(studentId: string): Promise<void> {
    await studentService.deleteStudent(studentId);
    this.cachedStudents = this.cachedStudents.filter((s) => s.id !== studentId);
    this.notifyListeners();
  }

  // Parents
  getParents(): ParentProfile[] {
    return this.cachedParents;
  }

  saveParents(parents: ParentProfile[]): void {
    this.cachedParents = parents;
    this.notifyListeners();
  }

  async addParent(parent: Omit<ParentProfile, 'id'>): Promise<ParentProfile> {
    const school = this.getSchoolProfile();
    const cleanUsername = parent.email ? parent.email.split('@')[0].toLowerCase() : `ortu_${Date.now()}`;
    const generatedId = formatAuthEmail(cleanUsername);

    const userProfile: UserProfile = {
      id: generatedId,
      username: cleanUsername,
      name: parent.name,
      displayName: parent.name,
      role: 'PARENT',
      email: parent.email || `${cleanUsername}@sekolah.sch.id`,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      schoolId: school.id || 'main-school',
      schoolName: school.schoolName || 'Sekolah PAUD',
      isActive: true,
      studentIds: parent.studentIds || [],
      linkedStudentIds: parent.studentIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await userStore.saveUserProfile(userProfile);

    const newParent: ParentProfile = {
      ...parent,
      id: userProfile.id,
    };
    this.cachedParents = [newParent, ...this.cachedParents.filter((p) => p.id !== newParent.id)];
    this.notifyListeners();
    return newParent;
  }

  updateParent(updatedParent: ParentProfile): void {
    const index = this.cachedParents.findIndex((p) => p.id === updatedParent.id);
    if (index !== -1) {
      this.cachedParents[index] = updatedParent;
      this.notifyListeners();
    }
  }

  /**
   * Migration utility: Allows Admin to seed valid local student data to Firestore safely
   */
  async migrateLocalDataToFirestore(): Promise<{ migratedCount: number; message: string }> {
    // Check if there is any custom local data in localStorage
    const localStudentsJson = localStorage.getItem('growupaud_students');
    if (!localStudentsJson) {
      return {
        migratedCount: 0,
        message: 'Tidak ada data master lokal sekolah yang dapat dimigrasikan.',
      };
    }

    try {
      const localStudents: StudentProfile[] = JSON.parse(localStudentsJson);
      if (!Array.isArray(localStudents) || localStudents.length === 0) {
        return {
          migratedCount: 0,
          message: 'Tidak ada data master lokal sekolah yang dapat dimigrasikan.',
        };
      }

      let count = 0;
      for (const std of localStudents) {
        await studentService.addStudent(std);
        count++;
      }

      await this.refreshFromFirestore();
      return {
        migratedCount: count,
        message: `Berhasil memigrasikan ${count} data siswa lokal ke Firestore.`,
      };
    } catch (e: any) {
      throw new Error('Gagal membaca data lokal: ' + (e.message || 'Format tidak valid.'));
    }
  }
}

export const schoolStore = new SchoolStoreService();
