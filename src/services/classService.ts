import { collection, doc, getDocs, query, where, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ClassRoom } from '../types';
import { DEFAULT_CLASSES } from './schoolStore';

const SCHOOL_DOC_ID = 'main-school';

export const classService = {
  /**
   * Fetch classes from Firestore `classes` collection
   */
  async getClasses(
    schoolId: string = SCHOOL_DOC_ID,
    userRole?: string,
    teacherUid?: string
  ): Promise<ClassRoom[]> {
    if (!auth.currentUser) return [];

    const currentUid = teacherUid || auth.currentUser.uid;
    const normalizedRole = (userRole || '').toUpperCase();
    const isTeacher = normalizedRole === 'TEACHER' || normalizedRole === 'GURU';
    const isParent = normalizedRole === 'PARENT' || normalizedRole === 'ORANG_TUA';

    // Orang Tua tidak membutuhkan dan tidak memiliki akses baca langsung ke collection classes
    if (isParent) {
      return [];
    }

    try {
      const classesRef = collection(db, 'classes');

      if (isTeacher) {
        // Strict Teacher Query: Hanya ambil kelas yang ditugaskan kepada guru ini
        const classesMap = new Map<string, ClassRoom>();

        // Query 1: where teacherId == currentUid
        try {
          const qTeacher = query(
            classesRef,
            where('schoolId', '==', schoolId),
            where('teacherId', '==', currentUid)
          );
          const snapTeacher = await getDocs(qTeacher);
          snapTeacher.docs.forEach((d) => {
            classesMap.set(d.id, { id: d.id, ...d.data() } as ClassRoom);
          });
        } catch (err) {
          console.warn('Teacher getClasses by teacherId notice:', err);
        }

        // Query 2: where teacherIds array contains currentUid
        try {
          const qTeacherIds = query(
            classesRef,
            where('schoolId', '==', schoolId),
            where('teacherIds', 'array-contains', currentUid)
          );
          const snapTeacherIds = await getDocs(qTeacherIds);
          snapTeacherIds.docs.forEach((d) => {
            classesMap.set(d.id, { id: d.id, ...d.data() } as ClassRoom);
          });
        } catch (err) {
          // ignore
        }

        return Array.from(classesMap.values());
      }

      // Administrative roles (Admin, Principal, Operator, SuperAdmin)
      const q = query(classesRef, where('schoolId', '==', schoolId));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        return querySnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ClassRoom[];
      }
    } catch (error) {
      console.warn('Firestore getClasses notice (handled gracefully):', error);
      return [];
    }
    return [];
  },

  /**
   * Add a new class to Firestore `classes` collection
   */
  async addClass(cls: Omit<ClassRoom, 'id'>, schoolId: string = SCHOOL_DOC_ID): Promise<ClassRoom> {
    const newId = cls.name ? `CLS-${Date.now().toString().slice(-4)}` : `CLS-${Math.random().toString(36).substring(2, 7)}`;
    const newClass: ClassRoom = {
      ...cls,
      id: newId,
    };

    try {
      const docRef = doc(db, 'classes', newId);
      await setDoc(docRef, {
        ...newClass,
        schoolId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return newClass;
    } catch (error: any) {
      console.error('Firestore addClass error:', error);
      throw new Error(error.message || 'Gagal menambahkan kelas ke Firestore.');
    }
  },

  /**
   * Update an existing class in Firestore `classes` collection
   */
  async updateClass(updatedClass: ClassRoom, schoolId: string = SCHOOL_DOC_ID): Promise<void> {
    try {
      const docRef = doc(db, 'classes', updatedClass.id);
      await setDoc(docRef, {
        ...updatedClass,
        schoolId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error: any) {
      console.error('Firestore updateClass error:', error);
      throw new Error(error.message || 'Gagal memperbarui data kelas di Firestore.');
    }
  },

  /**
   * Delete a class from Firestore `classes` collection
   */
  async deleteClass(classId: string): Promise<void> {
    try {
      const docRef = doc(db, 'classes', classId);
      await deleteDoc(docRef);
    } catch (error: any) {
      console.error('Firestore deleteClass error:', error);
      throw new Error(error.message || 'Gagal menghapus kelas dari Firestore.');
    }
  }
};
