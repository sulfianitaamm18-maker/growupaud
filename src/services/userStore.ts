import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

const USERS_LOCAL_STORAGE_KEY = 'growupaud_users_profile_v1';

/**
 * Identifies unwanted demo/placeholder accounts requested for removal/deactivation:
 * 1. Akun "Kepala Sekolah" (unwanted demo account)
 * 2. Akun "Bunda Alif" (unwanted demo account)
 */
export function isUnwantedTargetUser(user: {
  id?: string;
  username?: string;
  name?: string;
  displayName?: string;
}): boolean {
  if (!user) return false;
  const name = (user.name || user.displayName || '').trim().toLowerCase();
  const username = (user.username || '').trim().toLowerCase();
  const id = (user.id || '').trim().toLowerCase();

  // Target 1: Akun Kepala Sekolah (bukan akun yang dibuat sendiri oleh user)
  const isKepalaSekolah =
    id === 'u-kepsek-01' ||
    name === 'kepala sekolah' ||
    username === 'kepala.sekolah' ||
    username === 'kepalasekolah' ||
    username === 'kepsek' ||
    username === 'marlina';

  // Target 2: Akun Bunda Alif
  const isBundaAlif =
    name === 'bunda alif' ||
    name.includes('bunda alif') ||
    name === 'ibu alif' ||
    username === 'bunda.alif' ||
    username === 'bunda_alif' ||
    username === 'bundaalif' ||
    username === 'alif';

  return isKepalaSekolah || isBundaAlif;
}

// Helper to remove any undefined fields before sending to Firestore
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

