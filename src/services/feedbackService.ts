import { collection, doc, getDocs, query, where, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ParentFeedback } from '../types';

export const feedbackService = {
  /**
   * Mengambil umpan balik orang tua dari Firestore berdasarkan schoolId dan/atau studentId.
   */
  async getFeedbacks(schoolId: string = 'main-school', studentId?: string): Promise<ParentFeedback[]> {
    if (!auth.currentUser) return [];

    try {
      const feedbacksRef = collection(db, 'feedbacks');
      let q = query(feedbacksRef, where('schoolId', '==', schoolId));
      if (studentId) {
        q = query(feedbacksRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId));
      }
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        return querySnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ParentFeedback[];
      }
      return [];
    } catch (error) {
      console.warn('Firestore getFeedbacks warning:', error);
      return [];
    }
  },

  /**
   * Berlangganan umpan balik orang tua secara real-time.
   */
  subscribeFeedbacks(
    schoolId: string = 'main-school',
    studentId: string | undefined,
    onUpdate: (feedbacks: ParentFeedback[]) => void,
    onError?: (err: any) => void
  ): () => void {
    if (!auth.currentUser) {
      onUpdate([]);
      return () => {};
    }

    try {
      const feedbacksRef = collection(db, 'feedbacks');
      let q = query(feedbacksRef, where('schoolId', '==', schoolId));
      if (studentId) {
        q = query(feedbacksRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId));
      }

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as ParentFeedback[];
          // Sort newest first by createdAt or id
          list.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
          onUpdate(list);
        },
        (err) => {
          console.warn('Firestore subscribeFeedbacks error:', err);
          if (onError) onError(err);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.warn('Failed to setup feedback subscription:', e);
      return () => {};
    }
  },

  /**
   * Menyimpan umpan balik / pesan konsultasi baru ke Firestore.
   */
  async addFeedback(
    feedback: ParentFeedback,
    schoolId: string = 'main-school',
    parentUid?: string
  ): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Sesi pengguna tidak valid. Silakan login terlebih dahulu.');
    }

    try {
      const feedbackId = feedback.id || `fb-${Date.now()}`;
      const docRef = doc(db, 'feedbacks', feedbackId);
      const dataToSave = {
        id: feedbackId,
        studentId: feedback.studentId,
        studentName: feedback.studentName || '',
        parentName: feedback.parentName,
        parentId: parentUid || auth.currentUser.uid,
        recipientRole: feedback.recipientRole || 'GURU',
        recipientName: feedback.recipientName || 'Wali Kelas',
        category: feedback.category || 'KONSULTASI_PERKEMBANGAN',
        comment: feedback.comment,
        date: feedback.date,
        replyFromTeacher: feedback.replyFromTeacher || null,
        repliedBy: feedback.repliedBy || null,
        repliedAt: feedback.repliedAt || null,
        status: feedback.replyFromTeacher ? 'DIBALAS' : 'TERKIRIM',
        schoolId,
        createdAt: feedback.createdAt || new Date().toISOString(),
      };
      await setDoc(docRef, dataToSave);
    } catch (error: any) {
      console.error('Firestore addFeedback error:', error);
      throw new Error(error.message || 'Gagal menyimpan umpan balik ke database.');
    }
  },

  /**
   * Menambahkan balasan guru atau kepala sekolah pada umpan balik orang tua.
   */
  async replyFeedback(
    feedbackId: string,
    replyText: string,
    repliedByName: string,
    repliedByRole: string = 'GURU'
  ): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Sesi pengguna tidak valid.');
    }

    try {
      const docRef = doc(db, 'feedbacks', feedbackId);
      await updateDoc(docRef, {
        replyFromTeacher: replyText,
        repliedBy: `${repliedByName} (${repliedByRole})`,
        repliedAt: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        status: 'DIBALAS',
        updatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Firestore replyFeedback error:', error);
      throw new Error(error.message || 'Gagal mengirim balasan.');
    }
  },
};
