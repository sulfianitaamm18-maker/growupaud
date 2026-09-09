import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ObservationRecord } from '../types';

const DEFAULT_SCHOOL_ID = 'main-school';

/**
 * Recursively removes undefined values to satisfy Firestore object constraints.
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        cleaned[key] = sanitizeForFirestore(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

export const observationService = {
  /**
   * Helper to normalize raw Firestore observation document data into ObservationRecord.
   */
  normalizeObservation(id: string, raw: Record<string, any>, defaultSchoolId: string = DEFAULT_SCHOOL_ID): ObservationRecord {
    return {
      id: id,
      schoolId: raw.schoolId || raw.school_id || defaultSchoolId,
      studentId: raw.studentId || raw.student_id || '',
      studentName: raw.studentName || raw.student_name || '',
      classId: raw.classId || raw.class_id || '',
      className: raw.className || raw.class_name || '',
      teacherId: raw.teacherId || raw.teacher_id || raw.createdBy || raw.teacherUid || '',
      teacherName: raw.teacherName || raw.teacher_name || '',
      activityId: raw.activityId || raw.activity_id || '',
      activityTitle: raw.activityTitle || raw.activity_title || raw.title || '',
      academicYear: raw.academicYear || raw.academic_year || '2026/2027',
      semester: raw.semester || 'Semester I (Ganjil)',
      date:
        raw.date ||
        (raw.observationDateISO
          ? new Date(raw.observationDateISO).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : new Date().toLocaleDateString('id-ID')),
      observationDateISO: raw.observationDateISO || raw.createdAt || new Date().toISOString(),
      cp: raw.cp || '',
      tp: raw.tp || '',
      elementId: raw.elementId || raw.element_id || '',
      cpId: raw.cpId || raw.cp_id || '',
      tpId: raw.tpId || raw.tp_id || '',
      themeId: raw.themeId || '',
      subthemeId: raw.subthemeId || '',
      indicators: raw.indicators || [],
      evidences: raw.evidences || raw.evidence || raw.imageEvidence || [],
      teacherNote: raw.teacherNote || raw.teacherNotes || raw.notes || raw.catatanGuru || '',
      voiceNoteText: raw.voiceNoteText || raw.voiceNote?.transcript || '',
      voiceNote: raw.voiceNote,
      aiAnalysis: raw.aiAnalysis || raw.aiInsight || raw.analysis,
      status: raw.status || 'FINAL',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  },

  /**
   * Fetch all observations for a school or parent context from Firestore.
   */
  async getObservations(
    schoolId: string = DEFAULT_SCHOOL_ID,
    userRole?: string,
    parentStudentIds?: string[]
  ): Promise<ObservationRecord[]> {
    if (!auth.currentUser) return [];

    try {
      const obsRef = collection(db, 'observations');
      let q;

      if ((userRole === 'PARENT' || userRole === 'ORANG_TUA')) {
        if (parentStudentIds && parentStudentIds.length > 0) {
          q = query(obsRef, where('studentId', 'in', parentStudentIds.slice(0, 10)));
        } else {
          return [];
        }
      } else if (userRole === 'TEACHER' || userRole === 'GURU') {
        // Strict Teacher Isolation: Guru queries observations where teacherId == auth.currentUser.uid
        q = query(
          obsRef,
          where('schoolId', '==', schoolId),
          where('teacherId', '==', auth.currentUser.uid)
        );
      } else {
        q = query(obsRef, where('schoolId', '==', schoolId));
      }

      const snap = await getDocs(q);
      return snap.docs.map((d) => this.normalizeObservation(d.id, d.data(), schoolId));
    } catch (error) {
      console.warn('Firestore getObservations error:', error);
      throw error;
    }
  },

  /**
   * Fetch observations by student ID from Firestore.
   */
  async getObservationsByStudent(studentId: string): Promise<ObservationRecord[]> {
    try {
      const obsRef = collection(db, 'observations');
      const q = query(obsRef, where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => this.normalizeObservation(d.id, d.data()));
    } catch (error) {
      console.warn('Firestore getObservationsByStudent error:', error);
      throw error;
    }
  },

  /**
   * Fetch single observation by ID from Firestore.
   */
  async getObservationById(id: string): Promise<ObservationRecord | null> {
    try {
      const docRef = doc(db, 'observations', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return this.normalizeObservation(docSnap.id, docSnap.data());
      }
    } catch (error) {
      console.warn('Firestore getObservationById error:', error);
      throw error;
    }
    return null;
  },

  /**
   * Add a new observation record to Firestore `observations` collection.
   */
  async addObservation(
    obs: Omit<ObservationRecord, 'id'> & { id?: string },
    schoolId: string = DEFAULT_SCHOOL_ID
  ): Promise<ObservationRecord> {
    const docId = obs.id || `obs-${Date.now()}`;
    const nowISO = new Date().toISOString();

    const recordToSave: ObservationRecord = {
      ...obs,
      id: docId,
      schoolId: obs.schoolId || schoolId,
      evidences: obs.evidences || [],
      indicators: obs.indicators || [],
      createdAt: obs.createdAt || nowISO,
      updatedAt: nowISO,
    };

    const sanitized = sanitizeForFirestore(recordToSave);
    const docRef = doc(db, 'observations', docId);

    console.log('[OBSERVATION FIRESTORE WRITE]');
    console.log(`operation = setDoc`);
    console.log(`collection = observations`);
    console.log(`documentId = ${docId}`);

    try {
      await setDoc(docRef, sanitized);
      return recordToSave;
    } catch (err: any) {
      console.error('[OBSERVATION SAVE ERROR]');
      console.error(`code = ${err?.code || 'UNKNOWN'}`);
      console.error(`message = ${err?.message || err}`);
      throw err;
    }
  },

  /**
   * Update an existing observation record in Firestore.
   */
  async updateObservation(obs: ObservationRecord): Promise<void> {
    const docRef = doc(db, 'observations', obs.id);
    const updatedRecord: ObservationRecord = {
      ...obs,
      updatedAt: new Date().toISOString(),
    };
    const sanitized = sanitizeForFirestore(updatedRecord);
    await setDoc(docRef, sanitized, { merge: true });
  },

  /**
   * Delete an observation record from Firestore.
   */
  async deleteObservation(id: string): Promise<void> {
    const docRef = doc(db, 'observations', id);
    await deleteDoc(docRef);
  },

  /**
   * Real-time subscription for observations collection in Firestore.
   */
  subscribeToObservations(
    schoolId: string = DEFAULT_SCHOOL_ID,
    userRole?: string,
    parentStudentIds?: string[],
    onUpdate?: (records: ObservationRecord[]) => void,
    onError?: (err: any) => void
  ): () => void {
    if (!auth.currentUser) {
      if (onUpdate) onUpdate([]);
      return () => {};
    }

    const obsRef = collection(db, 'observations');
    let q;

    if ((userRole === 'PARENT' || userRole === 'ORANG_TUA')) {
      if (parentStudentIds && parentStudentIds.length > 0) {
        q = query(obsRef, where('studentId', 'in', parentStudentIds.slice(0, 10)));
      } else {
        // Parent without students -> return empty immediately
        if (onUpdate) onUpdate([]);
        return () => {};
      }
    } else if (userRole === 'TEACHER' || userRole === 'GURU') {
      // Strict Teacher Isolation: Guru queries observations where teacherId == auth.currentUser.uid
      q = query(
        obsRef,
        where('schoolId', '==', schoolId),
        where('teacherId', '==', auth.currentUser.uid)
      );
    } else {
      q = query(obsRef, where('schoolId', '==', schoolId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records = snapshot.docs.map((d) =>
          this.normalizeObservation(d.id, d.data(), schoolId)
        );

        console.log(`[OBSERVATION FIRESTORE SNAPSHOT]\nschoolId = ${schoolId}\nreceivedCount = ${records.length}\nobservationIds = ${JSON.stringify(records.map((r) => r.id))}`);

        if (onUpdate) onUpdate(records);
      },
      (error) => {
        console.warn('Firestore subscribeToObservations error:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  },
};
