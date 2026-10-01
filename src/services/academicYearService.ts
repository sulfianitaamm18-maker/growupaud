import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { AcademicYear, AcademicYearStatus, SemesterNumber, UserRole } from '../types';
import { auditLogService } from './auditLogService';

/**
 * ============================================================================
 * FIRESTORE COLLECTION SCHEMA: `academicYears`
 * ============================================================================
 * Path: /academicYears/{yearId}
 * Document ID Format: ay-{sanitizedName}-{timestampSuffix} (e.g. "ay-2026-2027-8492")
 *
 * Schema Fields:
 * - id             : string (Firestore document ID)
 * - schoolId       : string (ID sekolah pemilik tahun ajaran)
 * - name           : string (Label tahun ajaran, e.g. "2026/2027")
 * - status         : 'PLANNED' | 'ACTIVE' | 'CLOSED'
 *                    * PLANNED : Tahun ajaran masa depan / persiapan.
 *                    * ACTIVE  : Tahun ajaran berjalan saat ini.
 *                                STRICT INVARIANT: Hanya boleh ada maksimal 1 per sekolah!
 *                    * CLOSED  : Tahun ajaran yang telah selesai (arsip historis immutable).
 * - activeSemester : 1 | 2 (1 = Semester Ganjil, 2 = Semester Genap)
 * - startDate      : string (YYYY-MM-DD, tanggal mulai tahun ajaran)
 * - endDate        : string (YYYY-MM-DD, tanggal selesai tahun ajaran)
 * - description    : string (Opsional: Catatan atau tema kurikulum sekolah)
 * - createdAt      : string (ISO 8601 Timestamp)
 * - updatedAt      : string (ISO 8601 Timestamp)
 *
 * Strict Single ACTIVE Invariant:
 * Operasi create, activate, dan update yang mengubah status menjadi 'ACTIVE'
 * menggunakan Firestore writeBatch atomik sehingga tahun ajaran aktif sebelumnya
 * secara otomatis dan aman dialihkan ke status 'CLOSED'.
 * ============================================================================
 */

export const ACADEMIC_YEARS_COLLECTION = 'academicYears';
export const DEFAULT_SCHOOL_ID = 'main-school';

/**
 * Validator schema tahun ajaran
 */
