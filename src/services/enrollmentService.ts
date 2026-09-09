import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  Enrollment,
  EnrollmentEntryType,
  EnrollmentStatus,
  StudentProfile,
  UserRole,
} from '../types';
import { auditLogService } from './auditLogService';

const COLLECTION_NAME = 'enrollments';

export const enrollmentService = {
  /**
   * Mengambil semua enrollment berdasarkan filter (schoolId, studentId, academicYearId, classId, status)
   */
  async getEnrollments(
    schoolId: string,
    filters?: {
      studentId?: string;
      academicYearId?: string;
      classId?: string;
      status?: EnrollmentStatus;
    }
  ): Promise<Enrollment[]> {
    if (!auth.currentUser) return [];

    try {
      const colRef = collection(db, COLLECTION_NAME);
      let constraints: any[] = [where('schoolId', '==', schoolId)];

      if (filters?.studentId) {
        constraints.push(where('studentId', '==', filters.studentId));
      }
      if (filters?.academicYearId) {
        constraints.push(where('academicYearId', '==', filters.academicYearId));
      }
      if (filters?.classId) {
        constraints.push(where('classId', '==', filters.classId));
      }
      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      return snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Enrollment[];
    } catch (err) {
      console.warn('Gagal mengambil data enrollments:', err);
      return [];
    }
  },

  /**
   * Mengambil enrollment aktif seorang siswa pada tahun ajaran tertentu
   */
  async getActiveEnrollmentForStudent(
    studentId: string,
    academicYearId?: string
  ): Promise<Enrollment | null> {
    if (!auth.currentUser) return null;

    try {
      const colRef = collection(db, COLLECTION_NAME);
      const constraints: any[] = [
        where('studentId', '==', studentId),
        where('status', '==', 'ACTIVE'),
      ];

      if (academicYearId) {
        constraints.push(where('academicYearId', '==', academicYearId));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      if (!snap.empty) {
        const d = snap.docs[0];
        return {
          id: d.id,
          ...d.data(),
        } as Enrollment;
      }
    } catch (err) {
      console.warn('Gagal mengambil active enrollment siswa:', err);
    }
    return null;
  },

  /**
   * Mengambil riwayat seluruh enrollment untuk satu siswa (urut kronologis)
   */
  async getStudentEnrollmentHistory(studentId: string): Promise<Enrollment[]> {
    if (!auth.currentUser) return [];

    try {
      const colRef = collection(db, COLLECTION_NAME);
      const q = query(colRef, where('studentId', '==', studentId));
      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Enrollment[];

      return list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    } catch (err) {
      console.warn('Gagal mengambil riwayat enrollment siswa:', err);
      return [];
    }
  },

  /**
   * Buat pendaftaran (Enrollment) baru untuk siswa
   */
  async createEnrollment(
    data: {
      schoolId: string;
      studentId: string;
      studentName?: string;
      academicYearId: string;
      academicYearName?: string;
      classId: string;
      className?: string;
      teacherIds: string[];
      parentIds: string[];
      entryType: EnrollmentEntryType;
      status?: EnrollmentStatus;
      startDate: string;
      previousClassId?: string;
      previousClassName?: string;
      nextClassId?: string;
      nextClassName?: string;
    },
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<Enrollment> {
    const id = `enr-${data.studentId}-${data.academicYearId}-${Date.now().toString().slice(-4)}`;

    const newEnrollment: Enrollment = {
      id,
      schoolId: data.schoolId,
      studentId: data.studentId,
      studentName: data.studentName || '',
      academicYearId: data.academicYearId,
      academicYearName: data.academicYearName || '',
      classId: data.classId,
      className: data.className || '',
      teacherIds: data.teacherIds || [],
      parentIds: data.parentIds || [],
      entryType: data.entryType,
      status: data.status || 'ACTIVE',
      startDate: data.startDate,
      previousClassId: data.previousClassId || '',
      previousClassName: data.previousClassName || '',
      nextClassId: data.nextClassId || '',
      nextClassName: data.nextClassName || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = doc(db, COLLECTION_NAME, id);
    await setDoc(docRef, newEnrollment);

    await auditLogService.logAction({
      schoolId: data.schoolId,
      actorUserId: auth.currentUser?.uid || 'admin',
      actorRole,
      actorName,
      action: 'ENROLL_STUDENT',
      targetType: 'ENROLLMENT',
      targetId: id,
      targetName: data.studentName,
      metadata: {
        entryType: data.entryType,
        academicYearId: data.academicYearId,
        classId: data.classId,
      },
    });

    return newEnrollment;
  },

  /**
   * PROSES KENAIKAN KELAS (Promote Student)
   * 1. Enrollment lama menjadi PROMOTED (endDate diisi, nextClassId diisi).
   * 2. Buat enrollment baru untuk tahun ajaran berikutnya (entryType = PROMOTED, previousClassId = classId lama).
   * 3. studentId tetap sama.
   * 4. Riwayat tahun sebelumnya tetap utuh.
   */
  async promoteStudent(
    currentEnrollmentId: string,
    nextAcademicYear: { id: string; name: string; startDate: string },
    nextClass: { id: string; name: string; teacherIds?: string[] },
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<{ oldEnrollment: Enrollment; newEnrollment: Enrollment }> {
    const oldRef = doc(db, COLLECTION_NAME, currentEnrollmentId);
    const oldSnap = await getDoc(oldRef);
    if (!oldSnap.exists()) {
      throw new Error('Enrollment aktif siswa tidak ditemukan.');
    }

    const oldData = oldSnap.data() as Enrollment;
    const todayISO = new Date().toISOString().split('T')[0];

    // 1. Update enrollment lama -> PROMOTED
    const updatedOldData: Partial<Enrollment> = {
      status: 'PROMOTED',
      endDate: todayISO,
      nextClassId: nextClass.id,
      nextClassName: nextClass.name,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(oldRef, updatedOldData);

    // 2. Buat enrollment baru untuk tahun berikutnya
    const newEnrollmentId = `enr-${oldData.studentId}-${nextAcademicYear.id}-${Date.now().toString().slice(-4)}`;
    const newEnrollment: Enrollment = {
      id: newEnrollmentId,
      schoolId: oldData.schoolId,
      studentId: oldData.studentId,
      studentName: oldData.studentName,
      academicYearId: nextAcademicYear.id,
      academicYearName: nextAcademicYear.name,
      classId: nextClass.id,
      className: nextClass.name,
      teacherIds: nextClass.teacherIds || oldData.teacherIds || [],
      parentIds: oldData.parentIds || [],
      entryType: 'PROMOTED',
      status: 'ACTIVE',
      startDate: nextAcademicYear.startDate || todayISO,
      previousClassId: oldData.classId,
      previousClassName: oldData.className,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newRef = doc(db, COLLECTION_NAME, newEnrollmentId);
    await setDoc(newRef, newEnrollment);

    // 3. Update pointer kelas aktif di master student (tanpa menghapus master student!)
    const studentRef = doc(db, 'students', oldData.studentId);
    await updateDoc(studentRef, {
      classId: nextClass.id,
      className: nextClass.name,
      status: 'ACTIVE',
      currentEnrollmentId: newEnrollmentId,
      updatedAt: new Date().toISOString(),
    });

    await auditLogService.logAction({
      schoolId: oldData.schoolId,
      actorUserId: auth.currentUser?.uid || 'admin',
      actorRole,
      actorName,
      action: 'PROMOTE_STUDENT',
      targetType: 'ENROLLMENT',
      targetId: newEnrollmentId,
      targetName: oldData.studentName,
      metadata: {
        studentId: oldData.studentId,
        fromClassId: oldData.classId,
        toClassId: nextClass.id,
        nextAcademicYearId: nextAcademicYear.id,
      },
    });

    return {
      oldEnrollment: { ...oldData, ...updatedOldData } as Enrollment,
      newEnrollment,
    };
  },

  /**
   * PROSES SISWA MENGULANG (REPEAT)
   * 1. Enrollment tahun berjalan ditutup (status = PROMOTED/WITHDRAWN dengan note mengulang).
   * 2. Buat enrollment baru di tahun berikutnya dengan entryType = REPEAT di kelas yang sama atau disesuaikan.
   */
  async repeatStudent(
    currentEnrollmentId: string,
    nextAcademicYear: { id: string; name: string; startDate: string },
    repeatClass: { id: string; name: string; teacherIds?: string[] },
    reason: string = 'Mengulang untuk pematangan kesiapan belajar',
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<{ oldEnrollment: Enrollment; newEnrollment: Enrollment }> {
    const oldRef = doc(db, COLLECTION_NAME, currentEnrollmentId);
    const oldSnap = await getDoc(oldRef);
    if (!oldSnap.exists()) {
      throw new Error('Enrollment aktif siswa tidak ditemukan.');
    }

    const oldData = oldSnap.data() as Enrollment;
    const todayISO = new Date().toISOString().split('T')[0];

    // Update enrollment lama
    const updatedOldData: Partial<Enrollment> = {
      status: 'WITHDRAWN',
      endDate: todayISO,
      completionReason: `Mengulang: ${reason}`,
      nextClassId: repeatClass.id,
      nextClassName: repeatClass.name,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(oldRef, updatedOldData);

    // Buat enrollment baru untuk tahun ajaran berikutnya dengan entryType = REPEAT
    const newEnrollmentId = `enr-${oldData.studentId}-${nextAcademicYear.id}-${Date.now().toString().slice(-4)}`;
    const newEnrollment: Enrollment = {
      id: newEnrollmentId,
      schoolId: oldData.schoolId,
      studentId: oldData.studentId,
      studentName: oldData.studentName,
      academicYearId: nextAcademicYear.id,
      academicYearName: nextAcademicYear.name,
      classId: repeatClass.id,
      className: repeatClass.name,
      teacherIds: repeatClass.teacherIds || oldData.teacherIds || [],
      parentIds: oldData.parentIds || [],
      entryType: 'REPEAT',
      status: 'ACTIVE',
      startDate: nextAcademicYear.startDate || todayISO,
      previousClassId: oldData.classId,
      previousClassName: oldData.className,
      completionReason: reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newRef = doc(db, COLLECTION_NAME, newEnrollmentId);
    await setDoc(newRef, newEnrollment);

    // Update master student
    const studentRef = doc(db, 'students', oldData.studentId);
    await updateDoc(studentRef, {
      classId: repeatClass.id,
      className: repeatClass.name,
      status: 'ACTIVE',
      currentEnrollmentId: newEnrollmentId,
      updatedAt: new Date().toISOString(),
    });

    await auditLogService.logAction({
      schoolId: oldData.schoolId,
      actorUserId: auth.currentUser?.uid || 'admin',
      actorRole,
      actorName,
      action: 'REPEAT_STUDENT',
      targetType: 'ENROLLMENT',
      targetId: newEnrollmentId,
      targetName: oldData.studentName,
      metadata: {
        studentId: oldData.studentId,
        reason,
        academicYearId: nextAcademicYear.id,
      },
    });

    return {
      oldEnrollment: { ...oldData, ...updatedOldData } as Enrollment,
      newEnrollment,
    };
  },

  /**
   * PROSES SISWA TAMAT (Graduate Student)
   * 1. enrollment menjadi GRADUATED
   * 2. student.status menjadi GRADUATED
   * 3. isi endDate dan completionReason
   * 4. JANGAN menghapus student! Masuk arsip dan tetap dapat dicari.
   */
  async graduateStudent(
    enrollmentId: string,
    reason: string = 'Tamat / Lulus PAUD',
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<Enrollment> {
    const enrRef = doc(db, COLLECTION_NAME, enrollmentId);
    const enrSnap = await getDoc(enrRef);
    if (!enrSnap.exists()) {
      throw new Error('Enrollment siswa tidak ditemukan.');
    }

    const enrData = enrSnap.data() as Enrollment;
    const todayISO = new Date().toISOString().split('T')[0];

    await updateDoc(enrRef, {
      status: 'GRADUATED',
      endDate: todayISO,
      completionReason: reason,
      updatedAt: new Date().toISOString(),
    });

    // Update status dokumen master siswa (jangan dihapus!)
    const studentRef = doc(db, 'students', enrData.studentId);
    await updateDoc(studentRef, {
      status: 'GRADUATED',
      completionReason: reason,
      completionDate: todayISO,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await auditLogService.logAction({
      schoolId: enrData.schoolId,
      actorUserId: auth.currentUser?.uid || 'admin',
      actorRole,
      actorName,
      action: 'GRADUATE_STUDENT',
      targetType: 'STUDENT',
      targetId: enrData.studentId,
      targetName: enrData.studentName,
      metadata: {
        enrollmentId,
        completionReason: reason,
        endDate: todayISO,
      },
    });

    return {
      ...enrData,
      status: 'GRADUATED',
      endDate: todayISO,
      completionReason: reason,
    };
  },

  /**
   * PROSES SISWA PINDAH (Transfer Student)
   * 1. enrollment menjadi TRANSFERRED
   * 2. student.status menjadi TRANSFERRED
   * 3. isi endDate dan alasan/keterangan perpindahan
   * 4. JANGAN hapus student!
   */
  async transferStudent(
    enrollmentId: string,
    destinationSchoolOrReason: string,
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<Enrollment> {
    const enrRef = doc(db, COLLECTION_NAME, enrollmentId);
    const enrSnap = await getDoc(enrRef);
    if (!enrSnap.exists()) {
      throw new Error('Enrollment siswa tidak ditemukan.');
    }

    const enrData = enrSnap.data() as Enrollment;
    const todayISO = new Date().toISOString().split('T')[0];

    await updateDoc(enrRef, {
      status: 'TRANSFERRED',
      endDate: todayISO,
      completionReason: destinationSchoolOrReason,
      updatedAt: new Date().toISOString(),
    });

    // Update status master siswa (JANGAN dihapus!)
    const studentRef = doc(db, 'students', enrData.studentId);
    await updateDoc(studentRef, {
      status: 'TRANSFERRED',
      completionReason: destinationSchoolOrReason,
      completionDate: todayISO,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await auditLogService.logAction({
      schoolId: enrData.schoolId,
      actorUserId: auth.currentUser?.uid || 'admin',
      actorRole,
      actorName,
      action: 'TRANSFER_STUDENT',
      targetType: 'STUDENT',
      targetId: enrData.studentId,
      targetName: enrData.studentName,
      metadata: {
        enrollmentId,
        destination: destinationSchoolOrReason,
        endDate: todayISO,
      },
    });

    return {
      ...enrData,
      status: 'TRANSFERRED',
      endDate: todayISO,
      completionReason: destinationSchoolOrReason,
    };
  },
};
