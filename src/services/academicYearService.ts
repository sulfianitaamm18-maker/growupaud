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
import { AcademicYear, AcademicYearStatus, SemesterNumber, UserRole } from '../types';
import { auditLogService } from './auditLogService';

const COLLECTION_NAME = 'academicYears';

export const academicYearService = {
  /**
   * Mengambil seluruh tahun ajaran untuk sekolah tertentu (riwayat tetap tersimpan)
   */
  async getAcademicYears(schoolId: string): Promise<AcademicYear[]> {
    if (!auth.currentUser) return [];

    try {
      const colRef = collection(db, COLLECTION_NAME);
      const q = query(colRef, where('schoolId', '==', schoolId));
      const snap = await getDocs(q);
      
      const years = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AcademicYear[];

      // Sort by startDate descending (tahun terbaru di atas)
      return years.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    } catch (err) {
      console.warn('Gagal mengambil data tahun ajaran:', err);
      return [];
    }
  },

  /**
   * Mengambil tahun ajaran yang sedang aktif
   */
  async getActiveAcademicYear(schoolId: string): Promise<AcademicYear | null> {
    if (!auth.currentUser) return null;

    try {
      const colRef = collection(db, COLLECTION_NAME);
      const q = query(
        colRef,
        where('schoolId', '==', schoolId),
        where('status', '==', 'ACTIVE')
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as AcademicYear;
      }
    } catch (err) {
      console.warn('Gagal mengambil tahun ajaran aktif:', err);
    }
    return null;
  },

  /**
   * Buat tahun ajaran baru (default status: PLANNED atau ACTIVE jika belum ada yang aktif)
   */
  async createAcademicYear(
    data: {
      schoolId: string;
      name: string; // e.g. "2026/2027"
      startDate: string;
      endDate: string;
      status?: AcademicYearStatus;
      activeSemester?: SemesterNumber;
    },
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<AcademicYear> {
    const cleanName = data.name.trim();
    const id = `ay-${cleanName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    
    // Periksa apakah sudah ada tahun aktif di sekolah
    const existingActive = await this.getActiveAcademicYear(data.schoolId);
    const initialStatus: AcademicYearStatus = data.status || (existingActive ? 'PLANNED' : 'ACTIVE');

    const newYear: AcademicYear = {
      id,
      schoolId: data.schoolId,
      name: cleanName,
      status: initialStatus,
      activeSemester: data.activeSemester || 1,
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = doc(db, COLLECTION_NAME, id);
    await setDoc(docRef, newYear);

    await auditLogService.logAction({
      schoolId: data.schoolId,
      actorUserId: auth.currentUser?.uid || 'admin',
      actorRole,
      actorName,
      action: 'CREATE_ACADEMIC_YEAR',
      targetType: 'ACADEMIC_YEAR',
      targetId: id,
      targetName: cleanName,
      metadata: { status: initialStatus, activeSemester: newYear.activeSemester },
    });

    return newYear;
  },

  /**
   * Aktifkan Tahun Ajaran.
   * Aturan: Hanya boleh ada SATU tahun ajaran ACTIVE dalam satu sekolah.
   * Tahun ajaran aktif sebelumnya otomatis diubah menjadi CLOSED.
   */
  async activateAcademicYear(
    yearId: string,
    schoolId: string,
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<AcademicYear> {
    // 1. Ambil seluruh tahun ajaran di sekolah ini
    const allYears = await this.getAcademicYears(schoolId);
    const target = allYears.find((y) => y.id === yearId);
    if (!target) {
      throw new Error('Tahun ajaran yang ingin diaktifkan tidak ditemukan.');
    }

    // 2. Tutup tahun ajaran yang saat ini ACTIVE (jika ada)
    const currentlyActive = allYears.filter((y) => y.status === 'ACTIVE' && y.id !== yearId);
    for (const oldYear of currentlyActive) {
      const oldRef = doc(db, COLLECTION_NAME, oldYear.id);
      await updateDoc(oldRef, {
        status: 'CLOSED',
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Set target menjadi ACTIVE
    const targetRef = doc(db, COLLECTION_NAME, yearId);
    await updateDoc(targetRef, {
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    });

    await auditLogService.logAction({
      schoolId,
      actorUserId: auth.currentUser?.uid || 'admin',
      actorRole,
      actorName,
      action: 'ACTIVATE_ACADEMIC_YEAR',
      targetType: 'ACADEMIC_YEAR',
      targetId: yearId,
      targetName: target.name,
      metadata: {
        previousActiveYearIds: currentlyActive.map((y) => y.id),
      },
    });

    return {
      ...target,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Pindah Semester (Fixing bug O.1:
   * "Perbaiki bug closeSemester() yang saat ini memiliki logika:
   * const nextSemester = active.activeSemester === 1 ? 2 : 2;
   * Jangan membiarkan semester 2 kembali menjadi semester 2 tanpa proses penutupan."
   */
  async switchSemester(
    yearId: string,
    schoolId: string,
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<{ nextSemester: SemesterNumber; requiresYearClose: boolean }> {
    const docRef = doc(db, COLLECTION_NAME, yearId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Tahun ajaran tidak ditemukan.');
    }

    const currentData = docSnap.data() as AcademicYear;
    if (currentData.status === 'CLOSED') {
      throw new Error('Tahun ajaran sudah ditutup (CLOSED). Tidak dapat berpindah semester.');
    }

    if (currentData.activeSemester === 1) {
      // Semester 1 -> Semester 2
      await updateDoc(docRef, {
        activeSemester: 2,
        updatedAt: new Date().toISOString(),
      });

      await auditLogService.logAction({
        schoolId,
        actorUserId: auth.currentUser?.uid || 'admin',
        actorRole,
        actorName,
        action: 'SWITCH_SEMESTER',
        targetType: 'ACADEMIC_YEAR',
        targetId: yearId,
        targetName: currentData.name,
        metadata: { fromSemester: 1, toSemester: 2 },
      });

      return { nextSemester: 2, requiresYearClose: false };
    }

    // Jika sedang di Semester 2, tidak boleh dibiarkan menjadi 2 lagi tanpa proses penutupan!
    return { nextSemester: 2, requiresYearClose: true };
  },

  /**
   * Menutup Tahun Ajaran (CLOSED).
   * Tahun ajaran CLOSED tidak boleh menerima observasi baru.
   */
  async closeAcademicYear(
    yearId: string,
    schoolId: string,
    options?: { forceClose?: boolean },
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<AcademicYear> {
    const docRef = doc(db, COLLECTION_NAME, yearId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Tahun ajaran tidak ditemukan.');
    }

    const currentData = docSnap.data() as AcademicYear;

    await updateDoc(docRef, {
      status: 'CLOSED',
      updatedAt: new Date().toISOString(),
    });

    await auditLogService.logAction({
      schoolId,
      actorUserId: auth.currentUser?.uid || 'admin',
      actorRole,
      actorName,
      action: 'CLOSE_ACADEMIC_YEAR',
      targetType: 'ACADEMIC_YEAR',
      targetId: yearId,
      targetName: currentData.name,
      metadata: { forced: !!options?.forceClose },
    });

    return {
      ...currentData,
      status: 'CLOSED',
      updatedAt: new Date().toISOString(),
    };
  },
};
