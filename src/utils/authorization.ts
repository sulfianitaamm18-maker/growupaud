import { UserProfile, StudentProfile, ObservationRecord } from '../types';
import { schoolStore } from '../services/schoolStore';

/**
 * Helper izin akses terpusat (Centralized Authorization Helper)
 * Mengontrol privasi dan hak akses data antar role: ADMIN, PRINCIPAL / KEPALA_SEKOLAH, TEACHER / GURU, PARENT / ORANG_TUA.
 * Menegakkan isolasi ketat antar kelas (Guru Kelompok A TIDAK BOLEH melihat data Kelompok B).
 */

function normalizeName(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/^tk\s+/i, '')
    .replace(/^kelompok\s+/i, '')
    .replace(/^kelas\s+/i, '')
    .replace(/\s+/g, '')
    .trim();
}

export function canViewStudent(user: UserProfile, student: StudentProfile): boolean {
  if (!user || !student) return false;

  const role = (user.role || '').toUpperCase();

  // 1. Isolasi multi-tenant antar sekolah (SUPER_ADMIN memiliki akses audit platform lintas sekolah)
  if (role !== 'SUPER_ADMIN' && user.schoolId && student.schoolId && user.schoolId !== student.schoolId) {
    return false;
  }

  // 2. ADMIN, OPERATOR & KEPALA SEKOLAH dapat melihat seluruh siswa di sekolahnya
  if (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'OPERATOR' ||
    role === 'PRINCIPAL' ||
    role === 'KEPALA_SEKOLAH'
  ) {
    return true;
  }

  // 3. GURU / TEACHER: Isolasi Ketat Per Kelas / Rombel
  if (role === 'GURU' || role === 'TEACHER') {
    // a. Cek jika ID Guru langsung terdaftar pada student.teacherIds
    if (student.teacherIds && student.teacherIds.includes(user.id)) {
      return true;
    }

    // b. Cek kecocokan classId
    if (user.classId && student.classId && user.classId === student.classId) {
      return true;
    }

    // c. Cek kecocokan nama kelas guru dan siswa
    if (user.className && student.className) {
      const teacherClassNorm = normalizeName(user.className);
      const studentClassNorm = normalizeName(student.className);
      if (teacherClassNorm && studentClassNorm && teacherClassNorm === studentClassNorm) {
        return true;
      }
    }

    // d. Cek relasi dari daftar kelas sekolah (ClassRoom.teacherId === user.id)
    try {
      const classes = schoolStore.getClasses();
      const assignedClasses = classes.filter(
        (c) =>
          c.teacherId === user.id ||
          (c as any).teacherUid === user.id ||
          (c.teacherName && user.name && normalizeName(c.teacherName) === normalizeName(user.name))
      );

      if (assignedClasses.length > 0) {
        for (const cls of assignedClasses) {
          if (student.classId && student.classId === cls.id) {
            return true;
          }
          if (student.className && cls.name && normalizeName(student.className) === normalizeName(cls.name)) {
            return true;
          }
        }
        // Jika guru memiliki kelas terdaftar tetapi siswa ini bukan dari kelas tersebut, tolak akses
        return false;
      }
    } catch (e) {
      // ignore
    }

    // e. Jika siswa tidak cocok dengan penugasan kelas ataupun teacherIds, tolak akses secara ketat
    return false;
  }

  // 4. ORANG TUA / PARENT: HANYA BOLEH melihat anaknya sendiri
  // Sumber otoritatif tunggal adalah data siswa: students/{studentId}.parentIds, legacy parentId, atau kecocokan data email/UID
  if (role === 'ORANG_TUA' || role === 'PARENT') {
    const parentUid = user.id || user.uid || (user as any).firebaseUid;
    if (!parentUid) return false;

    // 1. Otoritatif langsung: parentIds array memuat UID orang tua
    if (student.parentIds && Array.isArray(student.parentIds) && student.parentIds.includes(parentUid)) {
      return true;
    }

    // 2. Otoritatif legacy: parentId cocok dengan UID orang tua
    if ((student as any).parentId && (student as any).parentId === parentUid) {
      return true;
    }

    // 3. Kecocokan email orang tua yang tertera pada data siswa
    if (
      student.parentEmail &&
      user.email &&
      student.parentEmail.trim().toLowerCase() === user.email.trim().toLowerCase()
    ) {
      return true;
    }

    // 4. Hubungan melalui profil akun orang tua (linkedStudentIds, studentIds, childId)
    const linkedIds = new Set<string>([
      ...(user.linkedStudentIds || []),
      ...(user.studentIds || []),
      ...(user.childId ? [user.childId] : []),
    ]);
    if (student.id && linkedIds.has(student.id)) {
      return true;
    }

    return false;
  }

  return false;
}

