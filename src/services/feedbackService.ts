import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  onSnapshot,
  updateDoc,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ParentFeedback } from '../types';

export const feedbackService = {
  /**
   * Mengambil umpan balik orang tua dari Firestore.
   * Untuk Orang Tua: query DIBATASI LANGSUNG oleh parentId == auth.currentUser.uid.
   * Untuk Staf Sekolah: query dibatasi oleh schoolId (dan studentId jika ada).
   */
  async getFeedbacks(
    schoolId: string = 'main-school',
    studentId?: string,
    isParent: boolean = false,
    userRole?: string
  ): Promise<ParentFeedback[]> {
    if (!auth.currentUser) return [];

    try {
      const feedbacksRef = collection(db, 'feedbacks');
      let q: Query<DocumentData>;

      if (isParent) {
        // Query langsung dibatasi oleh parentId == auth.currentUser.uid
        q = studentId
          ? query(
              feedbacksRef,
              where('parentId', '==', auth.currentUser.uid),
              where('studentId', '==', studentId)
            )
          : query(feedbacksRef, where('parentId', '==', auth.currentUser.uid));
      } else {
        const normalizedRole = (userRole || '').toUpperCase();
        const isTeacher = normalizedRole === 'TEACHER' || normalizedRole === 'GURU';

        if (studentId) {
          q = query(
            feedbacksRef,
            where('schoolId', '==', schoolId),
            where('studentId', '==', studentId)
          );
        } else if (isTeacher) {
          // Guru hanya dapat mengakses feedback terkait murid yang diampunya, bukan seluruh sekolah
          return [];
        } else {
          // Admin / Kepala Sekolah / Operator
          q = query(feedbacksRef, where('schoolId', '==', schoolId));
        }
      }

      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        return querySnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Record<string, any>),
        })) as ParentFeedback[];
      }
      return [];
    } catch (error: any) {
      if (error?.code !== 'permission-denied') {
        console.warn('Firestore getFeedbacks notice:', error?.message || error);
      }
      return [];
    }
  },

  /**
   * Berlangganan umpan balik orang tua secara real-time.
   * Untuk Orang Tua: query DIBATASI LANGSUNG oleh parentId == auth.currentUser.uid.
   * Untuk Staf Sekolah: query dibatasi oleh schoolId & hak akses role.
   */
  subscribeFeedbacks(
    schoolId: string = 'main-school',
    studentId: string | undefined,
    onUpdate: (feedbacks: ParentFeedback[]) => void,
    onError?: (err: any) => void,
    isParent: boolean = false,
    userRole?: string
  ): () => void {
    if (!auth.currentUser) {
      onUpdate([]);
      return () => {};
    }

    try {
      const feedbacksRef = collection(db, 'feedbacks');
      let q: Query<DocumentData>;

      if (isParent) {
        // Query dibatasi langsung pada parentId pengguna aktif
        q = studentId
          ? query(
              feedbacksRef,
              where('parentId', '==', auth.currentUser.uid),
              where('studentId', '==', studentId)
            )
          : query(feedbacksRef, where('parentId', '==', auth.currentUser.uid));
      } else {
        const normalizedRole = (userRole || '').toUpperCase();
        const isTeacher = normalizedRole === 'TEACHER' || normalizedRole === 'GURU';

        if (studentId) {
          q = query(
            feedbacksRef,
            where('schoolId', '==', schoolId),
            where('studentId', '==', studentId)
          );
        } else if (isTeacher) {
          // Guru membaca feedback untuk siswa yang diasuh (berdasarkan teacherIds)
          q = query(
            feedbacksRef,
            where('schoolId', '==', schoolId),
            where('teacherIds', 'array-contains', auth.currentUser.uid)
          );
        } else {
          // Admin / Kepala Sekolah / Operator
          q = query(feedbacksRef, where('schoolId', '==', schoolId));
        }
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
        (err: any) => {
          const isPermErr =
            err?.code === 'permission-denied' ||
            String(err?.message || '').includes('insufficient permissions');
          if (isPermErr) {
            onUpdate([]);
          } else {
            console.warn('Firestore subscribeFeedbacks notice:', err?.message || err);
          }
          if (onError) onError(err);
        }
      );

      return unsubscribe;
    } catch (e: any) {
      console.warn('Failed to setup feedback subscription:', e?.message || e);
      onUpdate([]);
      return () => {};
    }
  },

  /**
   * Menyimpan umpan balik / pesan konsultasi baru ke Firestore.
   * Memvalidasi bahwa studentId memang mencantumkan auth.currentUser.uid di students.parentIds.
   */
  async addFeedback(
    feedback: ParentFeedback,
    schoolId: string = 'main-school',
    parentUid?: string
  ): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('Sesi pengguna tidak valid. Silakan login terlebih dahulu.');
    }

    const currentUid = auth.currentUser.uid;
    const authorParentId = parentUid || currentUid;

    // Validasi otoritas hubungan orang tua -> siswa pada sumber data students/{studentId}.parentIds
    if (!feedback.studentId) {
      throw new Error('ID Siswa (studentId) wajib disertakan untuk umpan balik.');
    }

    try {
      const studentSnap = await getDoc(doc(db, 'students', feedback.studentId));
      if (!studentSnap.exists()) {
        throw new Error('Data siswa tidak ditemukan.');
      }
      const studentData = studentSnap.data();

      // Sumber otoritatif: students/{studentId}.parentIds
      const isAuthorizedParent =
        (Array.isArray(studentData.parentIds) && studentData.parentIds.includes(currentUid)) ||
        studentData.parentId === currentUid;

      if (!isAuthorizedParent) {
        throw new Error('Akses ditolak: Anda tidak memiliki wewenang mengirim umpan balik untuk siswa ini.');
      }

      const feedbackId = feedback.id || `fb-${Date.now()}`;
      const docRef = doc(db, 'feedbacks', feedbackId);
      const dataToSave = {
        id: feedbackId,
        studentId: feedback.studentId,
        studentName: studentData.name || feedback.studentName || '',
        parentName: feedback.parentName,
        parentId: authorParentId,
        recipientRole: feedback.recipientRole || 'GURU',
        recipientName: feedback.recipientName || 'Wali Kelas',
        category: feedback.category || 'KONSULTASI_PERKEMBANGAN',
        comment: feedback.comment,
        date: feedback.date,
        replyFromTeacher: feedback.replyFromTeacher || null,
        repliedBy: feedback.repliedBy || null,
        repliedAt: feedback.repliedAt || null,
        status: feedback.replyFromTeacher ? 'DIBALAS' : 'TERKIRIM',
        schoolId: studentData.schoolId || schoolId,
        teacherIds: Array.isArray(studentData.teacherIds) ? studentData.teacherIds : [],
        classId: studentData.classId || '',
        parentIds: Array.isArray(studentData.parentIds) ? studentData.parentIds : [authorParentId],
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
