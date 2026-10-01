import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { StudentProfile, ClassRoom } from '../types';
import { classService } from './classService';
import { userStore } from './userStore';
import { academicYearService } from './academicYearService';
import { enrollmentService } from './enrollmentService';

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
        const studentMap = new Map<string, StudentProfile>();

        // Query 1: Query berdasarkan array parentIds yang memuat UID orang tua aktif
        try {
          const parentQuery = query(studentsRef, where('parentIds', 'array-contains', currentUid));
          const parentSnap = await getDocs(parentQuery);
          parentSnap.docs.forEach((d) => {
            studentMap.set(d.id, { id: d.id, ...d.data() } as StudentProfile);
          });
        } catch (e) {
          console.warn('Parent query by parentIds array notice:', e);
        }

        // Query 2: Query fallback berdasarkan legacy field parentId == currentUid
        try {
          const legacyQuery = query(studentsRef, where('parentId', '==', currentUid));
          const legacySnap = await getDocs(legacyQuery);
          legacySnap.docs.forEach((d) => {
            studentMap.set(d.id, { id: d.id, ...d.data() } as StudentProfile);
          });
        } catch (e) {
          // ignore
        }

        // Query 3: Ambil langsung dokumen siswa jika terdaftar di profil pengguna orang tua
        const cachedUser = userStore.getCachedProfile(currentUid);
        const candidateIds = new Set<string>([
          ...(parentStudentIds || []),
          ...((cachedUser as any)?.studentIds || []),
          ...((cachedUser as any)?.linkedStudentIds || []),
          ...((cachedUser as any)?.childId ? [(cachedUser as any).childId] : []),
        ]);

        for (const candidateId of candidateIds) {
          if (candidateId && !studentMap.has(candidateId)) {
            try {
              const sDoc = await getDoc(doc(db, 'students', candidateId));
              if (sDoc.exists()) {
                const sData = sDoc.data() as StudentProfile;
                const isAuthorized =
                  (Array.isArray(sData.parentIds) && sData.parentIds.includes(currentUid)) ||
                  (sData as any).parentId === currentUid ||
                  (sData.parentEmail && auth.currentUser.email && sData.parentEmail.trim().toLowerCase() === auth.currentUser.email.trim().toLowerCase());
                if (isAuthorized) {
                  studentMap.set(sDoc.id, { id: sDoc.id, ...sData });
                }
              }
            } catch (err) {
              // Abaikan jika tidak diizinkan atau tidak ditemukan
            }
          }
        }

        // Query 4: Ambil profil anak terverifikasi dari backend jika query langsung client kosong
        if (studentMap.size === 0 && auth.currentUser) {
          try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/parent/children-profiles', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.children) && data.children.length > 0) {
                for (const c of data.children) {
                  studentMap.set(c.id, { ...c, parentIds: c.parentIds || [currentUid] } as StudentProfile);
                }
              }
            }
          } catch (e) {
            console.warn('Parent children-profiles API fetch notice:', e);
          }
        }

        // Query 5: Jika masih kosong dan belum terhubung, hubungi endpoint auto-link sinkronisasi
        if (studentMap.size === 0 && auth.currentUser) {
          try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/parent/sync-student-link', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });
            if (res.ok) {
              const syncData = await res.json();
              if (syncData.linkedStudentIds && Array.isArray(syncData.linkedStudentIds)) {
                for (const linkedId of syncData.linkedStudentIds) {
                  if (!studentMap.has(linkedId)) {
                    try {
                      const lDoc = await getDoc(doc(db, 'students', linkedId));
                      if (lDoc.exists()) {
                        studentMap.set(lDoc.id, { id: lDoc.id, ...lDoc.data() } as StudentProfile);
                      }
                    } catch (e) {
                      // ignore
                    }
                  }
                }
              }
            }
          } catch (syncErr) {
            console.warn('Auto-link parent sync notice:', syncErr);
          }
        }

        return Array.from(studentMap.values());
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

        // Kumpulkan daftar kelas yang ditugaskan ke guru ini dari collection classes
        const classIdsSet = new Set<string>();
        const classNamesSet = new Set<string>();

        // Ambil kelas yang teacherId-nya sama dengan UID Guru dari collection classes
        try {
          const myClasses = await classService.getClasses(schoolId, 'TEACHER', currentUid);
          myClasses.forEach((c) => {
            if (c.id) classIdsSet.add(c.id);
            if (c.name) classNamesSet.add(c.name);
          });
        } catch (cErr) {
          console.warn('Unable to get teacher assigned classes:', cErr);
        }

        // Sertakan juga assignedClasses jika dioper sebagai argumen
        if (assignedClasses && assignedClasses.length > 0) {
          assignedClasses.forEach((c) => {
            if (c.id) classIdsSet.add(c.id);
            if (c.name) classNamesSet.add(c.name);
          });
        }

        // Query 2: Ambil siswa berdasarkan classId dari kelas yang ditugaskan
        for (const cId of classIdsSet) {
          if (!cId) continue;
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

        // Query 3: Ambil siswa berdasarkan className dari kelas yang ditugaskan
        for (const cName of classNamesSet) {
          if (!cName) continue;
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

      // Hubungkan siswa baru ke Tahun Ajaran aktif (Siklus Baru PAUD)
      try {
        const activeYear = await academicYearService.getActiveAcademicYear(schoolId);
        if (activeYear) {
          const newEnrollment = await enrollmentService.createEnrollment({
            schoolId,
            studentId: newId,
            studentName: student.name,
            academicYearId: activeYear.id,
            academicYearName: activeYear.name,
            classId: student.classId || '',
            className: student.className || '',
            teacherIds: student.teacherIds || [],
            parentIds: student.parentIds || [],
            entryType: 'NEW',
            status: 'ACTIVE',
            startDate: activeYear.startDate || new Date().toISOString().split('T')[0],
          });

          await updateDoc(docRef, {
            currentEnrollmentId: newEnrollment.id,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString(),
          });
          newStudent.currentEnrollmentId = newEnrollment.id;
          newStudent.status = 'ACTIVE';
        }
      } catch (enrErr) {
        console.warn('Auto-enrollment new student notice:', enrErr);
      }

      return newStudent;
    } catch (error: any) {
      console.error('Firestore addStudent error:', error);
      throw new Error(error.message || 'Gagal menambahkan siswa ke Firestore.');
    }
  },

  /**
   * Mengambil data siswa yang diarsipkan (Tamat, Pindah, atau Inactive)
   */
  async getArchivedStudents(schoolId: string = SCHOOL_DOC_ID): Promise<StudentProfile[]> {
    if (!auth.currentUser) return [];

    try {
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('schoolId', '==', schoolId));
      const snap = await getDocs(q);

      const all = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as StudentProfile[];

      // Filter siswa dengan status arsip: GRADUATED, TRANSFERRED, atau INACTIVE
      return all.filter(
        (s) =>
          s.status === 'GRADUATED' ||
          s.status === 'TRANSFERRED' ||
          s.status === 'INACTIVE' ||
          (s as any).status === 'LULUS' ||
          (s as any).status === 'PINDAH' ||
          (s as any).status === 'NONAKTIF' ||
          (s as any).isActive === false
      );
    } catch (err) {
      console.warn('Gagal mengambil siswa arsip:', err);
      return [];
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
