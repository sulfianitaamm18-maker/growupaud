import { collection, doc, getDoc, getDocs, query, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { StudentProfile, ClassRoom } from '../types';
import { classService } from './classService';
import { userStore } from './userStore';

const SCHOOL_DOC_ID = 'main-school';

export const studentService = {
  /**
   * Fetch students from Firestore `students` collection
   */
  async getStudents(
    schoolId: string = SCHOOL_DOC_ID,
    userRole?: string,
    parentStudentIds?: string[],
    assignedClasses?: ClassRoom[]
  ): Promise<StudentProfile[]> {
    if (!auth.currentUser) return [];

    const currentUid = auth.currentUser.uid;
    const effectiveRole = (
      userRole ||
      (auth.currentUser ? userStore.getCachedProfile(currentUid)?.role : undefined) ||
      ''
    ).toUpperCase();

    const isParent = effectiveRole === 'PARENT' || effectiveRole === 'ORANG_TUA';
    const isTeacher = effectiveRole === 'TEACHER' || effectiveRole === 'GURU';

    try {
      const studentsRef = collection(db, 'students');

      if (isParent) {
        // Strict Authoritative Isolation: Query exclusively by parentIds array containing auth.currentUser.uid
        const parentQuery = query(studentsRef, where('parentIds', 'array-contains', currentUid));
        const parentSnap = await getDocs(parentQuery);
        return parentSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as StudentProfile[];
      }

      // Teacher users: strictly isolate queries to assigned class/teacherIds at the Firestore query level
      if (isTeacher) {
        const resultsMap = new Map<string, StudentProfile>();

        // Query 1: by teacherIds array-contains currentUid
        try {
          const qTeacher = query(
            studentsRef,
            where('schoolId', '==', schoolId),
            where('teacherIds', 'array-contains', currentUid)
          );
          const snapTeacher = await getDocs(qTeacher);
          snapTeacher.docs.forEach((d) => resultsMap.set(d.id, { id: d.id, ...d.data() } as StudentProfile));
        } catch (e) {
          // ignore
        }

        // Kumpulkan daftar kelas yang ditugaskan ke guru ini
        const classIdsSet = new Set<string>();
        const classNamesSet = new Set<string>();

        if (assignedClasses && assignedClasses.length > 0) {
          assignedClasses.forEach((c) => {
            if (c.id) classIdsSet.add(c.id);
            if (c.name) classNamesSet.add(c.name);
          });
        } else {
          try {
            const myClasses = await classService.getClasses(schoolId, 'TEACHER', currentUid);
            myClasses.forEach((c) => {
              if (c.id) classIdsSet.add(c.id);
              if (c.name) classNamesSet.add(c.name);
            });
          } catch (cErr) {
            console.warn('Unable to get teacher assigned classes:', cErr);
          }
        }

        // Cek profil user jika ada classId/className
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUid));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            if (uData?.classId) classIdsSet.add(uData.classId);
            if (uData?.className) classNamesSet.add(uData.className);
          }
        } catch (uErr) {
          // ignore
        }

        // Query 2: Ambil siswa untuk masing-masing classId yang ditugaskan
        for (const cId of classIdsSet) {
          try {
            const qClass = query(
              studentsRef,
              where('schoolId', '==', schoolId),
              where('classId', '==', cId)
            );
            const snapClass = await getDocs(qClass);
            snapClass.docs.forEach((d) => resultsMap.set(d.id, { id: d.id, ...d.data() } as StudentProfile));
          } catch (e) {
            console.warn(`Query students by classId ${cId} notice:`, e);
          }
        }

        // Query 3: Ambil siswa untuk masing-masing className yang ditugaskan (jika belum didapat lewat classId)
        for (const cName of classNamesSet) {
          try {
            const qClassName = query(
              studentsRef,
              where('schoolId', '==', schoolId),
              where('className', '==', cName)
            );
            const snapClassName = await getDocs(qClassName);
            snapClassName.docs.forEach((d) => resultsMap.set(d.id, { id: d.id, ...d.data() } as StudentProfile));
          } catch (e) {
            console.warn(`Query students by className ${cName} notice:`, e);
          }
        }

        return Array.from(resultsMap.values());
      }

      // Non-parent, non-teacher administrative users (Admin, Principal, Operator, SuperAdmin)
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
   * Fetch single student by ID from Firestore with role & ownership authorization
   */
  async getStudentById(studentId: string): Promise<StudentProfile | null> {
    if (!auth.currentUser) return null;

    try {
      const docRef = doc(db, 'students', studentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const currentUid = auth.currentUser.uid;

        // Verify authorization if user profile is known
        const userDoc = await getDoc(doc(db, 'users', currentUid));
        if (userDoc.exists()) {
          const user = userDoc.data();
          const role = String(user.role || '').toUpperCase();

          if (role === 'PARENT' || role === 'ORANG_TUA') {
            const isAuthorizedParent =
              (Array.isArray(data.parentIds) && data.parentIds.includes(currentUid)) ||
              data.parentId === currentUid;
            if (!isAuthorizedParent) return null;
          }

          if (role === 'TEACHER' || role === 'GURU') {
            const isAssignedTeacher =
              (Array.isArray(data.teacherIds) && data.teacherIds.includes(currentUid)) ||
              (user.classId && data.classId && user.classId === data.classId) ||
              (user.className &&
                data.className &&
                user.className.trim().toLowerCase() === data.className.trim().toLowerCase());
            if (!isAssignedTeacher) return null;
          }

          if (role !== 'SUPER_ADMIN' && user.schoolId && data.schoolId && user.schoolId !== data.schoolId) {
            return null;
          }
        }

        return {
          id: docSnap.id,
          ...data,
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
