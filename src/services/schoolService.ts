import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { SchoolProfile } from '../types';
import { DEFAULT_SCHOOL_PROFILE } from './schoolStore';

const SCHOOL_DOC_ID = 'main-school';

export const schoolService = {
  /**
   * Fetch school profile from Firestore document `schools/{schoolId}`
   */
  async getSchoolProfile(schoolId: string = SCHOOL_DOC_ID): Promise<SchoolProfile> {
    if (!auth.currentUser) {
      return { ...DEFAULT_SCHOOL_PROFILE, id: schoolId };
    }

    try {
      const docRef = doc(db, 'schools', schoolId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as SchoolProfile;
      }
    } catch (error) {
      console.warn('Firestore getSchoolProfile error:', error);
      throw new Error('Gagal mengambil data profil sekolah dari Firestore.');
    }
    return { ...DEFAULT_SCHOOL_PROFILE, id: schoolId };
  },

  /**
   * Save or update school profile in Firestore document `schools/{schoolId}`
   */
  async saveSchoolProfile(profile: Partial<SchoolProfile>, schoolId: string = SCHOOL_DOC_ID): Promise<SchoolProfile> {
    if (!auth.currentUser) {
      throw new Error('Pengguna tidak terotentikasi.');
    }

    const fullProfile: SchoolProfile = {
      ...DEFAULT_SCHOOL_PROFILE,
      ...profile,
      id: schoolId,
    };

    try {
      const docRef = doc(db, 'schools', schoolId);
      await setDoc(docRef, {
        ...fullProfile,
        schoolId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return fullProfile;
    } catch (error: any) {
      console.error('Firestore saveSchoolProfile error:', error);
      throw new Error(error.message || 'Gagal menyimpan profil sekolah ke Firestore.');
    }
  }
};
