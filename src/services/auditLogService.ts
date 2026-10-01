import { collection, doc, getDocs, query, where, setDoc, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { AuditLog, UserProfile } from '../types';
import { userStore } from './userStore';

/**
 * Sanitasi rekursif payload Firestore agar field bertipe undefined tidak pernah dikirim ke Firestore.
 * Jika data tidak tersedia, diganti dengan null atau fallback yang valid (tanpa delete field sembarangan).
 */
export function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  const result: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      result[key] = null;
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      result[key] = sanitizeFirestorePayload(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Resolusi terpusat untuk actorName sesuai instruksi prioritas:
 * 1. userProfile.displayName / name / fullName
 * 2. Firebase Auth displayName
 * 3. email
 * 4. uid
 * 5. "Unknown User"
 *
 * Mengembalikan string valid non-empty, tidak pernah undefined.
 */
export function resolveActorName(
  explicitName?: string | null,
  cachedProfile?: UserProfile | null,
  firebaseUser = auth.currentUser
): string {
  // Bila ada explicitName yang valid dan bukan string kosong
  if (explicitName && typeof explicitName === 'string' && explicitName.trim().length > 0) {
    return explicitName.trim();
  }

  // Prioritas 1: userProfile.displayName / name / fullName
  if (cachedProfile) {
    const profileName =
      cachedProfile.displayName ||
      cachedProfile.name ||
      (cachedProfile as any).fullName;
    if (profileName && typeof profileName === 'string' && profileName.trim().length > 0) {
      return profileName.trim();
    }
  }

  // Prioritas 2: Firebase Auth displayName
  if (firebaseUser?.displayName && typeof firebaseUser.displayName === 'string' && firebaseUser.displayName.trim().length > 0) {
    return firebaseUser.displayName.trim();
  }

  // Prioritas 3: email
  const email = cachedProfile?.email || firebaseUser?.email;
  if (email && typeof email === 'string' && email.trim().length > 0) {
    return email.trim();
  }

  // Prioritas 4: uid
  const uid = firebaseUser?.uid || cachedProfile?.id || cachedProfile?.uid;
  if (uid && typeof uid === 'string' && uid.trim().length > 0) {
    return uid.trim();
  }

  // Prioritas 5: "Unknown User"
  return 'Unknown User';
}

function inferModuleFromAction(action?: string, targetType?: string): string {
  const act = (action || '').toUpperCase();
  if (act.includes('ACADEMIC_YEAR') || act.includes('SEMESTER')) return 'ACADEMIC_YEAR';
  if (act.includes('ENROLL') || act.includes('PROMOTE') || act.includes('REPEAT') || act.includes('GRADUATE') || act.includes('TRANSFER') || act.includes('ARCHIVE')) return 'ENROLLMENT_LIFECYCLE';
  if (act.includes('OBSERVATION')) return 'OBSERVATION';
  if (act.includes('REPORT')) return 'REPORT';
  if (targetType) return targetType;
  return 'GENERAL';
}

export const auditLogService = {
  /**
   * Catat aktivitas penting siklus akademik ke Firestore secara terpusat dan aman.
   * Menjamin dokumen audit minimal:
   * { actorId, actorName, actorEmail, actorRole, action, module, schoolId, timestamp }
   * serta sanitasi penuh tanpa undefined.
   */
  async logAction(logData: Partial<AuditLog> & { action: string }): Promise<AuditLog> {
    const id = logData.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const currentUid = auth.currentUser?.uid;
    const actorId = logData.actorId || logData.actorUserId || currentUid || 'system';

    // Ambil cached profile dari userStore secara terpusat
    const cachedProfile =
      actorId && actorId !== 'system'
        ? userStore.getCachedProfile(actorId) || (currentUid ? userStore.getCachedProfile(currentUid) : null)
        : currentUid
        ? userStore.getCachedProfile(currentUid)
        : null;

    // Resolusi actorName sesuai hirarki prioritas 1-5
    const actorName = resolveActorName(logData.actorName, cachedProfile, auth.currentUser);

    // Resolusi email
    const actorEmail =
      logData.actorEmail !== undefined
        ? logData.actorEmail
        : cachedProfile?.email || auth.currentUser?.email || null;

    // Resolusi role
    const actorRole =
      logData.actorRole ||
      cachedProfile?.role ||
      'TEACHER';

    // Resolusi schoolId
    const schoolId =
      logData.schoolId ||
      cachedProfile?.schoolId ||
      'main-school';

    // Resolusi module
    const module = logData.module || inferModuleFromAction(logData.action, logData.targetType);

    // Bangun dokumen audit lengkap
    const rawEntry: AuditLog = {
      id,
      actorId,
      actorUserId: actorId, // backwards compatibility
      actorName,
      actorEmail: actorEmail || null,
      actorRole,
      action: logData.action,
      module,
      schoolId,
      timestamp,
      targetType: logData.targetType || 'GENERAL',
      targetId: logData.targetId || id,
      targetName: logData.targetName || null as any,
      metadata: logData.metadata || null as any,
    };

    // Sanitasi payload: jamin tidak ada field undefined yang dikirim ke Firestore
    const cleanEntry = sanitizeFirestorePayload(rawEntry);

    try {
      const docRef = doc(db, 'auditLogs', id);
      await setDoc(docRef, cleanEntry);
      console.log(`[AUDIT_LOG] Tersimpan di Firestore: ${id} | Aktor: ${actorName} (${actorRole}) | Aksi: ${cleanEntry.action}`);
    } catch (err: any) {
      console.error('Gagal menyimpan audit log ke Firestore:', err);
    }

    return cleanEntry;
  },

  /**
   * Ambil daftar audit log untuk sekolah tertentu
   */
  async getAuditLogs(schoolId: string, maxLimit: number = 100): Promise<AuditLog[]> {
    if (!auth.currentUser) return [];

    try {
      const logsRef = collection(db, 'auditLogs');
      const q = query(
        logsRef,
        where('schoolId', '==', schoolId),
        orderBy('timestamp', 'desc'),
        limit(maxLimit)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as AuditLog);
    } catch (err) {
      // Fallback if index on timestamp is not yet built
      try {
        const logsRef = collection(db, 'auditLogs');
        const qFallback = query(logsRef, where('schoolId', '==', schoolId));
        const snap = await getDocs(qFallback);
        const list = snap.docs.map((d) => d.data() as AuditLog);
        return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } catch (fErr) {
        console.warn('Gagal mengambil audit log:', fErr);
        return [];
      }
    }
  },
};
