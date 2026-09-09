import { collection, doc, getDocs, query, where, setDoc, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { AuditLog } from '../types';

export const auditLogService = {
  /**
   * Catat aktivitas penting siklus akademik ke Firestore
   */
  async logAction(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const entry: AuditLog = {
      ...logData,
      id,
      timestamp,
      actorUserId: logData.actorUserId || auth.currentUser?.uid || 'system',
    };

    try {
      const docRef = doc(db, 'auditLogs', id);
      await setDoc(docRef, entry);
    } catch (err) {
      console.warn('Gagal menyimpan audit log ke Firestore:', err);
    }

    return entry;
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
