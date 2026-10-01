import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, formatAuthEmail, db } from '../lib/firebase';
import { userStore } from '../services/userStore';
import { schoolStore } from '../services/schoolStore';
import { observationStore } from '../services/observationStore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  adminExists: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrapFirstAdmin: (username: string, pass: string, fullName: string) => Promise<void>;
  clearError: () => void;
  refreshUserProfile: () => Promise<void>;
  checkAdminExists: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [adminExists, setAdminExists] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const checkAdminExists = async (): Promise<boolean> => {
    const hasAdmin = await userStore.hasAdminUser();
    setAdminExists(hasAdmin);
    return hasAdmin;
  };

  const loadProfileForUser = async (uid: string, usernameFallback?: string): Promise<UserProfile | null> => {
    let profile = await userStore.getUserProfile(uid);
    if (!profile && usernameFallback) {
      profile = await userStore.getUserProfileByUsername(usernameFallback);
    }
    return profile;
  };

  useEffect(() => {
    console.log("AUTH_INIT_START");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("AUTH_STATE_CHANGED", firebaseUser ? firebaseUser.uid : "NO_USER");
      setLoading(true);

      try {
        if (firebaseUser) {
          const projectId = auth.app.options.projectId;
          console.log(`[REAL AUTH]\nuid = ${firebaseUser.uid}\nemail = ${firebaseUser.email || ''}\nprojectId = ${projectId}`);
          console.log(`[AUTH]\nFirebase Auth SUCCESS\nUID: ${firebaseUser.uid}`);
          console.log(`[PROFILE]\nReading:\nusers/${firebaseUser.uid}`);

          const profilePath = `users/${firebaseUser.uid}`;
          const profileRef = doc(db, 'users', firebaseUser.uid);
          let profileSnap;
          try {
            profileSnap = await getDoc(profileRef);
            console.log(`[REAL PROFILE READ]\npath = ${profilePath}\nexists = ${profileSnap.exists()}`);
          } catch (profileErr: any) {
            const code = profileErr?.code || 'unknown';
            const message = profileErr?.message || 'Error reading profile';
            console.error('[AUTH_PROFILE_LOOKUP_ERROR]', { uid: firebaseUser.uid, path: profilePath, code, message });

            if (code === 'permission-denied' || message.includes('permission-denied')) {
              setError('Akun berhasil login, tetapi akses profil ditolak oleh aturan keamanan. Hubungi Admin.');
            } else {
              setError('Terjadi kendala saat membaca profil pengguna. Silakan hubungi Admin.');
            }
            setUser(firebaseUser);
            setUserProfile(null);
            return;
          }

          if (profileSnap.exists()) {
            console.log('PROFILE_READ_SUCCESS');
            const data = profileSnap.data();
            console.log(`[PROFILE]\nrole: ${data?.role}\nschoolId: ${data?.schoolId}\nisActive: ${data?.isActive}`);

            const profile = { id: profileSnap.id, ...data } as UserProfile;
            const validRoles = ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'GURU', 'PRINCIPAL', 'KEPALA_SEKOLAH', 'PARENT', 'ORANG_TUA'];

            if (!profile.isActive) {
              setError('Akun Anda saat ini dinonaktifkan. Silakan hubungi Admin untuk mengaktifkan kembali.');
              setUser(firebaseUser);
              setUserProfile(null);
            } else if (!validRoles.includes(profile.role)) {
              setError('Peran pengguna belum terkonfigurasi dengan benar. Silakan hubungi Admin.');
              setUser(firebaseUser);
              setUserProfile(null);
            } else {
              console.log('AUTHENTICATED_PROFILE_VALID');
              setUserProfile(profile);
              setUser(firebaseUser);
              setError(null);
              setAdminExists(true);

              // Jika peran orang tua, pastikan relasi akun dengan data siswa terhubung sinkron
              if (profile.role === 'PARENT' || profile.role === 'ORANG_TUA') {
                firebaseUser
                  .getIdToken()
                  .then((token) => {
                    return fetch('/api/parent/sync-student-link', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                    });
                  })
                  .then(() => schoolStore.refreshFromFirestore(profile.schoolId || 'main-school', profile.role))
                  .catch((err) => console.warn('Parent auto-link sync notice:', err));
              } else {
                schoolStore.refreshFromFirestore(profile.schoolId || 'main-school', profile.role);
              }
            }
          } else {
            console.warn(`[PROFILE DOCUMENT NOT FOUND]\nUID: ${firebaseUser.uid}\nPath: ${profilePath}`);
            setError('Akun berhasil login, tetapi profil pengguna belum terdaftar di GrowUPAUD. Silakan hubungi Admin untuk mengaktifkan akun ini.');
            setUser(firebaseUser);
            setUserProfile(null);
          }
        } else {
          observationStore.stopSubscription();
          schoolStore.clearCache();
          userStore.clearLocalCache();
          setUser(null);
          setUserProfile(null);
          setAdminExists(true);
        }
        console.log("AUTH_INIT_COMPLETE");
      } catch (err: any) {
        console.error("AUTH_INIT_ERROR:", err);
        setError('Terjadi kesalahan saat memverifikasi sesi.');
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (usernameInput: string, passwordInput: string) => {
    setError(null);
    setLoading(true);

    const usernameClean = usernameInput.trim().toLowerCase();
    if (!usernameClean || !passwordInput) {
      setLoading(false);
      throw new Error('Username dan password wajib diisi.');
    }

    try {
      const projectId = auth.app.options.projectId;

      // 1. Resolve Auth email (supports direct email, username-to-email resolution, and deterministic fallback)
      let authEmail = '';
      if (usernameClean.includes('@')) {
        authEmail = usernameClean;
      } else {
        try {
          const resolveRes = await fetch('/api/auth/resolve-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameClean }),
          });
          if (resolveRes.ok) {
            const resolveData = await resolveRes.json();
            if (resolveData.success && resolveData.email) {
              authEmail = resolveData.email;
            }
          }
        } catch (resolveErr) {
          console.warn('[AUTH] Username resolution server notice:', resolveErr);
        }

        if (!authEmail) {
          authEmail = formatAuthEmail(usernameClean);
        }
      }

      // 2. Authenticate with Firebase Auth FIRST
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, authEmail, passwordInput);
      } catch (authTryErr: any) {
        // Fallback for short class passwords (< 6 chars) or prefix differences (e.g. 'bulan' vs 'kelasbulan')
        const lowerInput = passwordInput.toLowerCase().trim();
        const altPassword = lowerInput.startsWith('kelas')
          ? lowerInput.replace(/^kelas/, '')
          : `kelas${lowerInput}`;

        if (altPassword && altPassword !== passwordInput) {
          try {
            userCredential = await signInWithEmailAndPassword(auth, authEmail, altPassword);
          } catch {
            throw authTryErr;
          }
        } else {
          throw authTryErr;
        }
      }
      const firebaseUser = userCredential.user;

      console.log(`[REAL AUTH]\nuid = ${firebaseUser.uid}\nemail = ${firebaseUser.email || authEmail}\nprojectId = ${projectId}`);
      console.log(`[AUTH]\nFirebase Auth SUCCESS\nUID: ${firebaseUser.uid}`);

      // 3. Direct Firestore lookup using dynamic firebaseUser.uid
      const profilePath = `users/${firebaseUser.uid}`;
      console.log(`[PROFILE]\nReading:\nusers/${firebaseUser.uid}`);

      const profileRef = doc(db, 'users', firebaseUser.uid);
      let profileSnap;
      try {
        profileSnap = await getDoc(profileRef);
        console.log(`[REAL PROFILE READ]\npath = ${profilePath}\nexists = ${profileSnap.exists()}`);
      } catch (err: any) {
        setUser(firebaseUser);
        setUserProfile(null);
        setLoading(false);

        const code = err?.code || 'unknown';
        const message = err?.message || 'Error reading profile';
        console.error('[AUTH_PROFILE_LOOKUP_ERROR]', { uid: firebaseUser.uid, path: profilePath, code, message });

        let errMsg = 'Terjadi kendala saat membaca profil pengguna. Silakan hubungi Admin.';
        if (code === 'permission-denied' || message.includes('permission-denied')) {
          errMsg = 'Akun berhasil login, tetapi akses profil ditolak oleh aturan keamanan. Hubungi Admin.';
        }
        setError(errMsg);
        throw new Error(errMsg);
      }

      if (!profileSnap.exists()) {
        console.warn(`[PROFILE DOCUMENT NOT FOUND]\nUID: ${firebaseUser.uid}\nPath: ${profilePath}`);
        setUser(firebaseUser);
        setUserProfile(null);
        setLoading(false);

        const errMsg = 'Akun berhasil login, tetapi profil pengguna belum terdaftar di GrowUPAUD. Silakan hubungi Admin untuk mengaktifkan akun ini.';
        setError(errMsg);
        throw new Error(errMsg);
      }

      // Profile document exists
      console.log('PROFILE_READ_SUCCESS');
      const data = profileSnap.data();
      console.log(`[PROFILE]\nrole: ${data?.role}\nschoolId: ${data?.schoolId}\nisActive: ${data?.isActive}`);

      const profile = { id: profileSnap.id, ...data } as UserProfile;

      const validRoles = ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'GURU', 'PRINCIPAL', 'KEPALA_SEKOLAH', 'PARENT', 'ORANG_TUA'];
      if (!validRoles.includes(profile.role)) {
        setUser(firebaseUser);
        setUserProfile(null);
        setLoading(false);
        const errMsg = 'Peran pengguna belum terkonfigurasi dengan benar. Silakan hubungi Admin.';
        setError(errMsg);
        throw new Error(errMsg);
      }

      if (!profile.isActive) {
        setUser(firebaseUser);
        setUserProfile(null);
        setLoading(false);
        const errMsg = 'Akun Anda saat ini dinonaktifkan. Silakan hubungi Admin untuk mengaktifkan kembali.';
        setError(errMsg);
        throw new Error(errMsg);
      }

      // Profile is valid!
      console.log('AUTHENTICATED_PROFILE_VALID');
      setUser(firebaseUser);
      setUserProfile(profile);
      setError(null);

      // Jika peran orang tua, sinkronkan linking akun dengan data siswa di latar belakang
      if (profile.role === 'PARENT' || profile.role === 'ORANG_TUA') {
        try {
          const token = await firebaseUser.getIdToken();
          await fetch('/api/parent/sync-student-link', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (linkErr) {
          console.warn('Parent auto-link sync during login notice:', linkErr);
        }
      }

      // Synchronize school data for active user context using schoolId from Firestore profile
      await schoolStore.refreshFromFirestore(profile.schoolId || 'main-school', profile.role);
    } catch (err: any) {
      setLoading(false);
      let errMsg = err.message || 'Gagal melakukan login. Silakan periksa kembali kredensial Anda.';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-email'
      ) {
        errMsg = 'Email atau password salah.';
      }
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      observationStore.stopSubscription();
      schoolStore.clearCache();
      userStore.clearLocalCache();
      setUser(null);
      setUserProfile(null);
      setError(null);
      await firebaseSignOut(auth);
      setAdminExists(true);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setLoading(false);
    }
  };

  const bootstrapFirstAdmin = async (usernameInput: string, passwordInput: string, fullName: string) => {
    setLoading(true);
    setError(null);
    try {
      const adminAlreadyExists = await userStore.hasAdminUser();
      if (adminAlreadyExists) {
        setAdminExists(true);
        throw new Error('Admin pertama sudah pernah dikonfigurasi. Silakan login sebagai Admin.');
      }

      const usernameClean = usernameInput.trim().toLowerCase();
      if (!usernameClean || !passwordInput || !fullName.trim()) {
        throw new Error('Semua kolom wajib diisi.');
      }
      if (passwordInput.length < 6) {
        throw new Error('Password minimal 6 karakter.');
      }

      const school = schoolStore.getSchoolProfile();
      let uid: string;
      const authEmail = formatAuthEmail(usernameClean);

      try {
        const userCred = await createUserWithEmailAndPassword(auth, authEmail, passwordInput);
        uid = userCred.user.uid;
      } catch (err: any) {
        // If Auth account already exists in Firebase Auth, sign in to retrieve UID without duplicating auth account
        try {
          const userCred = await signInWithEmailAndPassword(auth, authEmail, passwordInput);
          uid = userCred.user.uid;
        } catch (signInErr: any) {
          throw new Error(err.message || 'Gagal membuat akun Admin pertama di Authentication.');
        }
      }

      // Ensure primary auth session is established for Firestore rules
      if (!auth.currentUser || auth.currentUser.uid !== uid) {
        await signInWithEmailAndPassword(auth, authEmail, passwordInput);
      }

      const adminProfile: UserProfile = {
        id: uid,
        username: usernameClean,
        name: fullName.trim() || 'Admin Sekolah',
        displayName: fullName.trim() || 'Admin Sekolah',
        role: 'ADMIN',
        email: `${usernameClean}@sekolah.sch.id`,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        schoolId: 'main-school',
        schoolName: school.schoolName || 'Sekolah PAUD',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await userStore.saveUserProfile(adminProfile);

      setAdminExists(true);
      // Set active session directly
      setUser(auth.currentUser);
      setUserProfile(adminProfile);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Gagal inisialisasi akun Admin pertama.');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      const p = await userStore.getUserProfile(user.uid);
      if (p) setUserProfile(p);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        adminExists,
        loading,
        isAuthenticated: !!user && !!userProfile && userProfile.isActive,
        error,
        login,
        logout,
        bootstrapFirstAdmin,
        clearError,
        refreshUserProfile,
        checkAdminExists,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
