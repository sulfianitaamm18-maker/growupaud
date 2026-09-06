import { collection, doc, getDoc, getDocs, query, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { StudentProfile } from '../types';

const SCHOOL_DOC_ID = 'main-school';

export const studentService = {
  /**
   * Fetch students from Firestore `students` collection
   */
  async getStudents(
    schoolId: string = SCHOOL_DOC_ID,
    userRole?: string,
    parentStudentIds?: string[]
  ): Promise<StudentProfile[]> {
    if (!auth.currentUser) return [];

    const isParent = userRole === 'PARENT' || userRole === 'ORANG_TUA';

    try {
      const studentsRef = collection(db, 'students');

      if (isParent) {
        // Strict Isolation: Parents only query and retrieve their own child/children
        const results: StudentProfile[] = [];
        const seenIds = new Set<string>();

        // 1. Fetch by parentIds array containing auth uid
        try {
          const parentQuery = query(studentsRef, where('parentIds', 'array-contains', auth.currentUser.uid));
          const parentSnap = await getDocs(parentQuery);
          parentSnap.docs.forEach((d) => {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              results.push({ id: d.id, ...d.data() } as StudentProfile);
            }
          });
        } catch (e) {
          console.warn('Firestore parentIds query fallback:', e);
        }

        // 2. Fetch specific linked student documents if registered in user profile
        if (parentStudentIds && parentStudentIds.length > 0) {
          for (const sId of parentStudentIds) {
            if (!seenIds.has(sId)) {
              try {
                const sDoc = await getDoc(doc(db, 'students', sId));
                if (sDoc.exists()) {
                  seenIds.add(sDoc.id);
                  results.push({ id: sDoc.id, ...sDoc.data() } as StudentProfile);
                }
              } catch (e) {
                console.warn(`Could not load child document ${sId}:`, e);
              }
            }
          }
        }

        return results;
      }

      // Non-parent users (Admin, Principal, Teacher)
      const q = query(studentsRef, where('schoolId', '==', schoolId));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        return querySnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as StudentProfile[];
      }
    } catch (error) {
      console.warn('Firestore getStudents error:', error);
      throw new Error('Gagal mengambil data siswa dari Firestore.');
    }
    return [];
  },

  /**
   * Fetch single student by ID from Firestore
   */
  async getStudentById(studentId: string): Promise<StudentProfile | null> {
    if (!auth.currentUser) return null;

    try {
      const docRef = doc(db, 'students', studentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as StudentProfile;
      }
    } catch (error) {
      console.warn('Firestore getStudentById error:', error);
    }
    return null;
  },

  /**
   * Add new student master record to Firestore `students` collection
   */
  async addStudent(student: Omit<StudentProfile, 'id'>, schoolId: string = SCHOOL_DOC_ID): Promise<StudentProfile> {
    const newId = `std-${Date.now().toString().slice(-5)}`;
    const newStudent: StudentProfile = {
      ...student,
      id: newId,
    };

    try {
      const docRef = doc(db, 'students', newId);
      // Clean master document payload
      const formattedAge = student.ageLabel || student.age || (typeof student.ageYears === 'number' ? `${student.ageYears} tahun ${student.ageMonths || 0} bulan` : '');
      const masterPayload = {
        id: newId,
        schoolId,
        classId: student.classId || '',
        name: student.name,
        nickname: student.nickname || '',
        age: formattedAge,
        ageYears: typeof student.ageYears === 'number' ? student.ageYears : null,
        ageMonths: typeof student.ageMonths === 'number' ? student.ageMonths : null,
        ageLabel: formattedAge || null,
        gender: student.gender || 'L',
        className: student.className || '',
        parentName: student.parentName || '',
        parentContact: student.parentContact || '',
        avatar: student.avatar || '',
        parentIds: student.parentIds || [],
        teacherIds: student.teacherIds || [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, masterPayload);

      return newStudent;
    } catch (error: any) {
      console.error('Firestore addStudent error:', error);
      throw new Error(error.message || 'Gagal menambahkan siswa ke Firestore.');
    }
  },

  /**
   * Update existing student master profile in Firestore `students` collection
   */
  async updateStudent(updatedStudent: StudentProfile, schoolId: string = SCHOOL_DOC_ID): Promise<void> {
    try {
      const docRef = doc(db, 'students', updatedStudent.id);
      const formattedAge = updatedStudent.ageLabel || updatedStudent.age || (typeof updatedStudent.ageYears === 'number' ? `${updatedStudent.ageYears} tahun ${updatedStudent.ageMonths || 0} bulan` : '');
      const masterPayload = {
        id: updatedStudent.id,
        schoolId,
        classId: updatedStudent.classId || '',
        name: updatedStudent.name,
        nickname: updatedStudent.nickname || '',
        age: formattedAge,
        ageYears: typeof updatedStudent.ageYears === 'number' ? updatedStudent.ageYears : null,
        ageMonths: typeof updatedStudent.ageMonths === 'number' ? updatedStudent.ageMonths : null,
        ageLabel: formattedAge || null,
        gender: updatedStudent.gender || 'L',
        className: updatedStudent.className || '',
        parentName: updatedStudent.parentName || '',
        parentContact: updatedStudent.parentContact || '',
        avatar: updatedStudent.avatar || '',
        parentIds: updatedStudent.parentIds || [],
        teacherIds: updatedStudent.teacherIds || [],
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, masterPayload, { merge: true });
    } catch (error: any) {
      console.error('Firestore updateStudent error:', error);
      throw new Error(error.message || 'Gagal memperbarui data siswa di Firestore.');
    }
  },

  /**
   * Delete student from Firestore `students` collection
   */
  async deleteStudent(studentId: string): Promise<void> {
    try {
      const docRef = doc(db, 'students', studentId);
      await deleteDoc(docRef);
    } catch (error: any) {
      console.error('Firestore deleteStudent error:', error);
      throw new Error(error.message || 'Gagal menghapus data siswa dari Firestore.');
    }
  }
};