export function validateAcademicYearSchema(data: Partial<AcademicYear>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.schoolId || typeof data.schoolId !== 'string') {
    errors.push('schoolId wajib diisi.');
  }

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Nama tahun ajaran (name) wajib diisi.');
  }

  if (data.status && !['PLANNED', 'ACTIVE', 'CLOSED'].includes(data.status)) {
    errors.push("Status tahun ajaran harus berupa 'PLANNED', 'ACTIVE', atau 'CLOSED'.");
  }

  if (
    data.activeSemester !== undefined &&
    data.activeSemester !== 1 &&
    data.activeSemester !== 2
  ) {
    errors.push('activeSemester harus bernilai 1 atau 2.');
  }

  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    errors.push('startDate tidak boleh lebih besar dari endDate.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export const AcademicYearService = {
  /**
   * Mengambil seluruh tahun ajaran untuk sekolah tertentu (diurutkan startDate descending)
   */
  async getAcademicYears(schoolId: string): Promise<AcademicYear[]> {
    if (!auth.currentUser) return [];

    try {
      const colRef = collection(db, ACADEMIC_YEARS_COLLECTION);
      const q = query(colRef, where('schoolId', '==', schoolId));
      const snap = await getDocs(q);

      const years = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AcademicYear[];

      return years.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    } catch (err) {
      console.warn('Gagal mengambil data tahun ajaran:', err);
      return [];
    }
  },

  /**
   * Mengambil tahun ajaran yang sedang aktif (status === 'ACTIVE').
   * Menjamin hanya satu tahun aktif yang dikembalikan.
   * Jika ditemukan inkonsistensi data (lebih dari 1 ACTIVE), sistem melakukan self-healing.
   */
  async getActiveAcademicYear(schoolId: string): Promise<AcademicYear | null> {
    if (!auth.currentUser) return null;

    try {
      const colRef = collection(db, ACADEMIC_YEARS_COLLECTION);
      const q = query(
        colRef,
        where('schoolId', '==', schoolId),
        where('status', '==', 'ACTIVE')
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        return null;
      }

      if (snap.docs.length === 1) {
        const docSnap = snap.docs[0];
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as AcademicYear;
      }

      // Self-healing: jika lebih dari satu aktif, ambil yang paling baru diupdate/dimulai
      // dan tutup (CLOSED) dokumen lainnya secara atomik di background
      const activeList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AcademicYear[];

      activeList.sort((a, b) =>
        (b.updatedAt || b.startDate || '').localeCompare(a.updatedAt || a.startDate || '')
      );

      const primary = activeList[0];
      const duplicates = activeList.slice(1);

      try {
        const batch = writeBatch(db);
        duplicates.forEach((dup) => {
          batch.update(doc(db, ACADEMIC_YEARS_COLLECTION, dup.id), {
            status: 'CLOSED',
            updatedAt: new Date().toISOString(),
          });
        });
        await batch.commit();
        console.warn(
          `[AcademicYearService] Self-healed ${duplicates.length} duplicate ACTIVE year(s) for school ${schoolId}`
        );
      } catch (healErr) {
        console.warn('Gagal melakukan self-healing duplicate active years:', healErr);
      }

      return primary;
    } catch (err) {
      console.warn('Gagal mengambil tahun ajaran aktif:', err);
      return null;
    }
  },

  /**
   * Mengambil detail satu tahun ajaran berdasarkan ID
   */
  async getAcademicYearById(yearId: string): Promise<AcademicYear | null> {
    if (!auth.currentUser || !yearId) return null;
    try {
      const snap = await getDoc(doc(db, ACADEMIC_YEARS_COLLECTION, yearId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as AcademicYear;
      }
    } catch (err) {
      console.warn('Gagal mengambil tahun ajaran by id:', err);
    }
    return null;
  },

  /**
   * Buat tahun ajaran baru.
   * Jika status yang dibuat adalah 'ACTIVE', maka tahun ajaran aktif lain di sekolah tersebut
   * akan otomatis diubah menjadi 'CLOSED' menggunakan Firestore writeBatch atomik.
   */
  async createAcademicYear(
    data: {
      schoolId: string;
      name: string; // e.g. "2026/2027"
      startDate: string;
      endDate: string;
      status?: AcademicYearStatus;
      activeSemester?: SemesterNumber;
      description?: string;
    },
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<AcademicYear> {
    const cleanName = data.name.trim();
    const id = `ay-${cleanName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

    const existingActive = await this.getActiveAcademicYear(data.schoolId);
    const initialStatus: AcademicYearStatus =
      data.status || (existingActive ? 'PLANNED' : 'ACTIVE');

    const newYear: AcademicYear = {
      id,
      schoolId: data.schoolId,
      name: cleanName,
      status: initialStatus,
      activeSemester: data.activeSemester || 1,
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validation = validateAcademicYearSchema(newYear);
    if (!validation.isValid) {
      throw new Error(`Data tahun ajaran tidak valid: ${validation.errors.join(', ')}`);
    }

    const batch = writeBatch(db);

    // Jika status baru adalah ACTIVE, tutup semua tahun aktif yang ada di sekolah ini
    if (initialStatus === 'ACTIVE') {
      const activeQuery = query(
        collection(db, ACADEMIC_YEARS_COLLECTION),
        where('schoolId', '==', data.schoolId),
        where('status', '==', 'ACTIVE')
      );
      const activeSnap = await getDocs(activeQuery);
      activeSnap.docs.forEach((docSnap) => {
        batch.update(doc(db, ACADEMIC_YEARS_COLLECTION, docSnap.id), {
          status: 'CLOSED',
          updatedAt: new Date().toISOString(),
        });
      });
    }

    batch.set(doc(db, ACADEMIC_YEARS_COLLECTION, id), newYear);
    await batch.commit();

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
   * Mengaktifkan Tahun Ajaran.
   * Menggunakan Firestore writeBatch atomik:
   * Menjamin HANYA SATU tahun ajaran yang berstatus 'ACTIVE' dalam satu sekolah.
   * Semua tahun ajaran aktif sebelumnya otomatis diubah menjadi 'CLOSED'.
   */
  async activateAcademicYear(
    yearId: string,
    schoolId?: string,
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<AcademicYear> {
    const targetRef = doc(db, ACADEMIC_YEARS_COLLECTION, yearId);
    const targetSnap = await getDoc(targetRef);
    if (!targetSnap.exists()) {
      throw new Error('Tahun ajaran yang ingin diaktifkan tidak ditemukan.');
    }
    const targetData = targetSnap.data() as AcademicYear;
    const effectiveSchoolId = schoolId || targetData.schoolId || DEFAULT_SCHOOL_ID;

    // Ambil seluruh tahun ajaran berstatus ACTIVE saat ini di sekolah
    const activeQuery = query(
      collection(db, ACADEMIC_YEARS_COLLECTION),
      where('schoolId', '==', effectiveSchoolId),
      where('status', '==', 'ACTIVE')
    );
    const activeSnap = await getDocs(activeQuery);

    const batch = writeBatch(db);
    const deactivatedIds: string[] = [];

    // Tutup seluruh tahun ajaran aktif lama yang bukan target
    activeSnap.docs.forEach((docSnap) => {
      if (docSnap.id !== yearId) {
        batch.update(doc(db, ACADEMIC_YEARS_COLLECTION, docSnap.id), {
          status: 'CLOSED',
          updatedAt: new Date().toISOString(),
        });
        deactivatedIds.push(docSnap.id);
      }
    });

    // Set tahun target menjadi ACTIVE
    const nowISO = new Date().toISOString();
    batch.update(targetRef, {
      status: 'ACTIVE',
      updatedAt: nowISO,
    });

    await batch.commit();

    await auditLogService.logAction({
      schoolId: effectiveSchoolId,
      actorUserId: auth.currentUser?.uid || 'admin',
      actorRole,
      actorName,
      action: 'ACTIVATE_ACADEMIC_YEAR',
      targetType: 'ACADEMIC_YEAR',
      targetId: yearId,
      targetName: targetData.name,
      metadata: {
        previousActiveYearIds: deactivatedIds,
      },
    });

    return {
      ...targetData,
      status: 'ACTIVE',
      updatedAt: nowISO,
    };
  },

  /**
   * Mengubah status tahun ajaran secara eksplisit (PLANNED, ACTIVE, CLOSED).
   * Jika target menjadi ACTIVE, otomatis menutup tahun aktif lainnya dengan writeBatch.
   */
  async setAcademicYearStatus(
    yearId: string,
    schoolId: string,
    newStatus: AcademicYearStatus,
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<AcademicYear> {
    if (newStatus === 'ACTIVE') {
      return this.activateAcademicYear(yearId, schoolId, actorRole, actorName);
    }

    if (newStatus === 'CLOSED') {
      return this.closeAcademicYear(yearId, schoolId, undefined, actorRole, actorName);
    }

    // Mengubah ke PLANNED
    const targetRef = doc(db, ACADEMIC_YEARS_COLLECTION, yearId);
    const targetSnap = await getDoc(targetRef);
    if (!targetSnap.exists()) {
      throw new Error('Tahun ajaran tidak ditemukan.');
    }
    const currentData = targetSnap.data() as AcademicYear;

    const nowISO = new Date().toISOString();
    await updateDoc(targetRef, {
      status: 'PLANNED',
      updatedAt: nowISO,
    });

    return {
      ...currentData,
      status: 'PLANNED',
      updatedAt: nowISO,
    };
  },

  /**
   * Update data tahun ajaran (nama, tanggal, deskripsi, semester aktif, atau status)
   */
  async updateAcademicYear(
    yearId: string,
    schoolId: string,
    updates: Partial<
      Pick<
        AcademicYear,
        | 'name'
        | 'startDate'
        | 'endDate'
        | 'status'
        | 'activeSemester'
        | 'description'
      >
    >,
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<AcademicYear> {
    // Jika update mencakup perubahan status menjadi ACTIVE, delegasikan ke activateAcademicYear
    if (updates.status === 'ACTIVE') {
      await this.activateAcademicYear(yearId, schoolId, actorRole, actorName);
    }

    const docRef = doc(db, ACADEMIC_YEARS_COLLECTION, yearId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Tahun ajaran tidak ditemukan.');
    }

    const current = snap.data() as AcademicYear;
    const merged: AcademicYear = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const validation = validateAcademicYearSchema(merged);
    if (!validation.isValid) {
      throw new Error(`Data tahun ajaran tidak valid: ${validation.errors.join(', ')}`);
    }

    await updateDoc(docRef, {
      ...updates,
      updatedAt: merged.updatedAt,
    });

    return merged;
  },

  /**
   * Pindah Semester (Semester 1 -> Semester 2).
   * Mencegah Semester 2 kembali menjadi Semester 2 tanpa proses penutupan tahun ajaran.
   */
  async switchSemester(
    yearId: string,
    schoolId?: string,
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<{ nextSemester: SemesterNumber; requiresYearClose: boolean }> {
    const docRef = doc(db, ACADEMIC_YEARS_COLLECTION, yearId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Tahun ajaran tidak ditemukan.');
    }

    const currentData = docSnap.data() as AcademicYear;
    const effectiveSchoolId = schoolId || currentData.schoolId || DEFAULT_SCHOOL_ID;

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
        schoolId: effectiveSchoolId,
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

    // Jika sedang di Semester 2, tidak boleh dibiarkan menjadi 2 lagi tanpa proses penutupan
    return { nextSemester: 2, requiresYearClose: true };
  },

  /**
   * Menutup Tahun Ajaran (CLOSED).
   * Tahun ajaran CLOSED menjadi arsip historis dan tidak boleh menerima observasi baru.
   */
  async closeAcademicYear(
    yearId: string,
    schoolId?: string,
    options?: { forceClose?: boolean },
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<AcademicYear> {
    const docRef = doc(db, ACADEMIC_YEARS_COLLECTION, yearId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Tahun ajaran tidak ditemukan.');
    }

    const currentData = docSnap.data() as AcademicYear;
    const effectiveSchoolId = schoolId || currentData.schoolId || DEFAULT_SCHOOL_ID;

    await updateDoc(docRef, {
      status: 'CLOSED',
      updatedAt: new Date().toISOString(),
    });

    await auditLogService.logAction({
      schoolId: effectiveSchoolId,
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

  /**
   * Menghapus tahun ajaran (hanya jika belum memiliki data penting atau berstatus PLANNED).
   * Menolak penghapusan tahun ajaran yang sedang ACTIVE.
   */
  async deleteAcademicYear(
    yearId: string,
    schoolId?: string,
    actorRole: UserRole | string = 'ADMIN',
    actorName?: string
  ): Promise<void> {
    const docRef = doc(db, ACADEMIC_YEARS_COLLECTION, yearId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as AcademicYear;
    const effectiveSchoolId = schoolId || data.schoolId || DEFAULT_SCHOOL_ID;

    if (data.status === 'ACTIVE') {
      throw new Error(
        'Tahun ajaran yang sedang aktif (ACTIVE) tidak dapat dihapus. Silakan aktifkan tahun lain atau tutup terlebih dahulu.'
      );
    }

    await deleteDoc(docRef);

    await auditLogService.logAction({
      schoolId: effectiveSchoolId,
      actorUserId: auth.currentUser?.uid || 'admin',
      actorRole,
      actorName,
      action: 'CLOSE_ACADEMIC_YEAR',
      targetType: 'ACADEMIC_YEAR',
      targetId: yearId,
      targetName: data.name,
      metadata: { deleted: true },
    });
  },
};

// Export alias untuk kompatibilitas penuh dengan kode eksisting
export const academicYearService = AcademicYearService;