export function canEditStudent(user: UserProfile, _student: StudentProfile): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'OPERATOR';
}

export function canViewObservation(
  user: UserProfile,
  observation: ObservationRecord,
  allStudents?: StudentProfile[]
): boolean {
  if (!user || !observation) return false;

  // Isolasi multi-tenant antar sekolah
  if (user.schoolId && observation.schoolId && user.schoolId !== observation.schoolId) {
    return false;
  }

  const role = (user.role || '').toUpperCase();

  if (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'OPERATOR' ||
    role === 'PRINCIPAL' ||
    role === 'KEPALA_SEKOLAH'
  ) {
    return true;
  }

  if (role === 'GURU' || role === 'TEACHER') {
    const student = allStudents?.find((s) => s.id === observation.studentId);
    if (student) {
      return canViewStudent(user, student);
    }
    // Jika data student belum tersedia di list, cek jika guru mencatat langsung dan classId cocok
    if (user.classId && observation.classId && user.classId !== observation.classId) {
      return false;
    }
    if (
      observation.teacherId === user.id ||
      (observation as any).createdBy === user.id ||
      (observation as any).teacherUid === user.id
    ) {
      return true;
    }
    if (user.classId && observation.classId && user.classId === observation.classId) {
      return true;
    }
    if (user.className && observation.className && normalizeName(user.className) === normalizeName(observation.className)) {
      return true;
    }
    return false;
  }

  if (role === 'ORANG_TUA' || role === 'PARENT') {
    const student = allStudents?.find((s) => s.id === observation.studentId);
    if (student) {
      return canViewStudent(user, student);
    }
    return false;
  }

  return false;
}

export function canEditObservation(
  user: UserProfile,
  observation: ObservationRecord,
  allStudents?: StudentProfile[]
): boolean {
  if (!user || !observation) return false;

  const role = (user.role || '').toUpperCase();

  // ADMIN, SUPER_ADMIN & OPERATOR dapat mengedit observasi seluruh sekolah
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'OPERATOR') {
    return true;
  }

  // GURU hanya boleh mengedit observasi miliknya sendiri yang ditugaskan kepadanya
  if (role === 'GURU' || role === 'TEACHER') {
    if (observation.teacherId && observation.teacherId !== user.id) {
      return false;
    }
    const student = allStudents?.find((s) => s.id === observation.studentId);
    if (student) {
      return canViewStudent(user, student);
    }
    return observation.teacherId === user.id;
  }

  // KEPALA SEKOLAH & ORANG TUA TIDAK BOLEH mengubah data observasi guru
  return false;
}

export function canManageCurriculum(user: UserProfile): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'OPERATOR';
}

export function canManageSchool(user: UserProfile): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'OPERATOR';
}

export function canViewReport(
  user: UserProfile,
  studentId: string,
  allStudents?: StudentProfile[]
): boolean {
  if (!user || !studentId) return false;

  const role = (user.role || '').toUpperCase();

  // ADMIN, SUPER_ADMIN, OPERATOR & KEPALA SEKOLAH
  if (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'OPERATOR' ||
    role === 'PRINCIPAL' ||
    role === 'KEPALA_SEKOLAH'
  ) {
    return true;
  }

  const student = allStudents?.find((s) => s.id === studentId);

  // GURU: Hanya boleh melihat laporan jika siswa berada di kelasnya
  if (role === 'GURU' || role === 'TEACHER') {
    if (!student) {
      return false;
    }
    return canViewStudent(user, student);
  }

  // ORANG TUA HANYA BOLEH melihat laporan anaknya sendiri
  // Sumber otoritatif tunggal: students/{studentId}.parentIds
  if (role === 'ORANG_TUA' || role === 'PARENT') {
    if (student) {
      return canViewStudent(user, student);
    }
    return false;
  }

  return false;
}

// Aliases and Specific Security Rule Helpers
export const canAccessStudent = canViewStudent;

export function canInputObservations(user: UserProfile): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return (
    role === 'GURU' ||
    role === 'TEACHER' ||
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'OPERATOR' ||
    role === 'PRINCIPAL' ||
    role === 'KEPALA_SEKOLAH'
  );
}

export function canManageSchoolData(user: UserProfile): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'OPERATOR';
}

export function canManageReportKop(user: UserProfile): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'OPERATOR' ||
    role === 'PRINCIPAL' ||
    role === 'KEPALA_SEKOLAH' ||
    role === 'TEACHER' ||
    role === 'GURU'
  );
}

export function validateSchoolAccess(user: UserProfile, targetSchoolId?: string): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN') return true;
  if (!targetSchoolId || !user.schoolId) return true;
  return user.schoolId === targetSchoolId;
}
