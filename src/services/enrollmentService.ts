import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  updateDoc,
  writeBatch,
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

// In-flight promise cache to prevent concurrent duplicate enrollment creation
const inFlightEnrollments = new Map<string, Promise<Enrollment>>();

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
   * Buat pendaftaran (Enrollment) baru untuk siswa dengan proteksi duplikasi
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
    const inFlightKey = `${data.schoolId}-${data.studentId}-${data.academicYearId}`;
    if (inFlightEnrollments.has(inFlightKey)) {
      console.log(`[ENROLLMENT IN-FLIGHT REUSE] Key: ${inFlightKey}`);
      return inFlightEnrollments.get(inFlightKey)!;
    }

    const enrollmentPromise = (async () => {
      // 1. Cek deterministic document ID langsung via getDoc untuk memastikan atomik
      const id = `enr-${data.studentId}-${data.academicYearId}`;
      const docRef = doc(db, COLLECTION_NAME, id);

      try {
        const existingSnap = await getDoc(docRef);
        if (existingSnap.exists()) {
          console.log(`[ENROLLMENT] Siswa ${data.studentId} sudah terdaftar di TA ${data.academicYearId} (dokumen ${id} ada).`);
          return existingSnap.data() as Enrollment;
        }
      } catch (checkErr) {
        console.warn('Enrollment existing check notice:', checkErr);
      }

      // 2. Cek duplikasi: schoolId + academicYearId + studentId
      const existing = await this.getEnrollments(data.schoolId, {
        studentId: data.studentId,
        academicYearId: data.academicYearId,
      });
      if (existing.length > 0) {
        console.log(`[ENROLLMENT] Siswa ${data.studentId} sudah terdaftar di TA ${data.academicYearId}. Menggunakan data yang ada.`);
        return existing[0];
      }

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

      await setDoc(docRef, newEnrollment);

      // Idempotent audit log: gunakan deterministic ID dan periksa apakah sudah pernah dicatat
      const auditId = `audit-enr-${data.schoolId}-${id}`;
      try {
        const auditDocRef = doc(db, 'auditLogs', auditId);
        const auditSnap = await getDoc(auditDocRef);
        if (!auditSnap.exists()) {
          await auditLogService.logAction({
            id: auditId,
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
        } else {
          console.log(`[AUDIT_LOG] Audit untuk enrollment ${id} sudah ada. Melewati duplikasi.`);
        }
      } catch (auditErr) {
        console.warn('Audit log write notice:', auditErr);
      }

      return newEnrollment;
    })().finally(() => {
      inFlightEnrollments.delete(inFlightKey);
    });

    inFlightEnrollments.set(inFlightKey, enrollmentPromise);
    return enrollmentPromise;
  },

  /**
   * PROSES KENAIKAN KELAS (Promote Student) - Menggunakan Firestore writeBatch atomik
   * 1. Enrollment lama menjadi PROMOTED.
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

    if (oldData.academicYearId === nextAcademicYear.id) {
      throw new Error('Tahun ajaran tujuan kenaikan kelas harus berbeda dari tahun ajaran saat ini.');
    }

    const targetYearSnap = await getDoc(doc(db, 'academicYears', nextAcademicYear.id));
    if (targetYearSnap.exists() && (targetYearSnap.data() as any).status === 'CLOSED') {
      throw new Error('Tahun ajaran tujuan sudah ditutup (CLOSED). Tidak dapat memproses kenaikan kelas.');
    }

    const todayISO = new Date().toISOString().split('T')[0];

    const newEnrollmentId = `enr-${oldData.studentId}-${nextAcademicYear.id}`;
    const newRef = doc(db, COLLECTION_NAME, newEnrollmentId);
    const studentRef = doc(db, 'students', oldData.studentId);

    const updatedOldData: Partial<Enrollment> = {
      status: 'PROMOTED',
      endDate: todayISO,
      nextClassId: nextClass.id,
      nextClassName: nextClass.name,
      updatedAt: new Date().toISOString(),
    };

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

    // Eksekusi atomik menggunakan writeBatch
    const batch = writeBatch(db);
    batch.update(oldRef, updatedOldData);
    batch.set(newRef, newEnrollment);
    batch.update(studentRef, {
      classId: nextClass.id,
      className: nextClass.name,
      status: 'ACTIVE',
      currentEnrollmentId: newEnrollmentId,
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();

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
   * PROSES SISWA MENGULANG (REPEAT) - Menggunakan Firestore writeBatch atomik
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

    if (oldData.academicYearId === nextAcademicYear.id) {
      throw new Error('Tahun ajaran tujuan mengulang harus berbeda dari tahun ajaran saat ini.');
    }

    const targetYearSnap = await getDoc(doc(db, 'academicYears', nextAcademicYear.id));
    if (targetYearSnap.exists() && (targetYearSnap.data() as any).status === 'CLOSED') {
      throw new Error('Tahun ajaran tujuan sudah ditutup (CLOSED). Tidak dapat memproses siswa mengulang.');
    }

    const todayISO = new Date().toISOString().split('T')[0];

    const newEnrollmentId = `enr-${oldData.studentId}-${nextAcademicYear.id}`;
    const newRef = doc(db, COLLECTION_NAME, newEnrollmentId);
    const studentRef = doc(db, 'students', oldData.studentId);

    const updatedOldData: Partial<Enrollment> = {
      status: 'REPEAT',
      endDate: todayISO,
      completionReason: `Mengulang: ${reason}`,
      nextClassId: repeatClass.id,
      nextClassName: repeatClass.name,
      updatedAt: new Date().toISOString(),
    };

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

    // Eksekusi atomik batch
    const batch = writeBatch(db);
    batch.update(oldRef, updatedOldData);
    batch.set(newRef, newEnrollment);
    batch.update(studentRef, {
      classId: repeatClass.id,
      className: repeatClass.name,
      status: 'ACTIVE',
      currentEnrollmentId: newEnrollmentId,
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();

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
   * PROSES SISWA TAMAT (Graduate Student) - Atomik batch
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
    const studentRef = doc(db, 'students', enrData.studentId);

    const batch = writeBatch(db);
    batch.update(enrRef, {
      status: 'GRADUATED',
      endDate: todayISO,
      completionReason: reason,
      updatedAt: new Date().toISOString(),
    });
    batch.update(studentRef, {
      status: 'GRADUATED',
      completionReason: reason,
      completionDate: todayISO,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();

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
   * PROSES SISWA PINDAH (Transfer Student) - Atomik batch
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
    const studentRef = doc(db, 'students', enrData.studentId);

    const batch = writeBatch(db);
    batch.update(enrRef, {
      status: 'TRANSFERRED',
      endDate: todayISO,
      completionReason: destinationSchoolOrReason,
      updatedAt: new Date().toISOString(),
    });
    batch.update(studentRef, {
      status: 'TRANSFERRED',
      completionReason: destinationSchoolOrReason,
      completionDate: todayISO,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();

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

  /**
   * Mendaftarkan siswa yang belum memiliki enrollment ke tahun ajaran aktif secara otomatis
   */
  async ensureStudentEnrollment(
    student: StudentProfile,
    academicYearId: string,
    academicYearName: string,
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<Enrollment> {
    const existing = await this.getEnrollments(student.schoolId || 'main-school', {
      studentId: student.id,
      academicYearId,
    });
    if (existing.length > 0) return existing[0];

    const todayISO = new Date().toISOString().split('T')[0];
    const enr = await this.createEnrollment(
      {
        schoolId: student.schoolId || 'main-school',
        studentId: student.id,
        studentName: student.name,
        academicYearId,
        academicYearName,
        classId: student.classId || '',
        className: student.className || '',
        teacherIds: student.teacherIds || [],
        parentIds: student.parentIds || [],
        entryType: 'NEW',
        status: 'ACTIVE',
        startDate: todayISO,
      },
      actorRole,
      actorName
    );

    const studentRef = doc(db, 'students', student.id);
    await updateDoc(studentRef, {
      currentEnrollmentId: enr.id,
      updatedAt: new Date().toISOString(),
    });

    return enr;
  },
};