class UserStoreService {
  private listeners: Array<() => void> = [];

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // Get all cached local profiles
  private getLocalProfiles(): Record<string, UserProfile> {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(USERS_LOCAL_STORAGE_KEY);
        return data ? JSON.parse(data) : {};
      }
      return {};
    } catch (e) {
      console.error('Error reading local user profiles:', e);
      return {};
    }
  }

  // Save profiles to local cache
  private setLocalProfiles(profiles: Record<string, UserProfile>, notify: boolean = false) {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(USERS_LOCAL_STORAGE_KEY, JSON.stringify(profiles));
      }
      if (notify) {
        this.notify();
      }
    } catch (e) {
      console.error('Error saving local user profiles:', e);
    }
  }

  // Get a single cached profile by user id if already in memory
  public getCachedProfile(userId: string): UserProfile | null {
    if (!userId) return null;
    const local = this.getLocalProfiles();
    return local[userId] || null;
  }

  // Clear local profile cache from localStorage upon logout
  public clearLocalCache(): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(USERS_LOCAL_STORAGE_KEY);
      }
      this.notify();
    } catch (e) {
      console.error('Error clearing local user profile cache:', e);
    }
  }

  // Helper to map Firestore user data defensively
  private mapDocumentToUserProfile(docId: string, data: any): UserProfile {
    const rawRole = (data?.role || '').toUpperCase();
    const role: UserRole =
      rawRole === 'SUPER_ADMIN' || rawRole === 'ADMIN'
        ? 'ADMIN'
        : rawRole === 'PRINCIPAL' || rawRole === 'KEPALA_SEKOLAH'
        ? 'PRINCIPAL'
        : rawRole === 'PARENT' || rawRole === 'ORANG_TUA'
        ? 'PARENT'
        : 'TEACHER';

    const rawName = data?.name || data?.displayName || data?.username || 'Pengguna PAUD';

    return {
      id: docId,
      username: data?.username || docId,
      name: rawName,
      displayName: data?.displayName || rawName,
      email: data?.email || '',
      role: role,
      schoolId: data?.schoolId || 'main-school',
      schoolName: data?.schoolName || 'PAUD Melati Terpadu',
      avatar: data?.avatar || '',
      phone: data?.phone || '',
      isActive: data?.isActive !== false,
      classId: data?.classId,
      className: data?.className,
      childId: data?.childId,
      studentIds: Array.isArray(data?.studentIds) ? data.studentIds : [],
      linkedStudentIds: Array.isArray(data?.linkedStudentIds) ? data.linkedStudentIds : [],
      createdAt: data?.createdAt || new Date().toISOString(),
      updatedAt: data?.updatedAt || new Date().toISOString(),
    };
  }

  // Fetch single user profile by ID (uid) from Firestore (authoritative source)
  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    console.log('[AUTH]\nFirebase Auth UID =', userId);
    console.log('[PROFILE]\nReading Firestore path = users/' + userId);

    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      console.log('[PROFILE]\nSnapshot exists =', docSnap.exists());

      if (docSnap.exists()) {
        const profile = this.mapDocumentToUserProfile(docSnap.id, docSnap.data());
        if (isUnwantedTargetUser(profile)) {
          console.log('[PROFILE] Target user is marked unwanted, returning null:', profile.id);
          return null;
        }
        const local = this.getLocalProfiles();
        local[userId] = profile;
        this.setLocalProfiles(local, false);
        return profile;
      } else {
        console.warn('[PROFILE]\nSnapshot exists = false (PROFILE_DOCUMENT_NOT_FOUND)');
        return null;
      }
    } catch (e: any) {
      console.error('[PROFILE]\nFirestore error code =', e?.code);
      console.error('[PROFILE]\nFirestore error message =', e?.message);

      if (e?.code === 'permission-denied') {
        throw new Error('PROFILE_READ_PERMISSION_DENIED');
      }
      if (e?.code === 'unavailable' || e?.message?.includes('offline') || e?.code === 'resource-exhausted') {
        throw new Error('PROFILE_NETWORK_ERROR');
      }
      throw new Error(`PROFILE_UNKNOWN_ERROR: ${e?.code || e?.message || 'unknown'}`);
    }
  }

  // Fetch profile by username from Firestore
  public async getUserProfileByUsername(
    username: string,
    schoolId: string = 'main-school'
  ): Promise<UserProfile | null> {
    if (!auth.currentUser) return null;

    const cleanUsername = username.trim().toLowerCase();
    if (isUnwantedTargetUser({ username: cleanUsername })) {
      return null;
    }

    try {
      const usersCol = collection(db, 'users');
      const q = query(
        usersCol,
        where('schoolId', '==', schoolId),
        where('username', '==', cleanUsername)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const firstDoc = querySnap.docs[0];
        const profile = this.mapDocumentToUserProfile(firstDoc.id, firstDoc.data());
        if (isUnwantedTargetUser(profile)) {
          return null;
        }
        const local = this.getLocalProfiles();
        local[profile.id] = profile;
        this.setLocalProfiles(local, false);
        return profile;
      }
      return null;
    } catch (e) {
      console.warn('Firestore query error for username lookup:', e);
    }

    return null;
  }

  // Get list of all users for Admin Management
  public async getAllUserProfiles(schoolId: string = 'main-school'): Promise<UserProfile[]> {
    console.log('[USERS GETDOCS START] schoolId =', schoolId);

    if (!auth.currentUser) {
      console.warn('[USERS GETDOCS ERROR] User not authenticated in Firebase Auth');
      const local = Object.values(this.getLocalProfiles()).filter(
        (u) => (!u.schoolId || u.schoolId === schoolId) && !isUnwantedTargetUser(u)
      );
      return local;
    }

    try {
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where('schoolId', '==', schoolId));
      const querySnap = await getDocs(q);
      const fetched: UserProfile[] = [];
      const localMap: Record<string, UserProfile> = {};

      for (const docSnap of querySnap.docs) {
        const profile = this.mapDocumentToUserProfile(docSnap.id, docSnap.data());
        if (isUnwantedTargetUser(profile)) {
          console.log('[USER STORE] Unwanted target user detected during fetch:', profile.id, profile.name);
          // Asynchronously attempt to clean up document from Firestore
          try {
            const unwantedRef = doc(db, 'users', profile.id);
            deleteDoc(unwantedRef).catch(() => {
              // If delete not permitted, mark inactive
              updateDoc(unwantedRef, { isActive: false }).catch(() => {});
            });
          } catch {
            // Ignore cleanup errors
          }
          continue; // Do NOT include in fetched list
        }

        fetched.push(profile);
        localMap[profile.id] = profile;
      }

      console.log('[USERS GETDOCS SUCCESS] Fetched count =', fetched.length);
      this.setLocalProfiles(localMap, false); // READ cache: do not notify to prevent infinite re-trigger loops
      return fetched;
    } catch (e: any) {
      console.error('[USERS GETDOCS ERROR]', e);
      const local = Object.values(this.getLocalProfiles()).filter(
        (u) => (!u.schoolId || u.schoolId === schoolId) && !isUnwantedTargetUser(u)
      );
      if (local.length > 0) {
        console.log('[USERS GETDOCS CACHE FALLBACK] Returning cached count =', local.length);
        return local;
      }
      throw e;
    }
  }

  // Create or save user profile
  public async saveUserProfile(profile: UserProfile): Promise<void> {
    if (isUnwantedTargetUser(profile)) {
      console.log('[USER STORE] Blocked saving unwanted profile:', profile.id, profile.name);
      return;
    }

    const clean = sanitizeForFirestore(profile);
    const local = this.getLocalProfiles();
    local[profile.id] = { ...profile, ...clean } as UserProfile;
    this.setLocalProfiles(local, true); // MUTATION: notify listeners

    try {
      const docRef = doc(db, 'users', profile.id);
      await setDoc(docRef, clean, { merge: true });
      console.log('SAVED PROFILE TO FIRESTORE:', `users/${profile.id}`);
    } catch (e: any) {
      console.error('Failed saving profile to Firestore via client SDK:', e);
      // Attempt backend Admin sync endpoint fallback if Admin token is available
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          const res = await fetch('/api/admin/sync-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(clean),
          });
          const resData = await res.json();
          if (resData.success) {
            console.log('[USER STORE] Synced profile via Admin backend API fallback:', profile.id);
            return;
          }
        }
      } catch (backendErr) {
        console.warn('[USER STORE] Backend sync fallback warning:', backendErr);
      }
      throw e;
    }
  }

  // Update existing user profile
  public async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    const local = this.getLocalProfiles();
    if (local[userId]) {
      local[userId] = {
        ...local[userId],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.setLocalProfiles(local, true); // MUTATION: notify listeners
    }

    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Could not update profile in Firestore:', e);
    }
  }

  // Delete user profile completely
  public async deleteUserProfile(userId: string): Promise<void> {
    const local = this.getLocalProfiles();
    if (local[userId]) {
      delete local[userId];
      this.setLocalProfiles(local, true);
    }

    try {
      const docRef = doc(db, 'users', userId);
      await deleteDoc(docRef);
      console.log('DELETED PROFILE FROM FIRESTORE:', `users/${userId}`);
    } catch (e) {
      console.warn('Could not delete profile in Firestore, setting inactive as fallback:', e);
      try {
        const docRef = doc(db, 'users', userId);
        await updateDoc(docRef, { isActive: false });
      } catch (fallbackErr) {
        console.error('Failed to set inactive fallback in Firestore:', fallbackErr);
      }
    }
  }

  // Activate / Deactivate user
  public async setUserActiveStatus(userId: string, isActive: boolean): Promise<void> {
    await this.updateUserProfile(userId, { isActive });
  }

  // Check if any users exist in store
  public async hasAnyUsers(): Promise<boolean> {
    const all = await this.getAllUserProfiles();
    return all.length > 0;
  }

  // Check if at least one active Admin user profile exists in Firestore dynamically
  public async hasAdminUser(): Promise<boolean> {
    // 1. Try server endpoint which checks Firestore dynamically via Admin SDK
    try {
      const res = await fetch('/api/system/has-admin');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.hasAdmin === 'boolean') {
          return data.hasAdmin;
        }
      }
    } catch (e) {
      console.warn('[USER STORE] /api/system/has-admin check failed, falling back to direct Firestore query:', e);
    }

    // 2. Direct Firestore query: users where role == 'ADMIN' limit 1
    try {
      const qAdmin = query(
        collection(db, 'users'),
        where('role', '==', 'ADMIN'),
        limit(1)
      );
      const snapAdmin = await getDocs(qAdmin);
      if (!snapAdmin.empty) {
        return true;
      }

      // Check SUPER_ADMIN as well
      const qSuper = query(
        collection(db, 'users'),
        where('role', '==', 'SUPER_ADMIN'),
        limit(1)
      );
      const snapSuper = await getDocs(qSuper);
      return !snapSuper.empty;
    } catch (e) {
      console.warn('[USER STORE] hasAdminUser query fallback:', e);
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
        const cached = this.getCachedProfile(currentUid);
        if (cached && (cached.role === 'ADMIN' || cached.role === 'SUPER_ADMIN')) {
          return true;
        }
      }
      return true;
    }
  }

  // Get status of all Auth users and their Firestore profiles (Requirement 10)
  public async getAuthUsersStatus(): Promise<Array<{
    uid: string;
    email: string;
    displayName: string;
    authExists: boolean;
    profileExists: boolean;
    profile: UserProfile | null;
  }>> {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Sesi admin tidak ditemukan.');
      }
      const res = await fetch('/api/admin/auth-users', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Gagal memuat status akun dari server.');
      }
      return data.users || [];
    } catch (e: any) {
      console.error('[USER STORE] getAuthUsersStatus error:', e);
      throw e;
    }
  }

  // Admin atomic user creation via backend API
  public async adminCreateUser(payload: {
    username: string;
    password: string;
    name: string;
    role: UserRole;
    schoolId: string;
    schoolName: string;
    className?: string;
    selectedStudentIds?: string[];
    isActive: boolean;
  }): Promise<{ uid: string; profile: UserProfile }> {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error('Sesi Admin tidak ditemukan.');
    }

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal membuat pengguna di sistem.');
    }

    // Update local cache
    const profile = data.profile as UserProfile;
    const local = this.getLocalProfiles();
    local[profile.id] = profile;
    this.setLocalProfiles(local, true);

    return { uid: data.uid, profile };
  }

  // Admin sync / repair missing Firestore profile for an existing Auth account
  public async adminSyncProfile(payload: {
    uid: string;
    username: string;
    name: string;
    role: UserRole;
    schoolId: string;
    schoolName: string;
    className?: string;
    selectedStudentIds?: string[];
    isActive: boolean;
  }): Promise<UserProfile> {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error('Sesi Admin tidak ditemukan.');
    }

    const res = await fetch('/api/admin/sync-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal menyinkronkan profil pengguna.');
    }

    const profile = data.profile as UserProfile;
    const local = this.getLocalProfiles();
    local[profile.id] = profile;
    this.setLocalProfiles(local, true);

    return profile;
  }
}

export const userStore = new UserStoreService();
