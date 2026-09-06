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

  // 1. Isolasi multi-tenant antar sekolah
  if (user.schoolId && student.schoolId && user.schoolId !== student.schoolId) {
    return false;
  }

  const role = (user.role || '').toUpperCase();

  // 2. ADMIN & KEPALA SEKOLAH dapat melihat seluruh siswa di sekolahnya
  if (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
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

    // e. Jika guru memiliki classId atau className yang telah ditentukan, tetapi siswa tidak cocok, tolak
    if (user.classId || user.className) {
      return false;
    }

    // f. Fallback untuk guru umum yang belum diplot ke kelas tertentu
    return true;
  }

  // 4. ORANG TUA / PARENT: HANYA BOLEH melihat anaknya sendiri
  if (role === 'ORANG_TUA' || role === 'PARENT') {
    if (user.childId && user.childId === student.id) return true;
    if (user.studentIds && user.studentIds.includes(student.id)) return true;
    if ((user as any).linkedStudentIds && (user as any).linkedStudentIds.includes(student.id)) return true;
    if ((user as any).parentStudentIds && (user as any).parentStudentIds.includes(student.id)) return true;
    if (student.parentIds && student.parentIds.includes(user.id)) return true;
    return false;
  }

  return false;
}

export function canEditStudent(user: UserProfile, _student: StudentProfile): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
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
    return !user.schoolId || !observation.schoolId || user.schoolId === observation.schoolId;
  }

  if (role === 'ORANG_TUA' || role === 'PARENT') {
    const student = allStudents?.find((s) => s.id === observation.studentId);
    if (student) {
      return canViewStudent(user, student);
    }
    return (
      user.childId === observation.studentId ||
      (user.studentIds?.includes(observation.studentId) ?? false) ||
      ((user as any).linkedStudentIds?.includes(observation.studentId) ?? false) ||
      ((user as any).parentStudentIds?.includes(observation.studentId) ?? false)
    );
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

  // ADMIN & SUPER_ADMIN dapat mengedit observasi seluruh sekolah
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return true;
  }

  // GURU hanya boleh mengedit observasi siswa jika siswa berada di kelas yang menjadi tanggung jawabnya
  if (role === 'GURU' || role === 'TEACHER') {
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
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function canManageSchool(user: UserProfile): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function canViewReport(
  user: UserProfile,
  studentId: string,
  allStudents?: StudentProfile[]
): boolean {
  if (!user || !studentId) return false;

  const role = (user.role || '').toUpperCase();

  // ADMIN, SUPER_ADMIN & KEPALA SEKOLAH
  if (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
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
  if (role === 'ORANG_TUA' || role === 'PARENT') {
    if (student) {
      return canViewStudent(user, student);
    }
    if (allStudents && allStudents.length > 0 && !student) {
      return false;
    }
    return (
      user.childId === studentId ||
      (user.studentIds?.includes(studentId) ?? false) ||
      ((user as any).linkedStudentIds?.includes(studentId) ?? false)
    );
  }

  return false;
}
