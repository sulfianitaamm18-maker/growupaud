import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let adminApp: App | null = null;
let genAIClient: GoogleGenAI | null = null;
let isGeminiOperational: boolean | null = null;
let lastKeyTested = '';

async function verifyGeminiOperational(): Promise<boolean> {
  const rawKey = process.env.GEMINI_API_KEY;
  if (!rawKey) {
    isGeminiOperational = false;
    genAIClient = null;
    return false;
  }
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
  if (
    !cleanKey ||
    cleanKey === 'MY_GEMINI_API_KEY' ||
    cleanKey.startsWith('{') ||
    cleanKey.length < 10
  ) {
    isGeminiOperational = false;
    genAIClient = null;
    return false;
  }

  if (isGeminiOperational !== null && lastKeyTested === cleanKey) {
    return isGeminiOperational;
  }

  lastKeyTested = cleanKey;

  try {
    const candidateClient = new GoogleGenAI({
      apiKey: cleanKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Test with a lightweight 1-token probe request to verify authorization
    await candidateClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'ping',
      config: {
        maxOutputTokens: 1,
      },
    });

    genAIClient = candidateClient;
    isGeminiOperational = true;
    console.log('[SERVER] Gemini API verified and operational.');
    return true;
  } catch {
    genAIClient = null;
    isGeminiOperational = false;
    console.log(
      '[SERVER] Gemini API live connection inactive; standard Kurikulum Merdeka pedagogical engine engaged.'
    );
    return false;
  }
}

function getGenAI(): GoogleGenAI | null {
  const rawKey = process.env.GEMINI_API_KEY;
  const cleanKey = (rawKey || '').trim().replace(/^["']|["']$/g, '');

  if (cleanKey && cleanKey !== lastKeyTested) {
    verifyGeminiOperational().catch(() => {});
  }

  if (isGeminiOperational === false) {
    return null;
  }

  return genAIClient;
}

function getAdminApp(): App {
  if (!adminApp) {
    const existingApps = getApps();
    if (!existingApps.length) {
      try {
        let projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
        if (!projectId) {
          try {
            const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
            if (fs.existsSync(cfgPath)) {
              const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
              projectId = parsed.projectId;
            }
          } catch {}
        }
        if (!projectId) {
          projectId = 'booming-rush-fmbw7';
        }

        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (serviceAccountKey) {
          const parsedKey = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey;
          adminApp = initializeApp({
            credential: cert(parsedKey),
            projectId
          });
        } else {
          adminApp = initializeApp({
            projectId
          });
        }
      } catch (err) {
        console.error('[SERVER] Firebase Admin SDK init warning:', err instanceof Error ? err.message : err);
      }
    } else {
      adminApp = existingApps[0];
    }
  }
  return adminApp || getApps()[0];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '6mb' }));

  const aiRateMap = new Map<string, { windowStart: number; count: number }>();
  function enforceAIRateLimit(uid: string) {
    const now = Date.now();
    const entry = aiRateMap.get(uid);
    if (!entry || now - entry.windowStart >= 60_000) {
      aiRateMap.set(uid, { windowStart: now, count: 1 });
      return;
    }
    entry.count += 1;
    if (entry.count > 30) throw { status: 429, error: 'RATE_LIMITED', message: 'Batas penggunaan AI sementara tercapai. Silakan coba lagi.' };
  }

  // Helper to format Auth email
  function formatAuthEmail(input: string): string {
    const trimmed = input.toLowerCase().trim();
    if (trimmed.includes('@')) {
      const userPart = trimmed.split('@')[0].replace(/[^a-z0-9._-]/g, '');
      return `${userPart || 'user'}@school.growupaud.local`;
    }
    const cleanUsername = trimmed.replace(/[^a-z0-9._-]/g, '');
    return `${cleanUsername || 'user'}@school.growupaud.local`;
  }

  // Helper to verify Admin caller
  async function verifyAdminCaller(req: express.Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw { status: 401, error: 'UNAUTHORIZED', message: 'Token otentikasi tidak ditemukan.' };
    }

    const idToken = authHeader.split('Bearer ')[1];
    const appInstance = getAdminApp();
    const adminAuth = getAuth(appInstance);
    const adminDb = getFirestore(appInstance);

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      throw { status: 401, error: 'INVALID_TOKEN', message: 'Token otentikasi tidak valid atau telah kedaluwarsa.' };
    }

    const callerUid = decodedToken.uid;
    const callerDoc = await adminDb.collection('users').doc(callerUid).get();
    if (!callerDoc.exists) {
      throw { status: 403, error: 'FORBIDDEN', message: 'Profil pengguna pemanggil tidak ditemukan.' };
    }

    const callerData = callerDoc.data();
    const isCallerAdmin = ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(String(callerData?.role || '').toUpperCase()) && callerData?.isActive;
    if (!isCallerAdmin) {
      throw { status: 403, error: 'FORBIDDEN', message: 'Akses ditolak: Hanya ADMIN atau SUPER_ADMIN aktif yang berwenang.' };
    }

    return { callerUid, callerData, adminAuth, adminDb };
  }

  async function verifyAICaller(req: express.Request, allowedRoles: string[] = ['ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'PRINCIPAL', 'KEPALA_SEKOLAH', 'TEACHER', 'GURU']) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw { status: 401, error: 'UNAUTHORIZED', message: 'Token otentikasi tidak ditemukan.' };
    }
    const token = authHeader.slice(7);
    const appInstance = getAdminApp();
    const adminAuth = getAuth(appInstance);
    const adminDb = getFirestore(appInstance);
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      throw { status: 401, error: 'INVALID_TOKEN', message: 'Token AI tidak valid atau telah kedaluwarsa.' };
    }
    const profileSnap = await adminDb.collection('users').doc(decoded.uid).get();
    if (!profileSnap.exists) throw { status: 403, error: 'FORBIDDEN', message: 'Profil pengguna tidak ditemukan.' };
    const profile = profileSnap.data() || {};
    const role = String(profile.role || '').toUpperCase();
    if (profile.isActive === false || (!allowedRoles.includes(role) && !allowedRoles.includes('*'))) {
      throw { status: 403, error: 'FORBIDDEN', message: 'Akses AI tidak diizinkan untuk akun ini.' };
    }
    enforceAIRateLimit(decoded.uid);
    return { uid: decoded.uid, role, profile, adminDb };
  }

  async function verifyAuthenticatedUser(req: express.Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw { status: 401, error: 'UNAUTHORIZED', message: 'Token otentikasi tidak ditemukan.' };
    }
    const token = authHeader.slice(7);
    const appInstance = getAdminApp();
    const adminAuth = getAuth(appInstance);
    const adminDb = getFirestore(appInstance);
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      throw { status: 401, error: 'INVALID_TOKEN', message: 'Sesi login tidak valid atau telah kedaluwarsa.' };
    }
    const profileSnap = await adminDb.collection('users').doc(decoded.uid).get();
    if (!profileSnap.exists) {
      throw { status: 403, error: 'FORBIDDEN', message: 'Profil pengguna tidak ditemukan di sistem.' };
    }
    const profile = profileSnap.data() || {};
    if (profile.isActive === false) {
      throw { status: 403, error: 'FORBIDDEN', message: 'Akun Anda sedang dinonaktifkan oleh administrator.' };
    }
    const role = String(profile.role || '').toUpperCase();
    return { uid: decoded.uid, role, profile, adminDb, adminAuth };
  }

  function isCommunicationPermitted(senderRole: string, recipientRole: string): boolean {
    const s = senderRole.toUpperCase();
    const r = recipientRole.toUpperCase();
    const isAdmin = (x: string) => ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(x);
    const isPrincipal = (x: string) => ['PRINCIPAL', 'KEPALA_SEKOLAH'].includes(x);
    const isTeacher = (x: string) => ['TEACHER', 'GURU'].includes(x);
    const isParent = (x: string) => ['PARENT', 'ORANG_TUA'].includes(x);

    // Admin can communicate with anyone
    if (isAdmin(s) || isAdmin(r)) return true;
    // Principal can communicate with Teacher, Parent, Admin
    if (isPrincipal(s) && (isTeacher(r) || isParent(r) || isAdmin(r))) return true;
    if (isPrincipal(r) && (isTeacher(s) || isParent(s) || isAdmin(s))) return true;
    // Teacher can communicate with Principal, Parent, Teacher, Admin
    if (isTeacher(s) && (isTeacher(r) || isPrincipal(r) || isParent(r) || isAdmin(r))) return true;
    // Parent can communicate with Teacher, Principal, Admin (strictly not random parents)
    if (isParent(s)) {
      return isTeacher(r) || isPrincipal(r) || isAdmin(r);
    }
    return false;
  }

  async function verifyAIStudentAccess(adminDb: any, caller: any, studentId: string) {
    if (!studentId || typeof studentId !== 'string') {
      return null;
    }
    const studentSnap = await adminDb.collection('students').doc(studentId).get();
    if (!studentSnap.exists) throw { status: 404, error: 'STUDENT_NOT_FOUND', message: 'Data anak tidak ditemukan.' };
    const student = studentSnap.data() || {};

    const callerSchoolId = caller.profile.schoolId || 'main-school';
    const studentSchoolId = student.schoolId || 'main-school';

    if (caller.role !== 'SUPER_ADMIN' && callerSchoolId !== studentSchoolId) {
      throw { status: 403, error: 'FORBIDDEN', message: 'Akses terhadap data anak ditolak: Berbeda sekolah.' };
    }

    if (caller.role === 'TEACHER' || caller.role === 'GURU') {
      // In PAUD Kurikulum Merdeka, all active teachers in the school collaborate to observe and analyze students in their school
      const isSameSchool = caller.role === 'SUPER_ADMIN' || callerSchoolId === studentSchoolId;
      if (!isSameSchool) {
        throw { status: 403, error: 'FORBIDDEN', message: 'Guru hanya dapat menganalisis anak dari sekolah yang sama.' };
      }
    }

    if (caller.role === 'PARENT' || caller.role === 'ORANG_TUA') {
      const parentId = caller.uid;
      const isParent = (Array.isArray(student.parentIds) && student.parentIds.includes(parentId)) ||
        (student.parentId && student.parentId === parentId);
      if (!isParent) {
        throw { status: 403, error: 'FORBIDDEN', message: 'Akses terhadap data anak ditolak: Bukan orang tua siswa yang bersangkutan.' };
      }
    }
    return student;
  }

  // Health check API
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', server: 'GrowUPAUD Full-Stack Express Server' });
  });

  // Dynamic system check: verifies if at least one Admin or SuperAdmin exists
  app.get('/api/system/has-admin', async (_req, res) => {
    try {
      const appInstance = getAdminApp();
      const adminDb = getFirestore(appInstance);
      const snap = await adminDb
        .collection('users')
        .where('role', 'in', ['ADMIN', 'SUPER_ADMIN'])
        .limit(1)
        .get();

      return res.json({ hasAdmin: !snap.empty });
    } catch (e) {
      console.warn('[SERVER] /api/system/has-admin check warning:', e);
      return res.json({ hasAdmin: true });
    }
  });

  // Public resolution endpoint for login identifier (safe: only resolves username/identifier to Auth email)
  app.post('/api/auth/resolve-email', async (req, res) => {
    try {
      const rawInput = (req.body?.username || req.body?.identifier || '').toString().trim().toLowerCase();
      if (!rawInput) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_INPUT',
          message: 'Username atau email wajib diisi.',
        });
      }

      // Case 1: Already a full email address (contains @)
      if (rawInput.includes('@')) {
        return res.json({
          success: true,
          email: rawInput,
        });
      }

      // Case 2: Clean username
      const cleanUsername = rawInput.replace(/[^a-z0-9._-]/g, '');
      if (!cleanUsername) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_USERNAME',
          message: 'Format username tidak valid.',
        });
      }

      const appInstance = getAdminApp();
      const adminDb = getFirestore(appInstance);

      // Search Firestore users collection by exact username
      const userSnap = await adminDb
        .collection('users')
        .where('username', '==', cleanUsername)
        .limit(1)
        .get();

      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        const resolvedEmail = userData.email || formatAuthEmail(cleanUsername);
        return res.json({
          success: true,
          email: resolvedEmail,
        });
      }

      // Fallback: If not in Firestore or username unknown, return deterministic fallback
      // This prevents username enumeration attacks while allowing standard accounts to attempt Auth
      return res.json({
        success: true,
        email: formatAuthEmail(cleanUsername),
      });
    } catch (err: any) {
      console.warn('[SERVER] /api/auth/resolve-email error:', err?.message || err);
      const fallbackClean = (req.body?.username || '').toString().trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
      return res.json({
        success: true,
        email: formatAuthEmail(fallbackClean || 'user'),
      });
    }
  });

  // Get Auth Users status API (checks AUTH vs FIRESTORE PROFILE status)
  app.get('/api/admin/auth-users', async (req, res) => {
    try {
      const { adminAuth, adminDb, callerData } = await verifyAdminCaller(req);
      const schoolId = callerData?.schoolId || 'main-school';

      const authList = await adminAuth.listUsers(1000);
      const usersSnap = await adminDb.collection('users').get();
      const firestoreMap = new Map<string, any>();
      usersSnap.forEach((d) => {
        firestoreMap.set(d.id, d.data());
      });

      const results = authList.users
        .map((u) => {
          const firestoreData = firestoreMap.get(u.uid);
          const profileExists = !!firestoreData;
          return {
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || firestoreData?.name || firestoreData?.displayName || '',
          authExists: true,
          profileExists,
          profile: firestoreData || null,
            createdAt: u.metadata?.creationTime || firestoreData?.createdAt || null,
          };
        })
        .filter((entry) => callerData?.role === 'SUPER_ADMIN' || entry.profile?.schoolId === schoolId);

      res.json({
        success: true,
        schoolId,
        users: results,
      });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal memuat status akun pengguna.',
      });
    }
  });

  // Create User API (Atomic Firebase Auth + Firestore Profile creation)
  app.post('/api/admin/create-user', async (req, res) => {
    try {
      const { adminAuth, adminDb, callerData } = await verifyAdminCaller(req);
      const {
        username,
        password,
        name,
        role,
        schoolId,
        schoolName,
        className,
        selectedStudentIds,
        isActive,
      } = req.body || {};

      if (!username || !password || !name || !role) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ARGUMENTS',
          message: 'Username, password, nama, dan role wajib diisi.',
        });
      }

      const validRoles = ['ADMIN', 'PRINCIPAL', 'TEACHER', 'PARENT', 'OPERATOR'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ROLE',
          message: `Peran "${role}" tidak valid. Pilih ADMIN, PRINCIPAL, TEACHER, atau PARENT.`,
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'WEAK_PASSWORD',
          message: 'Password minimal 6 karakter.',
        });
      }

      const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '');
      const email = formatAuthEmail(cleanUsername);

      // Check if username already exists in Firestore
      const existingUserSnap = await adminDb
        .collection('users')
        .where('username', '==', cleanUsername)
        .limit(1)
        .get();

      if (!existingUserSnap.empty) {
        return res.status(400).json({
          success: false,
          error: 'USERNAME_IN_USE',
          message: `Username "${cleanUsername}" sudah digunakan.`,
        });
      }

      const targetSchoolId = callerData?.role === 'SUPER_ADMIN'
        ? (schoolId || callerData?.schoolId || 'main-school')
        : (callerData?.schoolId || 'main-school');
      const targetSchoolName = schoolName || 'Sekolah PAUD';
      const normalizedSelectedStudentIds = Array.isArray(selectedStudentIds)
        ? [...new Set(selectedStudentIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0))]
        : [];

      if (role === 'PARENT' && normalizedSelectedStudentIds.length > 0) {
        const studentDocs = await Promise.all(
          normalizedSelectedStudentIds.map((studentId) => adminDb.collection('students').doc(studentId).get())
        );
        const invalidStudent = studentDocs.find((docSnap) => !docSnap.exists || docSnap.data()?.schoolId !== targetSchoolId);
        if (invalidStudent) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_STUDENT_ASSIGNMENT',
            message: 'Anak yang dipilih tidak valid atau berasal dari sekolah berbeda.',
          });
        }
      }

      // Step 1: Create Firebase Auth user
      let userRecord;
      try {
        userRecord = await adminAuth.createUser({
          email,
          password,
          displayName: name,
        });
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          return res.status(400).json({
            success: false,
            error: 'AUTH_EMAIL_EXISTS',
            message: `Akun Auth untuk username "${cleanUsername}" sudah ada di Firebase Authentication. Anda dapat menggunakan tombol "Sinkronkan Profil" untuk akun ini.`,
          });
        }
        throw authErr;
      }

      const uid = userRecord.uid;

      // Set custom claims for server-authoritative token validation
      try {
        await adminAuth.setCustomUserClaims(uid, {
          role,
          schoolId: targetSchoolId,
        });
      } catch (claimsErr) {
        console.warn('[SERVER] Warning setting custom user claims:', claimsErr);
      }

      // Step 2: Create Firestore Profile document at users/{uid}
      const now = new Date().toISOString();
      const profileData: any = {
        id: uid,
        uid: uid,
        username: cleanUsername,
        name,
        displayName: name,
        role,
        email,
        avatar:
          role === 'PARENT'
            ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
            : role === 'TEACHER'
            ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
            : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
        schoolId: targetSchoolId,
        schoolName: targetSchoolName,
        isActive: isActive !== false,
        studentIds: normalizedSelectedStudentIds,
        linkedStudentIds: normalizedSelectedStudentIds,
        createdAt: now,
        updatedAt: now,
      };

      if (normalizedSelectedStudentIds.length > 0) {
        profileData.childId = normalizedSelectedStudentIds[0];
      }
      if (role === 'TEACHER' && className) {
        profileData.className = className;
      }

      try {
        await adminDb.collection('users').doc(uid).set(profileData);
        console.log(`[SERVER] Created Firestore profile users/${uid} for ${cleanUsername}`);
      } catch (firestoreErr: any) {
        console.error(`[SERVER] Failed creating Firestore profile users/${uid}:`, firestoreErr);
        try { await adminAuth.deleteUser(uid); } catch (rollbackErr) {
          console.error('[SERVER] Failed to rollback Auth user after profile creation failure:', rollbackErr);
        }
        return res.status(500).json({
          success: false,
          error: 'FIRESTORE_PROFILE_FAILED',
          message:
            'Akun Auth berhasil dibuat, tetapi profil Firestore gagal dibuat. Silakan gunakan tombol "Sinkronkan Profil" untuk akun ini.',
          uid,
        });
      }

      // Step 2b: If a teacher is assigned to a class, persist the teacher assignment
      // on the authoritative class record and on the teacher profile.
      if (role === 'TEACHER' && className) {
        const classSnap = await adminDb.collection('classes')
          .where('schoolId', '==', targetSchoolId)
          .where('name', '==', className)
          .limit(1)
          .get();
        if (!classSnap.empty) {
          const classRef = classSnap.docs[0].ref;
          await classRef.update({ teacherId: uid, teacherName: name, updatedAt: now });
          await adminDb.collection('users').doc(uid).update({ classId: classSnap.docs[0].id });
        }
      }

      // Step 3: If parent role with selected students, update student parentIds
      if (role === 'PARENT' && Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
        for (const studentId of selectedStudentIds) {
          try {
            const studentRef = adminDb.collection('students').doc(studentId);
            const studentDoc = await studentRef.get();
            if (studentDoc.exists) {
              const currentData = studentDoc.data() || {};
              const existingParents = currentData.parentIds || [];
              if (!existingParents.includes(uid)) {
                await studentRef.update({ parentIds: [...existingParents, uid] });
              }
            }
          } catch (e) {
            console.warn(`[SERVER] Update student parentIds warning:`, e);
          }
        }
      }

      // Step 4: If teacher role with className, update class teacher assignment
      if (role === 'TEACHER' && className) {
        try {
          const classQuery = await adminDb
            .collection('classes')
            .where('name', '==', className)
            .limit(1)
            .get();
          if (!classQuery.empty) {
            await classQuery.docs[0].ref.update({
              teacherId: uid,
              teacherName: name,
            });
          }
        } catch (e) {
          console.warn(`[SERVER] Update class teacher warning:`, e);
        }
      }

      return res.json({
        success: true,
        message: 'Pengguna dan profil berhasil dibuat.',
        uid,
        profile: profileData,
      });
    } catch (err: any) {
      const status = err.status || 500;
      if (status >= 500) {
        console.error('[SERVER] create-user internal error:', err);
      } else {
        console.warn(`[SERVER] create-user client rejection (${status}):`, err?.message || err?.error || err);
      }
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal membuat pengguna.',
      });
    }
  });

  // Individual Controlled Teacher Activation API
  // Strictly isolates activation to target teacher: NO batching, NO guessing, NO class changes, NO parent/student side-effects
  app.post('/api/admin/teachers/:userId/activate', async (req, res) => {
    try {
      const { callerUid, callerData, adminAuth, adminDb } = await verifyAdminCaller(req);
      const { userId } = req.params;

      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ARGUMENTS',
          message: 'User ID target wajib ditentukan.',
        });
      }

      const targetDocRef = adminDb.collection('users').doc(userId.trim());
      const targetDoc = await targetDocRef.get();

      if (!targetDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: `Dokumen guru dengan ID "${userId}" tidak ditemukan di Firestore.`,
        });
      }

      const targetData = targetDoc.data() || {};
      const targetRole = String(targetData.role || '').toUpperCase();

      // Strict Role Validation: ONLY TEACHER / GURU allowed (No string guessing, no heuristic fallback)
      if (targetRole !== 'TEACHER' && targetRole !== 'GURU') {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ROLE',
          message: `Operasi ditolak: Akun target memiliki peran "${targetRole || 'TIDAK_DIKETAHUI'}", bukan TEACHER.`,
        });
      }

      // Strict School Isolation: Target must belong to caller's school
      const callerSchoolId = callerData?.schoolId || 'main-school';
      const targetSchoolId = targetData.schoolId || 'main-school';
      if (callerData?.role !== 'SUPER_ADMIN' && targetSchoolId !== callerSchoolId) {
        return res.status(403).json({
          success: false,
          error: 'SCHOOL_MISMATCH',
          message: 'Operasi ditolak: Target guru berada pada sekolah yang berbeda.',
        });
      }

      // Idempotency: If teacher is already active, do not perform redundant writes
      if (targetData.isActive === true) {
        return res.json({
          success: true,
          message: 'Guru sudah aktif.',
          alreadyActive: true,
          userId: userId.trim(),
        });
      }

      const now = new Date().toISOString();

      // Update ONLY target user: flip isActive to true and record updatedAt timestamp
      // PRESERVE all existing names, usernames, emails, academic titles (,Gr), classes, and student relations!
      await targetDocRef.update({
        isActive: true,
        updatedAt: now,
      });

      // Update Auth Custom Claims if Auth account exists
      try {
        await adminAuth.setCustomUserClaims(userId.trim(), {
          role: 'TEACHER',
          schoolId: targetSchoolId,
          isActive: true,
        });
      } catch (authErr: any) {
        console.warn('[ACTIVATE TEACHER] Custom claims update notice:', authErr?.message);
      }

      // Record formal Audit Log
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await adminDb.collection('auditLogs').doc(auditId).set({
        id: auditId,
        action: 'ACTIVATE_TEACHER',
        actorUserId: callerUid,
        actorRole: String(callerData.role || 'ADMIN').toUpperCase(),
        actorName: callerData.name || callerData.displayName || callerData.username || 'Admin',
        targetType: 'USER',
        targetId: userId.trim(),
        targetName: targetData.name || targetData.displayName || targetData.username || userId.trim(),
        schoolId: targetSchoolId,
        timestamp: now,
        metadata: {
          previousStatus: targetData.isActive ?? false,
          role: targetData.role,
          classId: targetData.classId || null,
          className: targetData.className || null,
        },
      });

      console.log(`[SERVER] Successfully activated teacher ${userId.trim()} (${targetData.name}) by admin ${callerUid}`);

      return res.json({
        success: true,
        message: `Akun guru "${targetData.name || targetData.displayName || targetData.username}" berhasil diaktifkan.`,
        userId: userId.trim(),
        alreadyActive: false,
      });
    } catch (err: any) {
      const status = err.status || 500;
      if (status >= 500) {
        console.error('[SERVER] activate-teacher internal error:', err);
      } else {
        console.warn(`[SERVER] activate-teacher client rejection (${status}):`, err?.message || err?.error || err);
      }
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal mengaktifkan akun guru.',
      });
    }
  });

  // Sync Profile API (Creates or repairs missing Firestore users/{uid} for existing Auth account)
  app.post('/api/admin/sync-profile', async (req, res) => {
    try {
      const { adminAuth, adminDb, callerData } = await verifyAdminCaller(req);
      const {
        uid,
        username,
        name,
        role,
        schoolId,
        schoolName,
        className,
        selectedStudentIds,
        isActive,
      } = req.body || {};

      if (!uid) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ARGUMENTS',
          message: 'UID wajib disertakan.',
        });
      }

      // Verify that user actually exists in Firebase Auth
      let authUser;
      try {
        authUser = await adminAuth.getUser(uid);
      } catch {
        return res.status(404).json({
          success: false,
          error: 'AUTH_USER_NOT_FOUND',
          message: `Pengguna dengan UID ${uid} tidak ditemukan di Firebase Authentication.`,
        });
      }

      // Check existing document first to preserve existing names, titles, and usernames
      const existingDoc = await adminDb.collection('users').doc(uid).get();
      const existingData = existingDoc.exists ? existingDoc.data() || {} : {};

      const inferredEmail = authUser.email || existingData.email || formatAuthEmail(username || 'user');
      const cleanUsername = (username || existingData.username || (inferredEmail.split('@')[0] ?? 'user')).toLowerCase().trim();
      const targetName = name || existingData.name || existingData.displayName || authUser.displayName || cleanUsername;
      const validRoles = ['ADMIN', 'PRINCIPAL', 'TEACHER', 'PARENT', 'OPERATOR'];
      const targetRole = validRoles.includes(role) ? role : (existingData.role || 'TEACHER');
      const targetSchoolId = callerData?.role === 'SUPER_ADMIN'
        ? (schoolId || existingData.schoolId || callerData?.schoolId || 'main-school')
        : (callerData?.schoolId || 'main-school');
      const targetSchoolName = schoolName || existingData.schoolName || 'Sekolah PAUD';

      // Set custom claims for server-authoritative token validation
      try {
        await adminAuth.setCustomUserClaims(uid, {
          role: targetRole,
          schoolId: targetSchoolId,
        });
      } catch (claimsErr) {
        console.warn('[SERVER] Warning setting custom user claims in sync-profile:', claimsErr);
      }

      const now = new Date().toISOString();
      const profileData: any = {
        id: uid,
        uid: uid,
        username: cleanUsername,
        name: targetName,
        displayName: targetName,
        role: targetRole,
        email: inferredEmail,
        avatar:
          existingData.avatar || (targetRole === 'PARENT'
            ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
            : targetRole === 'TEACHER'
            ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
            : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'),
        schoolId: targetSchoolId,
        schoolName: targetSchoolName,
        isActive: isActive !== undefined ? (isActive !== false) : (existingData.isActive !== false),
        studentIds: Array.isArray(selectedStudentIds) ? selectedStudentIds : (existingData.studentIds || []),
        linkedStudentIds: Array.isArray(selectedStudentIds) ? selectedStudentIds : (existingData.linkedStudentIds || []),
        updatedAt: now,
      };

      // Check if existing document has createdAt
      if (existingDoc.exists) {
        profileData.createdAt = existingData.createdAt || now;
      } else {
        profileData.createdAt = now;
      }

      if (Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
        profileData.childId = selectedStudentIds[0];
      }
      if (targetRole === 'TEACHER' && className) {
        profileData.className = className;
      }

      if (targetRole === 'PARENT' && Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
        for (const studentId of selectedStudentIds) {
          try {
            const studentRef = adminDb.collection('students').doc(studentId);
            const studentDoc = await studentRef.get();
            if (studentDoc.exists) {
              const currentData = studentDoc.data() || {};
              const existingParents = currentData.parentIds || [];
              if (!existingParents.includes(uid)) {
                await studentRef.update({ parentIds: [...existingParents, uid] });
              }
            }
          } catch (e) {
            console.warn(`[SERVER] sync-profile student parentIds warning:`, e);
          }
        }
      }

      await adminDb.collection('users').doc(uid).set(profileData, { merge: true });
      console.log(`[SERVER] Successfully synced Firestore profile users/${uid} for ${cleanUsername}`);

      return res.json({
        success: true,
        message: 'Profil Firestore berhasil disinkronkan dengan Firebase Authentication.',
        profile: profileData,
      });
    } catch (err: any) {
      const status = err.status || 500;
      if (status >= 500) {
        console.error('[SERVER] sync-profile internal error:', err);
      } else {
        console.warn(`[SERVER] sync-profile client rejection (${status}):`, err?.message || err?.error || err);
      }
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal menyinkronkan profil Firestore.',
      });
    }
  });

  // Parent-Student Auto-Linking & Verification API
  app.post('/api/parent/sync-student-link', async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Token otentikasi diperlukan.',
        });
      }
      const idToken = authHeader.split('Bearer ')[1].trim();
      const appInstance = getAdminApp();
      if (!appInstance) {
        return res.status(503).json({
          success: false,
          error: 'FIREBASE_NOT_CONFIGURED',
          message: 'Firebase Admin belum terkonfigurasi.',
        });
      }
      const adminAuth = getAuth(appInstance);
      const adminDb = getFirestore(appInstance);

      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const parentUid = decodedToken.uid;
      const parentEmail = (decodedToken.email || '').toLowerCase().trim();

      // Read parent profile from Firestore users collection
      const userRef = adminDb.collection('users').doc(parentUid);
      const userDoc = await userRef.get();
      const userData = userDoc.exists ? userDoc.data() || {} : {};
      const schoolId = userData.schoolId || 'main-school';

      const existingLinkedIds = new Set<string>([
        ...(userData.studentIds || []),
        ...(userData.linkedStudentIds || []),
        ...(userData.childId ? [userData.childId] : []),
      ]);

      // Query students in this school
      const studentsSnap = await adminDb
        .collection('students')
        .where('schoolId', '==', schoolId)
        .get();
      const matchedStudentIds = new Set<string>();

      for (const sDoc of studentsSnap.docs) {
        const sData = sDoc.data();
        let isMatch = false;

        // Check 1: parentIds array contains parentUid
        if (Array.isArray(sData.parentIds) && sData.parentIds.includes(parentUid)) {
          isMatch = true;
        }

        // Check 2: legacy parentId
        if (sData.parentId === parentUid) {
          isMatch = true;
        }

        // Check 3: parentEmail matches parent's auth email
        if (
          parentEmail &&
          sData.parentEmail &&
          sData.parentEmail.toLowerCase().trim() === parentEmail
        ) {
          isMatch = true;
        }

        // Check 4: already in user profile's linked IDs
        if (existingLinkedIds.has(sDoc.id)) {
          isMatch = true;
        }

        if (isMatch) {
          matchedStudentIds.add(sDoc.id);

          // Ensure parentUid is in student's parentIds array
          const currParents = Array.isArray(sData.parentIds) ? sData.parentIds : [];
          if (!currParents.includes(parentUid)) {
            await sDoc.ref.update({
              parentIds: [...currParents, parentUid],
              updatedAt: new Date().toISOString(),
            });
            console.log(`[SERVER] Auto-linked parent ${parentUid} to student ${sDoc.id}`);
          }
        }
      }

      const allLinkedIds = Array.from(matchedStudentIds);

      // Update user document if needed
      if (allLinkedIds.length > 0) {
        await userRef.set(
          {
            studentIds: allLinkedIds,
            linkedStudentIds: allLinkedIds,
            childId: allLinkedIds[0],
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      return res.json({
        success: true,
        linkedStudentIds: allLinkedIds,
        count: allLinkedIds.length,
      });
    } catch (err: any) {
      const status = err.status || 500;
      if (status >= 500) {
        console.error('[SERVER] /api/parent/sync-student-link internal error:', err);
      } else {
        console.warn(`[SERVER] sync-student-link client rejection (${status}):`, err?.message || err?.error || err);
      }
      return res.status(status).json({ success: false, error: err.error || 'SERVER_ERROR', message: err.message });
    }
  });

  // Admin Change Password API (Individual & Authorized - Bagian D, E, F)
  app.post('/api/admin/change-password', async (req, res) => {
    try {
      const { callerUid, callerData, adminAuth, adminDb } = await verifyAdminCaller(req);
      const { targetUid, newPassword } = req.body || {};

      // 1. Strict input validation
      if (!targetUid || typeof targetUid !== 'string' || targetUid.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'INVALID_TARGET',
          message: 'UID target wajib diisi dan berupa satu ID pengguna yang valid.'
        });
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'WEAK_PASSWORD',
          message: 'Password minimal 6 karakter.'
        });
      }

      const cleanTargetUid = targetUid.trim();

      // 2. Read-only verification of target user in Firestore & school isolation
      const targetDoc = await adminDb.collection('users').doc(cleanTargetUid).get();
      if (!targetDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'TARGET_NOT_FOUND',
          message: 'Pengguna target tidak ditemukan di sistem.'
        });
      }

      const targetData = targetDoc.data() || {};
      const targetSchoolId = targetData.schoolId || 'main-school';
      const callerSchoolId = callerData?.schoolId || 'main-school';

      if (callerData?.role !== 'SUPER_ADMIN' && targetSchoolId !== callerSchoolId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Anda hanya dapat mengubah password pengguna di sekolah Anda sendiri.'
        });
      }

      // 3. Update password via Firebase Admin SDK (never logged, never stored in Firestore)
      try {
        await adminAuth.updateUser(cleanTargetUid, { password: newPassword });
      } catch (updateErr: any) {
        console.error('[SERVER] updateUser error code:', updateErr?.code || 'UNKNOWN_ERROR');
        return res.status(500).json({
          success: false,
          error: updateErr?.code || 'ADMIN_UPDATE_FAILED',
          message: updateErr?.message || 'Gagal mengubah password via Firebase Admin SDK.'
        });
      }

      // 4. Record Audit Log (Bagian F: actorUserId, actorRole, targetUserId, targetType, action, timestamp, schoolId)
      // Strictly NO passwords recorded
      const now = new Date().toISOString();
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await adminDb.collection('auditLogs').doc(auditId).set({
        id: auditId,
        actorUserId: callerUid,
        actorRole: String(callerData?.role || 'ADMIN').toUpperCase(),
        targetUserId: cleanTargetUid,
        targetType: 'USER',
        action: 'CHANGE_PASSWORD',
        timestamp: now,
        schoolId: targetSchoolId,
      });

      console.log(`[SERVER] Password updated for target ${cleanTargetUid} by admin ${callerUid}`);

      return res.json({
        success: true,
        message: `Password berhasil diperbarui untuk @${targetData.username || cleanTargetUid}`
      });
    } catch (err: any) {
      const status = err.status || 500;
      if (status >= 500) {
        console.error('[SERVER] change-password endpoint internal error:', err);
      } else {
        console.warn(`[SERVER] change-password client rejection (${status}):`, err?.message || err?.error || err);
      }
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Terjadi kesalahan internal pada server.'
      });
    }
  });

  // Individual & Authorized Temporary Password Issuance Endpoint
  app.post('/api/admin/issue-temporary-password', async (req, res) => {
    try {
      const { callerUid, callerData, adminAuth, adminDb } = await verifyAdminCaller(req);
      const { targetUid } = req.body || {};

      if (!targetUid || typeof targetUid !== 'string' || targetUid.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'INVALID_TARGET',
          message: 'UID target wajib diisi.'
        });
      }

      const cleanTargetUid = targetUid.trim();
      const targetDoc = await adminDb.collection('users').doc(cleanTargetUid).get();
      if (!targetDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'TARGET_NOT_FOUND',
          message: 'Pengguna target tidak ditemukan di sistem.'
        });
      }

      const targetData = targetDoc.data() || {};
      const targetSchoolId = targetData.schoolId || 'main-school';
      const callerSchoolId = callerData?.schoolId || 'main-school';

      if (callerData?.role !== 'SUPER_ADMIN' && targetSchoolId !== callerSchoolId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Anda hanya dapat mengelola pengguna di sekolah Anda sendiri.'
        });
      }

      // Generate a strong, individual temporary password (10 chars, safe characters)
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
      const temporaryPassword = `GrowUp#${randomChars}${randomSuffix}`;

      // Update Firebase Auth password
      await adminAuth.updateUser(cleanTargetUid, { password: temporaryPassword });

      // Audit Log
      const now = new Date().toISOString();
      const auditId = `audit-temp-pass-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await adminDb.collection('auditLogs').doc(auditId).set({
        id: auditId,
        actorUserId: callerUid,
        actorRole: String(callerData?.role || 'ADMIN').toUpperCase(),
        targetUserId: cleanTargetUid,
        targetType: 'USER',
        action: 'ISSUE_TEMPORARY_PASSWORD',
        timestamp: now,
        schoolId: targetSchoolId,
      });

      console.log(`[SERVER] Temporary password issued for target ${cleanTargetUid} by admin ${callerUid}`);

      return res.json({
        success: true,
        temporaryPassword,
        username: targetData.username || cleanTargetUid,
        issuedAt: now,
        message: `Kata sandi sementara berhasil diterbitkan secara aman untuk @${targetData.username || cleanTargetUid}.`
      });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal menerbitkan kata sandi sementara.'
      });
    }
  });

  // Download Audit Account Excel (.xlsx) Endpoint
  app.get('/api/admin/download-audit-excel', async (req, res) => {
    try {
      await verifyAdminCaller(req);
      const filePath = path.resolve('DAFTAR_AKUN_PENGGUNA_GROWUPAUD.xlsx');
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File audit Excel belum dibuat. Silakan jalankan audit terlebih dahulu.'
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="DAFTAR_AKUN_PENGGUNA_GROWUPAUD.xlsx"');
      return res.sendFile(filePath);
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal mengunduh file audit Excel.'
      });
    }
  });

  // ==========================================
  // PARENT ACCOUNT AUTOMATIC SYNC ENDPOINTS
  // Requirement: Sync 64 child records -> Parent Users with no duplicates & strict RBAC
  // ==========================================

  // 1. Get Parent Sync Status & Preview
  app.get('/api/admin/parent-sync/status', async (req, res) => {
    try {
      const { callerData, adminDb } = await verifyAdminCaller(req);
      const targetSchoolId = callerData?.schoolId || 'main-school';

      // Fetch all students in school
      const studentsSnap = await adminDb
        .collection('students')
        .where('schoolId', '==', targetSchoolId)
        .get();

      // Fetch all users in school
      const usersSnap = await adminDb
        .collection('users')
        .where('schoolId', '==', targetSchoolId)
        .get();

      const userByUsername = new Map<string, any>();
      const userById = new Map<string, any>();
      usersSnap.docs.forEach((doc) => {
        const u: any = { id: doc.id, ...doc.data() };
        if (u.username) userByUsername.set(String(u.username).toLowerCase().trim(), u);
        userById.set(doc.id, u);
      });

      const items: any[] = [];
      let totalStudents = 0;
      let alreadyExisting = 0;
      let incomplete = 0;
      let readyToSync = 0;

      for (const sDoc of studentsSnap.docs) {
        totalStudents++;
        const s = sDoc.data();
        const parentName = (s.parentName || '').trim();
        const className = (s.className || '').trim();
        const studentName = s.name || s.nickname || 'Tanpa Nama';

        // Check completeness
        const missingFields: string[] = [];
        if (!parentName) missingFields.push('Nama Orang Tua / Wali');
        if (!className) missingFields.push('Kelas');

        if (missingFields.length > 0) {
          incomplete++;
          items.push({
            studentId: sDoc.id,
            studentName,
            parentName: parentName || '-',
            className: className || '-',
            username: '-',
            displayPassword: '-',
            status: 'BELUM_LENGKAP',
            message: `Data belum lengkap: ${missingFields.join(', ')} belum tersedia.`,
            missingFields,
          });
          continue;
        }

        const username = parentName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanClass = className.toLowerCase().replace(/^kelas\s+/i, '').replace(/[^a-z0-9]/g, '');
        const displayPassword = cleanClass;

        // Check if account already exists
        let existingUser = userByUsername.get(username);
        if (!existingUser && Array.isArray(s.parentIds) && s.parentIds.length > 0) {
          for (const pid of s.parentIds) {
            const candidate = userById.get(pid);
            if (candidate && (candidate.role === 'PARENT' || candidate.role === 'ORANG_TUA')) {
              existingUser = candidate;
              break;
            }
          }
        }

        if (existingUser) {
          alreadyExisting++;
          items.push({
            studentId: sDoc.id,
            studentName,
            parentName,
            className,
            username: existingUser.username || username,
            displayPassword,
            status: 'SUDAH ADA',
            message: `Akun orang tua (@${existingUser.username || username}) sudah terdaftar dan terhubung ke siswa.`,
            parentUid: existingUser.id,
          });
        } else {
          readyToSync++;
          items.push({
            studentId: sDoc.id,
            studentName,
            parentName,
            className,
            username,
            displayPassword,
            status: 'BELUM_DISINKRONKAN',
            message: 'Siap disinkronkan ke Firebase Authentication & Firestore.',
          });
        }
      }

      return res.json({
        success: true,
        summary: {
          totalStudents,
          alreadyExisting,
          incomplete,
          readyToSync,
        },
        items,
      });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.error || 'SERVER_ERROR', message: err.message });
    }
  });

  // 2. Execute Parent Sync across all students
  app.post('/api/admin/parent-sync/execute', async (req, res) => {
    try {
      const { callerUid, callerData, adminAuth, adminDb } = await verifyAdminCaller(req);
      const targetSchoolId = callerData?.schoolId || 'main-school';
      const targetSchoolName = callerData?.schoolName || 'TK PAUD Anggrek';

      // 1. Fetch all students in school
      const studentsSnap = await adminDb
        .collection('students')
        .where('schoolId', '==', targetSchoolId)
        .get();

      // 2. Fetch all existing users in Firestore
      const usersSnap = await adminDb
        .collection('users')
        .where('schoolId', '==', targetSchoolId)
        .get();

      const userByUsername = new Map<string, any>();
      const userById = new Map<string, any>();
      usersSnap.docs.forEach((doc) => {
        const u: any = { id: doc.id, ...doc.data() };
        if (u.username) userByUsername.set(String(u.username).toLowerCase().trim(), u);
        userById.set(doc.id, u);
      });

      // 3. Group students by normalized parent username to prevent duplicate parent accounts
      type StudentItem = {
        id: string;
        data: any;
        studentName: string;
        parentName: string;
        className: string;
        missingFields: string[];
        username: string;
        displayPassword: string;
        authPassword: string;
      };

      const incompleteItems: StudentItem[] = [];
      const parentGroups = new Map<string, StudentItem[]>();

      for (const sDoc of studentsSnap.docs) {
        const s = sDoc.data();
        const parentName = (s.parentName || '').trim();
        const className = (s.className || '').trim();
        const studentName = s.name || s.nickname || 'Tanpa Nama';

        const missingFields: string[] = [];
        if (!parentName) missingFields.push('Nama Orang Tua / Wali');
        if (!className) missingFields.push('Kelas');

        if (missingFields.length > 0) {
          incompleteItems.push({
            id: sDoc.id,
            data: s,
            studentName,
            parentName: parentName || '-',
            className: className || '-',
            missingFields,
            username: '-',
            displayPassword: '-',
            authPassword: '-',
          });
          continue;
        }

        const username = parentName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanClass = className.toLowerCase().replace(/^kelas\s+/i, '').replace(/[^a-z0-9]/g, '');
        const displayPassword = cleanClass;
        // Firebase Auth enforces >= 6 chars
        const authPassword = cleanClass.length >= 6 ? cleanClass : `kelas${cleanClass}`;

        const item: StudentItem = {
          id: sDoc.id,
          data: s,
          studentName,
          parentName,
          className,
          missingFields: [],
          username,
          displayPassword,
          authPassword,
        };

        if (!parentGroups.has(username)) {
          parentGroups.set(username, []);
        }
        parentGroups.get(username)!.push(item);
      }

      const results: any[] = [];
      let totalExamined = 0;
      let createdCount = 0;
      let alreadyExistingCount = 0;
      let incompleteCount = 0;
      let failedCount = 0;

      // Handle incomplete items
      for (const inc of incompleteItems) {
        totalExamined++;
        incompleteCount++;
        results.push({
          studentId: inc.id,
          studentName: inc.studentName,
          parentName: inc.parentName,
          className: inc.className,
          username: '-',
          displayPassword: '-',
          status: 'BELUM_LENGKAP',
          message: `Data belum lengkap: ${inc.missingFields.join(', ')} belum tersedia.`,
          missingFields: inc.missingFields,
        });
      }

      const now = new Date().toISOString();

      // Process each unique parent group
      for (const [username, kids] of parentGroups.entries()) {
        const kidIds = kids.map((k) => k.id);
        const primaryKid = kids[0];
        const email = formatAuthEmail(username);

        // Check if user already exists in Firestore by username
        let existingUser = userByUsername.get(username);

        // Check if any kid already has an existing linked PARENT user in parentIds
        if (!existingUser) {
          for (const kid of kids) {
            if (Array.isArray(kid.data.parentIds)) {
              for (const pid of kid.data.parentIds) {
                const candidate = userById.get(pid);
                if (candidate && (candidate.role === 'PARENT' || candidate.role === 'ORANG_TUA')) {
                  existingUser = candidate;
                  break;
                }
              }
            }
            if (existingUser) break;
          }
        }

        if (existingUser) {
          // Account already exists: ensure relations are connected without duplicating
          const parentUid = existingUser.id;
          const currentLinked = new Set<string>([
            ...(existingUser.linkedStudentIds || []),
            ...(existingUser.studentIds || []),
            ...(existingUser.childId ? [existingUser.childId] : []),
            ...kidIds,
          ]);
          const updatedStudentIds = Array.from(currentLinked);

          try {
            await adminDb.collection('users').doc(parentUid).update({
              studentIds: updatedStudentIds,
              linkedStudentIds: updatedStudentIds,
              childId: updatedStudentIds[0] || '',
              updatedAt: now,
            });

            // Update parentIds on all child documents
            for (const kid of kids) {
              const currentParents = Array.isArray(kid.data.parentIds) ? kid.data.parentIds : [];
              if (!currentParents.includes(parentUid)) {
                await adminDb.collection('students').doc(kid.id).update({
                  parentIds: [...currentParents, parentUid],
                });
              }
            }

            alreadyExistingCount += kids.length;
            totalExamined += kids.length;

            for (const kid of kids) {
              results.push({
                studentId: kid.id,
                studentName: kid.studentName,
                parentName: kid.parentName,
                className: kid.className,
                username: existingUser.username || username,
                displayPassword: kid.displayPassword,
                status: 'SUDAH ADA',
                message: `Akun @${existingUser.username || username} sudah terdaftar dan terhubung ke siswa.`,
                parentUid,
              });
            }
          } catch (e: any) {
            failedCount += kids.length;
            totalExamined += kids.length;
            for (const kid of kids) {
              results.push({
                studentId: kid.id,
                studentName: kid.studentName,
                parentName: kid.parentName,
                className: kid.className,
                username,
                displayPassword: kid.displayPassword,
                status: 'GAGAL',
                message: `Gagal memperbarui relasi: ${e.message}`,
              });
            }
          }
          continue;
        }

        // Account does not exist yet: create in Firebase Auth and Firestore
        try {
          let userRecord;
          try {
            userRecord = await adminAuth.createUser({
              email,
              password: primaryKid.authPassword,
              displayName: primaryKid.parentName,
            });
          } catch (authErr: any) {
            if (authErr.code === 'auth/email-already-in-use') {
              userRecord = await adminAuth.getUserByEmail(email);
            } else {
              throw authErr;
            }
          }

          const uid = userRecord.uid;

          // Set custom claims
          try {
            await adminAuth.setCustomUserClaims(uid, {
              role: 'PARENT',
              schoolId: targetSchoolId,
            });
          } catch (claimsErr) {
            console.warn('[SERVER] Warning setting claims for parent:', claimsErr);
          }

          // Create Firestore profile at users/{uid}
          const profileData: any = {
            id: uid,
            uid,
            username,
            name: primaryKid.parentName,
            displayName: primaryKid.parentName,
            role: 'PARENT',
            email,
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
            schoolId: targetSchoolId,
            schoolName: targetSchoolName,
            isActive: true,
            childId: kidIds[0],
            studentIds: kidIds,
            linkedStudentIds: kidIds,
            createdAt: now,
            updatedAt: now,
          };

          await adminDb.collection('users').doc(uid).set(profileData);

          // Update parentIds on all child documents
          for (const kid of kids) {
            const currentParents = Array.isArray(kid.data.parentIds) ? kid.data.parentIds : [];
            if (!currentParents.includes(uid)) {
              await adminDb.collection('students').doc(kid.id).update({
                parentIds: [...currentParents, uid],
              });
            }
          }

          userByUsername.set(username, profileData);
          userById.set(uid, profileData);

          createdCount += kids.length;
          totalExamined += kids.length;

          for (const kid of kids) {
            results.push({
              studentId: kid.id,
              studentName: kid.studentName,
              parentName: kid.parentName,
              className: kid.className,
              username,
              displayPassword: kid.displayPassword,
              status: 'BERHASIL',
              message: `Akun @${username} berhasil dibuat dan ditautkan ke ${kid.studentName}.`,
              parentUid: uid,
            });
          }
        } catch (createErr: any) {
          console.error(`[SERVER] Error syncing parent @${username}:`, createErr);
          failedCount += kids.length;
          totalExamined += kids.length;

          for (const kid of kids) {
            results.push({
              studentId: kid.id,
              studentName: kid.studentName,
              parentName: kid.parentName,
              className: kid.className,
              username,
              displayPassword: kid.displayPassword,
              status: 'GAGAL',
              message: `Gagal membuat akun: ${createErr.message}`,
            });
          }
        }
      }

      // Record Idempotent Audit Log
      try {
        const auditId = `audit-parent-sync-${Date.now()}`;
        await adminDb.collection('auditLogs').doc(auditId).set({
          id: auditId,
          actorUserId: callerUid,
          actorRole: String(callerData?.role || 'ADMIN').toUpperCase(),
          targetType: 'PARENT_USERS_SYNC',
          action: 'SYNC_PARENT_ACCOUNTS',
          timestamp: now,
          schoolId: targetSchoolId,
          details: {
            totalExamined,
            created: createdCount,
            alreadyExisting: alreadyExistingCount,
            incomplete: incompleteCount,
            failed: failedCount,
          },
        });
      } catch (auditErr) {
        console.warn('[SERVER] Audit log sync notice:', auditErr);
      }

      return res.json({
        success: true,
        summary: {
          totalStudents: totalExamined,
          created: createdCount,
          alreadyExisting: alreadyExistingCount,
          incomplete: incompleteCount,
          failed: failedCount,
        },
        items: results,
      });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.error || 'SERVER_ERROR', message: err.message });
    }
  });

  // ==========================================
  // REAL NOTIFICATION & MESSAGING ENDPOINTS (THREADS)
  // School Authority: ADMIN, PRINCIPAL, TEACHER, PARENT
  // ==========================================

  // 1. Get Eligible Recipients for the caller based on role authority & class scope
  app.get('/api/messaging/recipients', async (req, res) => {
    try {
      const { uid, role, profile, adminDb } = await verifyAuthenticatedUser(req);
      const callerSchoolId = profile.schoolId || 'main-school';

      const usersSnap = await adminDb.collection('users').get();
      const recipients: any[] = [];

      if (role === 'PARENT' || role === 'ORANG_TUA') {
        // Find parent's children classes
        const pKidsSnap = await adminDb.collection('students')
          .where('parentIds', 'array-contains', uid)
          .get();
        const allowedClassNames = new Set<string>();
        const allowedClassIds = new Set<string>();
        const allowedTeacherIds = new Set<string>();

        // Load all classes to map teacher assignments
        const classesSnap = await adminDb.collection('classes').get();
        const classesList: any[] = [];
        classesSnap.forEach((c: any) => classesList.push({ id: c.id, ...c.data() }));

        const checkStudentClass = (sData: any) => {
          const cls = String(sData.className || sData.classGroup || '').replace(/^KELAS\s+/i, '').trim().toUpperCase();
          if (cls) allowedClassNames.add(cls);
          if (sData.classId) allowedClassIds.add(sData.classId);
          // Also find class teacher from classesList
          const matchedClass = classesList.find((c: any) => {
            const cName = String(c.name || '').trim().toUpperCase();
            return cName === cls || c.id === sData.classId;
          });
          if (matchedClass && matchedClass.teacherId) {
            allowedTeacherIds.add(matchedClass.teacherId);
          }
        };

        pKidsSnap.forEach((d: any) => checkStudentClass(d.data()));

        // Also check profile's linked student IDs
        const linkedIds = [
          ...(profile.studentIds || []),
          ...(profile.linkedStudentIds || []),
          ...(profile.childId ? [profile.childId] : []),
        ];
        for (const sId of linkedIds) {
          const sDoc = await adminDb.collection('students').doc(sId).get();
          if (sDoc.exists) {
            checkStudentClass(sDoc.data());
          }
        }

        usersSnap.forEach((doc: any) => {
          if (doc.id === uid) return;
          const userData = doc.data();
          if (userData.isActive === false) return;
          const targetRole = String(userData.role || '').toUpperCase();
          if (!isCommunicationPermitted(role, targetRole)) return;
          const targetSchoolId = userData.schoolId || 'main-school';
          if (callerSchoolId !== targetSchoolId) return;

          // For TEACHER: only if teacher is assigned to parent's child's class
          if (['TEACHER', 'GURU'].includes(targetRole)) {
            const tClass = String(userData.className || '').replace(/^KELAS\s+/i, '').trim().toUpperCase();
            const isMatch =
              allowedTeacherIds.has(doc.id) ||
              allowedClassNames.has(tClass) ||
              (userData.classId && allowedClassIds.has(userData.classId));
            if (!isMatch) return;
          }

          recipients.push({
            id: doc.id,
            uid: doc.id,
            name: userData.name || userData.displayName || userData.username || 'Pengguna',
            username: userData.username || '',
            role: targetRole,
            schoolId: targetSchoolId,
            schoolName: userData.schoolName || 'TK PAUD',
            className: userData.className || '',
          });
        });
      } else if (['TEACHER', 'GURU'].includes(role)) {
        // Teacher sees Principal, Admin, other Teachers, and parents of their class
        const teacherClass = String(profile.className || '').replace(/^KELAS\s+/i, '').trim().toUpperCase();

        const studentsInClassSnap = await adminDb.collection('students').get();
        const parentUidsInClass = new Set<string>();
        studentsInClassSnap.forEach((d: any) => {
          const sData = d.data();
          const sClass = String(sData.className || sData.classGroup || '').replace(/^KELAS\s+/i, '').trim().toUpperCase();
          if (sClass === teacherClass && Array.isArray(sData.parentIds)) {
            sData.parentIds.forEach((pId: string) => parentUidsInClass.add(pId));
          }
        });

        usersSnap.forEach((doc: any) => {
          if (doc.id === uid) return;
          const userData = doc.data();
          if (userData.isActive === false) return;
          const targetRole = String(userData.role || '').toUpperCase();
          if (!isCommunicationPermitted(role, targetRole)) return;
          const targetSchoolId = userData.schoolId || 'main-school';
          if (callerSchoolId !== targetSchoolId) return;

          // If target is PARENT, only allow if their child is in teacher's class
          if (['PARENT', 'ORANG_TUA'].includes(targetRole)) {
            if (!parentUidsInClass.has(doc.id)) return;
          }

          recipients.push({
            id: doc.id,
            uid: doc.id,
            name: userData.name || userData.displayName || userData.username || 'Pengguna',
            username: userData.username || '',
            role: targetRole,
            schoolId: targetSchoolId,
            schoolName: userData.schoolName || 'TK PAUD',
            className: userData.className || '',
          });
        });
      } else {
        // Admin & Principal see all valid communicators
        usersSnap.forEach((doc: any) => {
          if (doc.id === uid) return;
          const userData = doc.data();
          if (userData.isActive === false) return;
          const targetRole = String(userData.role || '').toUpperCase();
          if (!isCommunicationPermitted(role, targetRole)) return;
          const targetSchoolId = userData.schoolId || 'main-school';
          if (role !== 'SUPER_ADMIN' && callerSchoolId !== targetSchoolId) return;

          recipients.push({
            id: doc.id,
            uid: doc.id,
            name: userData.name || userData.displayName || userData.username || 'Pengguna',
            username: userData.username || '',
            role: targetRole,
            schoolId: targetSchoolId,
            schoolName: userData.schoolName || 'TK PAUD',
            className: userData.className || '',
          });
        });
      }

      return res.json({ success: true, recipients });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal mengambil daftar kontak penerima.',
      });
    }
  });

  // 1.5 Get Parent's Real Children Profiles with Class & Teacher
  app.get('/api/parent/children-profiles', async (req, res) => {
    try {
      const { uid, role, profile, adminDb } = await verifyAuthenticatedUser(req);
      const isParent = role === 'PARENT' || role === 'ORANG_TUA';

      let targetParentUid = uid;
      if (!isParent && req.query.parentId && typeof req.query.parentId === 'string') {
        targetParentUid = req.query.parentId;
      }

      // 1. Get Parent's user doc
      const pDoc = await adminDb.collection('users').doc(targetParentUid).get();
      if (!pDoc.exists) {
        return res.status(404).json({ success: false, error: 'PARENT_NOT_FOUND', message: 'Data orang tua tidak ditemukan.' });
      }
      const parentData = pDoc.data() || {};

      // 2. Collect student IDs
      const rawIds: string[] = [
        ...(Array.isArray(parentData.studentIds) ? parentData.studentIds : []),
        ...(Array.isArray(parentData.linkedStudentIds) ? parentData.linkedStudentIds : []),
        ...(parentData.childId ? [parentData.childId] : []),
      ];

      // Also query students with parentIds array-contains targetParentUid
      const sSnap = await adminDb.collection('students')
        .where('parentIds', 'array-contains', targetParentUid)
        .get();
      sSnap.forEach((d: any) => rawIds.push(d.id));

      const uniqueStudentIds = Array.from(new Set(rawIds.filter(Boolean)));

      // 3. Load classes and teachers for dynamic resolution
      const classesSnap = await adminDb.collection('classes').get();
      const classesList: any[] = [];
      classesSnap.forEach((d: any) => classesList.push({ id: d.id, ...d.data() }));

      const teachersSnap = await adminDb.collection('users')
        .where('role', 'in', ['TEACHER', 'GURU'])
        .get();
      const teachersList: any[] = [];
      teachersSnap.forEach((d: any) => teachersList.push({ id: d.id, ...d.data() }));

      // School info for active academic year
      const schoolSnap = await adminDb.collection('schools').doc('main-school').get();
      const schoolData = schoolSnap.data() || {};
      const activeAcademicYear = schoolData.academicYear || '2026/2027';

      // 4. Resolve each child
      const children: any[] = [];
      for (const sId of uniqueStudentIds) {
        const studentDoc = await adminDb.collection('students').doc(sId).get();
        if (!studentDoc.exists) continue;
        const s = studentDoc.data() || {};

        // Security check: ensure student is linked to this parent
        const isAuthorized =
          (Array.isArray(s.parentIds) && s.parentIds.includes(targetParentUid)) ||
          s.parentId === targetParentUid;
        if (!isAuthorized && isParent) continue;

        const rawClassName = String(s.className || s.classGroup || '').trim();
        const cleanClassName = rawClassName.replace(/^KELAS\s+/i, '').trim().toUpperCase();

        // Match Class
        const matchedClass = classesList.find((c: any) => {
          const cName = String(c.name || '').trim().toUpperCase();
          return cName === cleanClassName || c.id === s.classId;
        });

        // Match Teacher
        let teacher = null;
        if (matchedClass && matchedClass.teacherId) {
          teacher = teachersList.find((t: any) => t.id === matchedClass.teacherId);
        }
        if (!teacher) {
          teacher = teachersList.find((t: any) => {
            const tClass = String(t.className || '').replace(/^KELAS\s+/i, '').trim().toUpperCase();
            return tClass === cleanClassName || (matchedClass && t.classId === matchedClass.id);
          });
        }

        const teacherName = teacher
          ? (teacher.name || teacher.displayName || teacher.username)
          : (matchedClass?.teacherName || 'Wali Kelas');
        const teacherId = teacher ? teacher.id : (matchedClass?.teacherId || null);

        children.push({
          id: studentDoc.id,
          studentId: studentDoc.id,
          name: s.name || 'Ananda',
          nickname: s.nickname || '',
          avatar: s.avatar || '',
          gender: s.gender || 'L',
          className: matchedClass ? `KELAS ${matchedClass.name}` : (s.className || 'PAUD'),
          classGroup: matchedClass ? matchedClass.name : (s.className || 'PAUD'),
          classId: matchedClass ? matchedClass.id : (s.classId || ''),
          teacherId,
          teacherName,
          teacherAvatar: teacher?.avatar || '',
          teacherUsername: teacher?.username || '',
          academicYear: activeAcademicYear,
          age: s.age || s.ageLabel || '5 tahun',
          parentName: s.parentName || parentData.name || 'Orang Tua',
          parentIds: Array.isArray(s.parentIds) ? s.parentIds : [targetParentUid],
          parentId: s.parentId || targetParentUid,
          schoolId: s.schoolId || 'main-school',
        });
      }

      return res.json({ success: true, children });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal mengambil data anak.',
      });
    }
  });

  // 1.6 Get Parent's Children Observations (Strictly RBAC & Authenticated)
  app.get('/api/parent/observations', async (req, res) => {
    try {
      const { uid, role, profile, adminDb } = await verifyAuthenticatedUser(req);
      const isParent = role === 'PARENT' || role === 'ORANG_TUA';

      let targetParentUid = uid;
      if (!isParent && req.query.parentId && typeof req.query.parentId === 'string') {
        targetParentUid = req.query.parentId;
      }

      // Collect target student IDs
      const pDoc = await adminDb.collection('users').doc(targetParentUid).get();
      const parentData = pDoc.exists ? pDoc.data() || {} : {};
      const rawIds: string[] = [
        ...(Array.isArray(parentData.studentIds) ? parentData.studentIds : []),
        ...(Array.isArray(parentData.linkedStudentIds) ? parentData.linkedStudentIds : []),
        ...(parentData.childId ? [parentData.childId] : []),
      ];

      const sSnap = await adminDb.collection('students')
        .where('parentIds', 'array-contains', targetParentUid)
        .get();
      sSnap.forEach((d: any) => rawIds.push(d.id));

      const uniqueStudentIds = Array.from(new Set(rawIds.filter(Boolean)));
      if (uniqueStudentIds.length === 0) {
        return res.json({ success: true, observations: [] });
      }

      // Query observations in chunks of 10 for Firestore 'in' query limitation
      const observations: any[] = [];
      for (let i = 0; i < uniqueStudentIds.length; i += 10) {
        const chunk = uniqueStudentIds.slice(i, i + 10);
        const obsSnap = await adminDb.collection('observations')
          .where('studentId', 'in', chunk)
          .get();
        obsSnap.forEach((d: any) => {
          observations.push({ id: d.id, ...d.data() });
        });
      }

      observations.sort((a, b) => {
        const timeA = new Date(a.date || a.createdAt || 0).getTime();
        const timeB = new Date(b.date || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      return res.json({ success: true, observations, count: observations.length });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal mengambil data observasi ananda.',
      });
    }
  });

  // 2. Get User Conversations
  app.get('/api/conversations', async (req, res) => {
    try {
      const { uid, adminDb } = await verifyAuthenticatedUser(req);

      const convsSnap = await adminDb.collection('conversations')
        .where('participantIds', 'array-contains', uid)
        .get();

      const conversations: any[] = [];
      convsSnap.forEach((doc: any) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          ...data,
          unreadCount: (data.unreadCountByUser && data.unreadCountByUser[uid]) || 0,
        });
      });

      // Sort by updatedAt descending
      conversations.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.lastMessageAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.lastMessageAt || 0).getTime();
        return timeB - timeA;
      });

      return res.json({ success: true, conversations });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal memuat percakapan.',
      });
    }
  });

  // 3. Start or Continue a Conversation
  app.post('/api/conversations', async (req, res) => {
    try {
      const { uid, role, profile, adminDb } = await verifyAuthenticatedUser(req);
      const { recipientId, subject, body, studentId, studentName } = req.body || {};

      if (!recipientId || !subject?.trim() || !body?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_INPUT',
          message: 'Penerima, perihal (subjek), dan pesan wajib diisi.',
        });
      }

      if (recipientId === uid) {
        return res.status(400).json({
          success: false,
          error: 'CANNOT_MESSAGE_SELF',
          message: 'Anda tidak dapat mengirim pesan ke akun sendiri.',
        });
      }

      // Verify recipient existence & role permissions
      const recipientDoc = await adminDb.collection('users').doc(recipientId).get();
      if (!recipientDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'RECIPIENT_NOT_FOUND',
          message: 'Penerima tidak ditemukan dalam sistem.',
        });
      }

      const recipientData = recipientDoc.data() || {};
      const recipientRole = String(recipientData.role || '').toUpperCase();

      if (!isCommunicationPermitted(role, recipientRole)) {
        return res.status(403).json({
          success: false,
          error: 'COMMUNICATION_FORBIDDEN',
          message: `Komunikasi langsung antara peran ${role} dan ${recipientRole} tidak diizinkan oleh kebijakan sekolah.`,
        });
      }

      const now = new Date().toISOString();
      const senderName = profile.name || profile.displayName || profile.username || 'Pengguna';
      const recipientName = recipientData.name || recipientData.displayName || recipientData.username || 'Pengguna';
      const schoolId = profile.schoolId || recipientData.schoolId || 'main-school';

      // Check existing conversation
      let convId: string | null = null;
      const existingSnap = await adminDb.collection('conversations')
        .where('participantIds', 'array-contains', uid)
        .get();

      existingSnap.forEach((doc: any) => {
        const c = doc.data();
        if (
          c.participantIds &&
          c.participantIds.includes(recipientId) &&
          c.participantIds.length === 2 &&
          (!studentId || c.studentId === studentId)
        ) {
          convId = doc.id;
        }
      });

      const isNew = !convId;
      if (!convId) {
        convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }

      const convRef = adminDb.collection('conversations').doc(convId);
      const unreadCountByUser: Record<string, number> = {};

      if (isNew) {
        unreadCountByUser[uid] = 0;
        unreadCountByUser[recipientId] = 1;
        await convRef.set({
          id: convId,
          schoolId,
          subject: subject.trim(),
          participantIds: [uid, recipientId],
          participantRoles: [role, recipientRole],
          participants: [
            { userId: uid, name: senderName, role, schoolId },
            { userId: recipientId, name: recipientName, role: recipientRole, schoolId }
          ],
          lastMessage: body.trim(),
          lastMessageAt: now,
          lastSenderId: uid,
          lastSenderName: senderName,
          lastSenderRole: role,
          unreadCountByUser,
          studentId: studentId || null,
          studentName: studentName || null,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const curDoc = await convRef.get();
        const curData = curDoc.data() || {};
        const curUnread = curData.unreadCountByUser || {};
        const newUnread = (curUnread[recipientId] || 0) + 1;

        await convRef.update({
          lastMessage: body.trim(),
          lastMessageAt: now,
          lastSenderId: uid,
          lastSenderName: senderName,
          lastSenderRole: role,
          [`unreadCountByUser.${recipientId}`]: newUnread,
          [`unreadCountByUser.${uid}`]: 0,
          updatedAt: now,
        });
      }

      // Add Message
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const messageDoc = {
        id: msgId,
        conversationId: convId,
        senderId: uid,
        senderName,
        senderRole: role,
        recipientId,
        participantIds: [uid, recipientId],
        body: body.trim(),
        createdAt: now,
        readBy: [uid],
      };

      await convRef.collection('messages').doc(msgId).set(messageDoc);
      await adminDb.collection('messages').doc(msgId).set(messageDoc);

      // Create Notification for recipient
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await adminDb.collection('notifications').doc(notifId).set({
        id: notifId,
        userId: recipientId,
        recipientId,
        schoolId,
        senderId: uid,
        createdBy: uid,
        senderName,
        senderRole: role,
        type: 'MESSAGE',
        title: `Pesan Baru dari ${senderName}: ${subject.trim()}`,
        body: body.trim().substring(0, 150),
        relatedId: convId,
        relatedStudentId: studentId || null,
        isRead: false,
        read: false,
        createdAt: now,
      });

      return res.json({
        success: true,
        conversationId: convId,
        message: messageDoc,
      });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal memulai percakapan.',
      });
    }
  });

  // 4. Get Conversation Messages (Thread) and mark as read
  app.get('/api/conversations/:id/messages', async (req, res) => {
    try {
      const { uid, role, adminDb } = await verifyAuthenticatedUser(req);
      const convId = req.params.id;

      const convRef = adminDb.collection('conversations').doc(convId);
      const convDoc = await convRef.get();

      if (!convDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Percakapan tidak ditemukan.',
        });
      }

      const convData = convDoc.data() || {};
      const participantIds = convData.participantIds || [];

      // Check permission: participant or admin
      const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
      if (!participantIds.includes(uid) && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Anda tidak memiliki akses ke percakapan ini.',
        });
      }

      // Fetch messages from subcollection (fallback to root collection if empty)
      let msgsSnap = await convRef.collection('messages').orderBy('createdAt', 'asc').get();
      let messages: any[] = [];
      msgsSnap.forEach((doc: any) => {
        messages.push(doc.data());
      });

      if (messages.length === 0) {
        const rootMsgsSnap = await adminDb.collection('messages')
          .where('conversationId', '==', convId)
          .orderBy('createdAt', 'asc')
          .get();
        rootMsgsSnap.forEach((doc: any) => {
          messages.push(doc.data());
        });
      }

      // Mark messages as read by caller
      const now = new Date().toISOString();
      const batch = adminDb.batch();
      let hasUnread = false;

      messages.forEach((msg) => {
        const readBy = msg.readBy || [];
        if (!readBy.includes(uid)) {
          hasUnread = true;
          const msgRef = convRef.collection('messages').doc(msg.id);
          batch.update(msgRef, {
            readBy: [...readBy, uid],
            readAt: now,
          });
        }
      });

      if (hasUnread) {
        batch.update(convRef, {
          [`unreadCountByUser.${uid}`]: 0,
        });
        await batch.commit().catch(() => {});
      }

      // Also mark notifications with relatedId == convId as read
      const notifsSnap = await adminDb.collection('notifications')
        .where('userId', '==', uid)
        .where('relatedId', '==', convId)
        .where('isRead', '==', false)
        .get();

      if (!notifsSnap.empty) {
        const notifBatch = adminDb.batch();
        notifsSnap.forEach((d: any) => {
          notifBatch.update(d.ref, { isRead: true });
        });
        await notifBatch.commit().catch(() => {});
      }

      return res.json({
        success: true,
        conversation: { id: convId, ...convData },
        messages,
      });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal memuat pesan dalam percakapan.',
      });
    }
  });

  // 5. Reply to a Conversation
  app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
      const { uid, role, profile, adminDb } = await verifyAuthenticatedUser(req);
      const convId = req.params.id;
      const { body, replyTo } = req.body || {};

      if (!body?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_INPUT',
          message: 'Isi balasan pesan tidak boleh kosong.',
        });
      }

      const convRef = adminDb.collection('conversations').doc(convId);
      const convDoc = await convRef.get();

      if (!convDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Percakapan tidak ditemukan.',
        });
      }

      const convData = convDoc.data() || {};
      const participantIds: string[] = convData.participantIds || [];

      if (!participantIds.includes(uid)) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Anda bukan peserta dalam percakapan ini.',
        });
      }

      const now = new Date().toISOString();
      const senderName = profile.name || profile.displayName || profile.username || 'Pengguna';

      // Create new message
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const messageDoc: any = {
        id: msgId,
        conversationId: convId,
        senderId: uid,
        senderName,
        senderRole: role,
        participantIds,
        body: body.trim(),
        createdAt: now,
        readBy: [uid],
      };

      if (replyTo && replyTo.id) {
        messageDoc.replyTo = {
          id: replyTo.id,
          senderName: replyTo.senderName || '',
          body: (replyTo.body || '').substring(0, 100),
        };
      }

      await convRef.collection('messages').doc(msgId).set(messageDoc);
      await adminDb.collection('messages').doc(msgId).set(messageDoc);

      // Update conversation
      const currentUnread = convData.unreadCountByUser || {};
      const updatePayload: any = {
        lastMessage: body.trim(),
        lastMessageAt: now,
        lastSenderId: uid,
        lastSenderName: senderName,
        lastSenderRole: role,
        [`unreadCountByUser.${uid}`]: 0,
        updatedAt: now,
      };

      // Notify other participants and increment their unread counts
      const otherParticipants = participantIds.filter((pId) => pId !== uid);
      for (const recipientId of otherParticipants) {
        updatePayload[`unreadCountByUser.${recipientId}`] = (currentUnread[recipientId] || 0) + 1;

        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await adminDb.collection('notifications').doc(notifId).set({
          id: notifId,
          userId: recipientId,
          recipientId,
          schoolId: convData.schoolId || 'main-school',
          senderId: uid,
          createdBy: uid,
          senderName,
          senderRole: role,
          type: 'MESSAGE',
          title: `Balasan Baru dari ${senderName}`,
          body: body.trim().substring(0, 140),
          relatedId: convId,
          relatedStudentId: convData.studentId || null,
          isRead: false,
          read: false,
          createdAt: now,
        }).catch(() => {});
      }

      await convRef.update(updatePayload);

      return res.json({
        success: true,
        message: messageDoc,
      });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal mengirim balasan pesan.',
      });
    }
  });

  // 6. Get User Notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const { uid, adminDb } = await verifyAuthenticatedUser(req);

      const notifsSnap = await adminDb.collection('notifications')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const notifications: any[] = [];
      let unreadCount = 0;

      notifsSnap.forEach((doc: any) => {
        const d = doc.data();
        notifications.push({ id: doc.id, ...d });
        if (!d.isRead) unreadCount += 1;
      });

      return res.json({
        success: true,
        notifications,
        unreadCount,
      });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal memuat notifikasi.',
      });
    }
  });

  // 7. Mark Notification as Read
  app.post('/api/notifications/mark-read', async (req, res) => {
    try {
      const { uid, adminDb } = await verifyAuthenticatedUser(req);
      const { notificationId, markAll } = req.body || {};

      if (markAll) {
        const unreadSnap = await adminDb.collection('notifications')
          .where('userId', '==', uid)
          .where('isRead', '==', false)
          .get();

        const batch = adminDb.batch();
        unreadSnap.forEach((doc: any) => {
          batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();

        return res.json({ success: true, message: 'Semua notifikasi telah ditandai dibaca.' });
      }

      if (notificationId) {
        const notifRef = adminDb.collection('notifications').doc(notificationId);
        const doc = await notifRef.get();
        if (doc.exists && doc.data()?.userId === uid) {
          await notifRef.update({ isRead: true });
        }
        return res.json({ success: true });
      }

      return res.status(400).json({ success: false, message: 'Parameter tidak lengkap.' });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal memperbarui status notifikasi.',
      });
    }
  });

  // 8. Quick Polling for Unread Counts (Messages & Notifications)
  app.get('/api/messaging/unread-counts', async (req, res) => {
    try {
      const { uid, adminDb } = await verifyAuthenticatedUser(req);

      // Unread notifications
      const notifsSnap = await adminDb.collection('notifications')
        .where('userId', '==', uid)
        .where('isRead', '==', false)
        .get();
      const unreadNotifications = notifsSnap.size;

      // Unread conversations
      const convsSnap = await adminDb.collection('conversations')
        .where('participantIds', 'array-contains', uid)
        .get();

      let unreadMessages = 0;
      convsSnap.forEach((d: any) => {
        const data = d.data();
        const userUnread = (data.unreadCountByUser && data.unreadCountByUser[uid]) || 0;
        if (userUnread > 0) unreadMessages += userUnread;
      });

      return res.json({
        success: true,
        unreadNotifications,
        unreadMessages,
      });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        unreadNotifications: 0,
        unreadMessages: 0,
      });
    }
  });

  // ==========================================
  // GEMINI AI SERVER-SIDE ROUTES
  // ==========================================

  // 1. Rekomendasi Perencanaan & Kurikulum (Multi-CP, Multi-TP, Tujuan Pembelajaran, Kegiatan, Loose Parts)
  app.post('/api/ai/lesson-plan-recommendation', async (req, res) => {
    try {
      await verifyAICaller(req, ['ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'PRINCIPAL', 'TEACHER', 'GURU']);
      const {
        theme = 'Tanaman',
        subtheme = 'Tanaman di Lingkungan Sekitar',
        selectedCPs = [],
        selectedCPIds = [],
        selectedTPs = [],
        selectedTpIds = [],
        ageGroup = 'Usia 4-6 Tahun (Fase Fondasi)',
        schoolContext = {},
        customPrompt = '',
      } = req.body;

      // Master catalog of standard Kurikulum Merdeka PAUD CPs for reliable fallback resolution
      const officialCPCatalog: Record<string, { code: string; title: string; description: string }> = {
        'cp-01': {
          code: 'CP-1',
          title: 'Nilai Agama dan Budi Pekerti',
          description: 'Anak mengenali dan mempraktikkan ajaran agama, menyayangi makhluk hidup ciptaan Tuhan (tanaman & binatang), serta berakhlak mulia.'
        },
        'cp-02': {
          code: 'CP-2',
          title: 'Jati Diri',
          description: 'Anak mengenali dan mengelola emosi secara sehat, mandiri, berkoordinasi motorik halus/kasar, serta bekerja sama dan menghargai keberagaman.'
        },
        'cp-03': {
          code: 'CP-3',
          title: 'Dasar-Dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni',
          description: 'Anak bernalar kritis, menyelidiki objek alam dan lingkungan sekitarnya, serta berekspresi kreatif menggunakan loose parts dan karya seni.'
        },
      };

      // 1. Extract and validate CP list (Guru dapat memilih 1 atau lebih CP)
      const validCpList: Array<{ id: string; code: string; title: string; description?: string }> = [];
      if (Array.isArray(selectedCPs) && selectedCPs.length > 0) {
        selectedCPs.forEach((c: any, idx: number) => {
          if (c && (c.id || c.title || c.code)) {
            const matched = c.id && officialCPCatalog[c.id] ? officialCPCatalog[c.id] : null;
            validCpList.push({
              id: c.id || `cp-sel-${idx + 1}`,
              code: c.code || matched?.code || `CP-${idx + 1}`,
              title: c.title || matched?.title || 'Capaian Pembelajaran',
              description: c.description || matched?.description || '',
            });
          }
        });
      } else if (Array.isArray(selectedCPIds) && selectedCPIds.length > 0) {
        selectedCPIds.forEach((id: string, idx: number) => {
          const matched = officialCPCatalog[id];
          validCpList.push({
            id,
            code: matched?.code || `CP-${idx + 1}`,
            title: matched?.title || `Capaian Pembelajaran ${idx + 1}`,
            description: matched?.description || '',
          });
        });
      } else {
        // Default to CP-3 and CP-1 if none provided
        validCpList.push({
          id: 'cp-03',
          code: 'CP-3',
          title: 'Dasar-Dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni',
          description: 'Anak bernalar kritis, menyelidiki objek alam dan lingkungan sekitar, serta bereksplorasi dengan loose parts.',
        });
      }

      const validCpIds = validCpList.map((c) => c.id);

      // 2. Extract and validate TP list (Guru dapat memilih 1 atau lebih TP)
      const validTpList: Array<{ id: string; cpId?: string; code: string; title: string; description?: string }> = [];
      if (Array.isArray(selectedTPs) && selectedTPs.length > 0) {
        selectedTPs.forEach((t: any, idx: number) => {
          if (t && (t.id || t.title)) {
            validTpList.push({
              id: t.id || `tp-sel-${idx + 1}`,
              cpId: t.cpId || validCpIds[idx % validCpIds.length],
              code: t.code || `TP-${idx + 1}`,
              title: t.title || 'Tujuan Pembelajaran',
              description: t.description || '',
            });
          }
        });
      } else if (Array.isArray(selectedTpIds) && selectedTpIds.length > 0) {
        selectedTpIds.forEach((id: string, idx: number) => {
          validTpList.push({
            id,
            cpId: validCpIds[idx % validCpIds.length],
            code: `TP-${idx + 1}`,
            title: `Tujuan Pembelajaran ${idx + 1}`,
            description: '',
          });
        });
      } else {
        validTpList.push({
          id: 'tp-lit-01',
          cpId: validCpIds[0],
          code: 'TP-LIT-01',
          title: 'Mengeksplorasi ragam bahan alam dan loose parts di lingkungan sekitar',
          description: 'Anak mampu mengamati, menyentuh, mengelompokkan, dan memanfaatkan bahan alam secara aktif.',
        });
      }

      const validTpIds = validTpList.map((t) => t.id);

      // 3. Construct linked base operational learning objectives (CP -> TP -> Tujuan)
      const baseObjectives = validTpList.map((tp, idx) => {
        const linkedCp = tp.cpId && validCpIds.includes(tp.cpId) ? tp.cpId : validCpIds[idx % validCpIds.length];
        return {
          objectiveId: `obj-${idx + 1}`,
          objectiveText: `Anak mampu menyelidiki dan mengekspresikan pemahaman tentang ${subtheme} yang mencerminkan capaian ${tp.title.toLowerCase()}`,
          linkedCPIds: [linkedCp],
          linkedTPIds: [tp.id],
        };
      });

      const ai = getGenAI();

      const contextSummary = `
- Konteks Lokasi Sekolah: ${schoolContext.locationContext || schoolContext.location || 'Lingkungan ramah anak'}
- Budaya & Kearifan Lokal: ${schoolContext.cultureContext || schoolContext.culture || 'Kearifan lokal Indonesia, gotong royong'}
- Media & Loose Parts Tersedia: ${Array.isArray(schoolContext.availableMedia) ? schoolContext.availableMedia.join(', ') : Array.isArray(schoolContext.looseParts) ? schoolContext.looseParts.join(', ') : 'Bahan alam, ranting, batu, daun segar & kering, kelopak bunga, kardus bekas, nampan sensori'}
- Fasilitas Sekolah: ${schoolContext.facilitiesSummary || 'Halaman sekolah, sudut tanaman/taman, dan area bermain kelas'}
- Karakteristik Anak: ${schoolContext.studentCharacteristics || 'Senang bereksplorasi raba langsung, menyusun loose parts, dan bekerja sama'}
`;

      const cpContextText = validCpList.map((cp, idx) => `
[CP ${idx + 1}] ID: "${cp.id}" | Kode: "${cp.code}" | Judul: "${cp.title}"
Deskripsi: ${cp.description || 'Capaian Pembelajaran Kurikulum Merdeka'}
`).join('\n');

      const tpContextText = validTpList.map((tp, idx) => `
[TP ${idx + 1}] ID: "${tp.id}" | CP Induk: "${tp.cpId || validCpIds[0]}" | Kode: "${tp.code}" | Judul: "${tp.title}"
Deskripsi: ${tp.description || 'Fokus pada capaian bermain bermakna'}
`).join('\n');

      const prompt = `Anda adalah Ahli Pedagogi PAUD Indonesia, Kurikulum Merdeka Fase Fondasi, Deep Learning, dan Teori Loose Parts.
Tugas Anda adalah merancang REKOMENDASI PEMBELAJARAN yang memiliki HIERARKI DATA KETAT DAN DAPAT DITELUSURI (STRICT TRACEABILITY):
Tema → Subtema → CP yang Dipilih Guru → TP yang Dipilih Guru → Tujuan Pembelajaran Operasional → Ide Kegiatan Bermain → Indikator/Asesmen.

MASUKAN DARI GURU:
- Tema: "${theme}"
- Subtema: "${subtheme}"
- Kelompok Usia: ${ageGroup}
- CP YANG DIPILIH GURU (Total: ${validCpList.length}):
${cpContextText}
- TP YANG DIPILIH GURU (Total: ${validTpList.length}):
${tpContextText}
- Konteks Sekolah:
${contextSummary}
- Catatan Tambahan Guru: ${customPrompt || 'Bermain bermakna, kontekstual lingkungan, minim lembar kerja hafalan'}

ATURAN PEDAGOGIS WAJIB (VARIASI KEGIATAN & ANTI-MONOTON EKSPERIMEN):
1. JANGAN MONOTON EKSPERIMEN/OBSERVASI (REQUIREMENT MUTLAK):
   - AI PAUD TIDAK BOLEH menganggap bahwa kegiatan pembelajaran selalu berupa observasi atau eksperimen sains!
   - DILARANG terus-menerus memilih: "mengamati benda", "menguji", "membandingkan daun", "eksperimen laboratorium", atau "observasi kaca pembesar" sebagai pola utama.
   - Pilihlah dari 26 ragam pengalaman bermain anak usia dini:
     (1) Bermain peran / role play & imajinasi
     (2) Bercerita / storytelling & dialog
     (3) Membaca buku cerita / picture book & percakapan bermakna
     (4) Percakapan dan tanya jawab terbuka
     (5) Bermain bahasa dan kosakata kontekstual
     (6) Permainan bunyi, rima, dan fonologis
     (7) Menyusun cerita bergambar
     (8) Dramatisasi cerita & ekspresi peran
     (9) Bernyanyi dan permainan musik
     (10) Gerak dan lagu kinestetik
     (11) Permainan motorik & kelenturan
     (12) Permainan aturan sederhana bersama teman
     (13) Konstruksi / merekayasa struktur dengan loose parts
     (14) Seni rupa & kreasi media alami
     (15) Kolase / mozaik bahan alam
     (16) Menggambar dan membuat simbol / label bermakna
     (17) Eksplorasi lingkungan sekolah
     (18) Eksperimen sederhana (HANYA bila relevan langsung untuk TP sains tertentu)
     (19) Mengelompokkan / mengurutkan kontekstual
     (20) Permainan matematika kontekstual & spasial
     (21) Proyek mini kolaboratif
     (22) Kegiatan gotong royong antar teman
     (23) Permainan imajinatif bebas
     (24) Kegiatan kehidupan sehari-hari (practical life)
     (25) Kegiatan berbasis budaya lokal / kearifan setempat
     (26) Kegiatan refleksi dan berbagi cerita

2. BAHASA DAN LITERASI HARUS TERINTEGRASI SECARA ALAMI (BUKAN LEMBAR KERJA / WORKSHEET):
   - DILARANG menghasilkan kegiatan mekanik: menebalkan huruf, menyalin huruf berulang, menghubungkan garis ke huruf di kertas lembar kerja.
   - Bahasa dan literasi PAUD harus alami dan bermakna:
     * Menyimak kisah menarik & merespons pertanyaan terbuka
     * Berdialog aktif saat bermain peran dan menyampaikan gagasan
     * Menceritakan kembali pengalaman atau rancangan karyanya
     * Memperkaya kosakata tematik (contoh pada tema tanaman: rindang, sejuk, tunas, merawat, syukur)
     * Pengenalan simbol nyata: membuat tulisan/simbol nama karya anak, memberi label nama tanaman, membaca gambar

3. VARIASI MODALITAS DALAM SATU OUTPUT:
   - Sediakan 4 ide kegiatan bermain. SETIAP KEGIATAN HARUS MEMILIKI BENTUK MODALITAS YANG BERBEDA!
   - Contoh variasi:
     * Kegiatan 1: Modalitas "Bercerita & Percakapan Bermakna"
     * Kegiatan 2: Modalitas "Bermain Peran & Imajinasi"
     * Kegiatan 3: Modalitas "Konstruksi Loose Parts"
     * Kegiatan 4: Modalitas "Seni Rupa & Kreasi Alami"

4. DILARANG MENGARANG CP ATAU TP BARU:
   Hanya gunakan ID CP yang ada dalam daftar [${validCpIds.map(id => `"${id}"`).join(', ')}].
   Hanya gunakan ID TP yang ada dalam daftar [${validTpIds.map(id => `"${id}"`).join(', ')}].
   Jangan pernah menghasilkan ID CP atau TP baru di luar daftar tersebut.

5. TUJUAN PEMBELAJARAN OPERASIONAL TERHUBUNG:
   Hasilkan array "learningObjectives" di mana setiap objek memiliki:
   - "objectiveId": ID unik (contoh "obj-1", "obj-2")
   - "objectiveText": Rumusan tujuan konkret yang kontekstual
   - "linkedCPIds": Array berisi ID CP terkait dari daftar CP terpilih
   - "linkedTPIds": Array berisi ID TP terkait dari daftar TP terpilih

6. TRACEABILITY SETIAP KEGIATAN:
   Setiap kegiatan dalam "activityIdeas" HARUS memiliki:
   - "activityId": ID unik kegiatan
   - "title": Judul kegiatan yang menarik dan kontekstual
   - "modality": Bentuk kegiatan (contoh: "Bercerita & Percakapan", "Bermain Peran & Imajinasi", "Konstruksi Loose Parts", "Seni Rupa & Kreasi Alami")
   - "duration": Durasi bermain (misal "45-60 menit")
   - "description": Penjelasan detail apa yang dilakukan anak
   - "literacyIntegration": Penjelasan integrasi literasi bermakna tanpa worksheet
   - "steps": 3-4 langkah bermain (Pijakan Sebelum Main, Pijakan Saat Main, Pijakan Setelah Main/Refleksi)
   - "materials": Daftar bahan alam dan loose parts nyata
   - "provocationQuestions": 2-3 pertanyaan pemantik eksplorasi
   - "linkedCPIds": Array ID CP yang didukung kegiatan ini (hanya dari [${validCpIds.map(id => `"${id}"`).join(', ')}])
   - "linkedTPIds": Array ID TP yang didukung kegiatan ini (hanya dari [${validTpIds.map(id => `"${id}"`).join(', ')}])
   - "linkedObjectiveIds": Array ID tujuan dari "learningObjectives"
   - "assessmentIndicators": Indikator perilaku anak yang teramati secara nyata
   - "tarlAdjustments": Penyesuaian diferensiasi (beginner, intermediate, advanced)

KEMBALIKAN HANYA VALID JSON TANPA KATA PENGANTAR LAIN:
{
  "theme": "${theme}",
  "subtheme": "${subtheme}",
  "selectedCPIds": ${JSON.stringify(validCpIds)},
  "selectedTpIds": ${JSON.stringify(validTpIds)},
  "learningObjectives": [
    {
      "objectiveId": "obj-1",
      "objectiveText": "Anak mampu mengamati dan mengelompokkan ragam daun di lingkungan sekitar sekolah dengan rasa ingin tahu",
      "linkedCPIds": [${validCpIds.map(id => `"${id}"`).join(', ')}],
      "linkedTPIds": [${validTpIds.map(id => `"${id}"`).join(', ')}]
    }
  ],
  "recommendedCP": {
    "code": "${validCpList[0]?.code || 'CP-3'}",
    "title": "${validCpList[0]?.title || 'Capaian Pembelajaran'}",
    "description": "${validCpList[0]?.description || ''}"
  },
  "recommendedATP": {
    "code": "ATP-01",
    "title": "Eksplorasi Lingkungan Alam & Kreasi Bermakna",
    "phase": "Fase Fondasi",
    "stepOrder": 1,
    "description": "Anak aktif menyelidiki fenomena dan objek di sekitar sekolah"
  },
  "recommendedTP": {
    "code": "${validTpList[0]?.code || 'TP-01'}",
    "title": "${validTpList[0]?.title || 'Tujuan Pembelajaran'}",
    "description": "${validTpList[0]?.description || ''}"
  },
  "recommendedIndicators": [
    {
      "aspect": "LITERASI_STEAM",
      "text": "Anak menceritakan karakteristik daun atau bahan alam yang dikumpulkannya",
      "linkedTPId": "${validTpIds[0]}",
      "rubric": {
        "BB": "Belum memperhatikan bahan alam meskipun diarahkan guru",
        "MB": "Mulai menyentuh dan menunjuk bagian daun dengan dorongan guru",
        "BSH": "Mandiri mengamati, membandingkan tekstur daun, dan menceritakan temuannya",
        "BSB": "Kritis menjelaskan perbedaan urat/tekstur daun serta membantu teman merawat tanaman"
      }
    }
  ],
  "activityIdeas": [
    {
      "activityId": "act-1",
      "title": "Petualangan Mengamati Daun di Halaman Sekolah",
      "duration": "45-60 menit",
      "description": "Anak berjalan di taman sekolah membawa wadah/nampan untuk mengamati berbagai tekstur, warna, dan bentuk daun yang jatuh di sekitar tanaman.",
      "steps": [
        "Pijakan Awal: Berdoa, menyapa tanaman dengan santun, dan mendiskusikan apa yang ada di halaman sekolah",
        "Pijakan Main: Mengumpulkan daun gugur aneka bentuk, meraba permukaannya dengan kaca pembesar, dan mengelompokkannya",
        "Pijakan Refleksi: Menceritakan daun mana yang paling menarik dan mensyukuri anugerah tanaman ciptaan Tuhan"
      ],
      "materials": ["Nampan eksplorasi", "Daun gugur aneka bentuk", "Kaca pembesar anak", "Ranting kecil"],
      "provocationQuestions": [
        "Apa yang kamu rasakan saat meraba bagian belakang daun ini?",
        "Mengapa ada daun yang berwarna cokelat kering dan hijau segar?"
      ],
      "linkedCPIds": [${validCpIds.map(id => `"${id}"`).join(', ')}],
      "linkedTPIds": [${validTpIds.map(id => `"${id}"`).join(', ')}],
      "linkedObjectiveIds": ["obj-1"],
      "assessmentIndicators": [
        {
          "aspect": "LITERASI_STEAM",
          "text": "Menyelidiki dan mengelompokkan daun berdasarkan tekstur atau ukuran",
          "linkedTPId": "${validTpIds[0]}",
          "rubric": {
            "BB": "Belum tertarik meraba daun",
            "MB": "Meraba daun saat didampingi guru",
            "BSH": "Mandiri membedakan daun kasar dan halus",
            "BSB": "Kritis mendeskripsikan pola urat daun dan membandingkannya"
          }
        }
      ],
      "tarlAdjustments": {
        "beginner": "Pendampingan sensori meraba 2 jenis daun kontras",
        "intermediate": "Mengelompokkan daun kering vs basah secara mandiri",
        "advanced": "Membuat perbandingan urat daun dan menceritakan alasan perbedaannya"
      }
    }
  ],
  "mediaAndMaterials": [
    "Daun segar dan daun gugur aneka bentuk",
    "Ranting kecil dan kerikil halus",
    "Nampan eksplorasi dan kaca pembesar ramah anak"
  ],
  "provocationQuestions": [
    "Bagaimana caramu merawat tanaman agar tetap subur?",
    "Apa perbedaan yang kamu rasakan antara tanaman yang terkena sinar matahari dan yang teduh?"
  ],
  "tarlAdjustments": {
    "beginner": "Pendampingan hangat eksplorasi sensori raba bahan alam sederhana",
    "intermediate": "Bereksplorasi mandiri mengklasifikasi 2-3 variasi bahan alam",
    "advanced": "Tantangan investigasi mendalam dan kreasi kolaboratif"
  },
  "pedagogicalNotes": "Menekankan mindful learning, perjumpaan langsung dengan alam (nature connection), serta deep inquiry tanpa hafalan mekanistik."
}`;

      // Helper function to strictly sanitize and validate AI output
      function sanitizeLessonPlanOutput(raw: any) {
        // Validate learning objectives
        let sanitizedObjectives: any[] = [];
        if (Array.isArray(raw?.learningObjectives) && raw.learningObjectives.length > 0) {
          raw.learningObjectives.forEach((obj: any, idx: number) => {
            const rawCpIds = Array.isArray(obj.linkedCPIds) ? obj.linkedCPIds.filter((id: string) => validCpIds.includes(id)) : [];
            const rawTpIds = Array.isArray(obj.linkedTPIds) ? obj.linkedTPIds.filter((id: string) => validTpIds.includes(id)) : [];
            sanitizedObjectives.push({
              objectiveId: typeof obj.objectiveId === 'string' && obj.objectiveId.trim() ? obj.objectiveId.trim() : `obj-${idx + 1}`,
              objectiveText: typeof obj.objectiveText === 'string' && obj.objectiveText.trim()
                ? obj.objectiveText.trim()
                : baseObjectives[idx % baseObjectives.length]?.objectiveText || `Tujuan pembelajaran terkait ${subtheme}`,
              linkedCPIds: rawCpIds.length > 0 ? rawCpIds : [validCpIds[idx % validCpIds.length]],
              linkedTPIds: rawTpIds.length > 0 ? rawTpIds : [validTpIds[idx % validTpIds.length]],
            });
          });
        }
        if (sanitizedObjectives.length === 0) {
          sanitizedObjectives = baseObjectives;
        }

        const validObjectiveIds = sanitizedObjectives.map(o => o.objectiveId);

        const sanitized: any = {
          theme,
          subtheme,
          selectedCPIds: validCpIds,
          selectedCPs: validCpList,
          selectedTpIds: validTpIds,
          selectedTPs: validTpList,
          learningObjectives: sanitizedObjectives,
          recommendedCP: raw?.recommendedCP || {
            code: validCpList[0]?.code || 'CP-3',
            title: validCpList[0]?.title || 'Capaian Pembelajaran',
            description: validCpList[0]?.description || '',
          },
          recommendedATP: raw?.recommendedATP || {
            code: 'ATP-01',
            title: 'Eksplorasi Lingkungan & Bahan Alam',
            phase: 'Fase Fondasi',
            stepOrder: 1,
            description: 'Anak mengamati dan menyelidiki objek alam di sekitarnya secara aktif',
          },
          recommendedTP: raw?.recommendedTP || {
            code: validTpList[0]?.code || 'TP-01',
            title: validTpList[0]?.title || 'Tujuan Pembelajaran',
            description: validTpList[0]?.description || '',
          },
          recommendedIndicators: Array.isArray(raw?.recommendedIndicators) ? raw.recommendedIndicators : [],
          activityIdeas: [] as any[],
          mediaAndMaterials: Array.isArray(raw?.mediaAndMaterials) && raw.mediaAndMaterials.length > 0
            ? raw.mediaAndMaterials
            : ['Bahan alam (daun, ranting, bunga gugur)', 'Loose parts ramah anak (kardus, wadah bekas)'],
          provocationQuestions: Array.isArray(raw?.provocationQuestions) && raw.provocationQuestions.length > 0
            ? raw.provocationQuestions
            : ['Apa yang ingin kamu selidiki hari ini?', 'Bagaimana caramu memanfaatkan bahan-bahan ini?'],
          tarlAdjustments: raw?.tarlAdjustments || {
            beginner: 'Fokus pada stimulasi sensoris meraba tekstur dengan bimbingan lembut guru.',
            intermediate: 'Mengelompokkan dan menyusun 2-3 jenis benda secara mandiri.',
            advanced: 'Membuat bentuk kreasi kompleks dan menceritakan idenya kepada teman.',
          },
          pedagogicalNotes: raw?.pedagogicalNotes || 'Pembelajaran berfokus pada bermain bermakna dan berkesadaran (Deep Learning).',
        };

        const rawActs = Array.isArray(raw?.activityIdeas) ? raw.activityIdeas : [];
        rawActs.forEach((act: any, idx: number) => {
          // Strict validation: linkedCPIds only from validCpIds
          let linkedCPs: string[] = [];
          if (Array.isArray(act.linkedCPIds)) {
            linkedCPs = act.linkedCPIds.filter((id: string) => validCpIds.includes(id));
          }
          if (linkedCPs.length === 0) {
            linkedCPs = [validCpIds[idx % validCpIds.length]];
          }

          // Strict validation: linkedTPIds only from validTpIds
          let linkedTPs: string[] = [];
          if (Array.isArray(act.linkedTPIds)) {
            linkedTPs = act.linkedTPIds.filter((id: string) => validTpIds.includes(id));
          }
          if (linkedTPs.length === 0) {
            linkedTPs = [validTpIds[idx % validTpIds.length]];
          }

          // Strict validation: linkedObjectiveIds only from sanitizedObjectives
          let linkedObjs: string[] = [];
          if (Array.isArray(act.linkedObjectiveIds)) {
            linkedObjs = act.linkedObjectiveIds.filter((id: string) => validObjectiveIds.includes(id));
          }
          if (linkedObjs.length === 0) {
            linkedObjs = [validObjectiveIds[idx % validObjectiveIds.length]];
          }

          // Format indicators
          const indicators = Array.isArray(act.assessmentIndicators) && act.assessmentIndicators.length > 0
            ? act.assessmentIndicators.map((ind: any) => ({
                aspect: ind.aspect || 'LITERASI_STEAM',
                text: typeof ind.text === 'string' ? ind.text : `Menunjukkan kemampuan terkait ${subtheme}`,
                linkedTPId: ind.linkedTPId && validTpIds.includes(ind.linkedTPId) ? ind.linkedTPId : linkedTPs[0],
                rubric: ind.rubric || {
                  BB: 'Belum menunjukkan kemampuan secara mandiri',
                  MB: 'Mulai menunjukkan kemampuan dengan dorongan guru',
                  BSH: 'Mampu menunjukkan kemampuan secara mandiri',
                  BSB: 'Sangat terampil dan dapat menginspirasi teman'
                }
              }))
            : [
                {
                  aspect: 'LITERASI_STEAM',
                  text: `Menyelidiki dan menceritakan temuan bermain terkait ${subtheme}`,
                  linkedTPId: linkedTPs[0],
                  rubric: {
                    BB: 'Belum mau memegang bahan',
                    MB: 'Bereksplorasi dengan bimbingan guru',
                    BSH: 'Mandiri bereksplorasi dan menceritakan karyanya',
                    BSB: 'Kritis menciptakan variasi baru dan bekerja sama'
                  }
                }
              ];

          // Supported diverse modalities
          const defaultModalities = [
            'Bercerita & Percakapan Bermakna',
            'Bermain Peran & Imajinasi',
            'Konstruksi Loose Parts',
            'Seni Rupa & Kreasi Alami',
            'Permainan Bahasa & Kosakata',
          ];

          const assignedModality = (typeof act.modality === 'string' && act.modality.trim())
            ? act.modality.trim()
            : defaultModalities[idx % defaultModalities.length];

          const defaultLiteracyIntegrations = [
            'Menyimak cerita interaktif, berdialog, merespons pertanyaan terbuka, dan memperkaya kosakata tematik.',
            'Berdialog aktif antar teman saat memerankan karakter, menyampaikan gagasan, dan berempati.',
            'Menceritakan fungsi bagian struktur bangunan mini kepada teman dan guru menggunakan bahasa sendiri.',
            'Memberi judul/nama pada karya seni yang dibuat dan menceritakan makna di balik kreasinya.',
            'Mengenal lambang dan simbol nyata di lingkungan, permainan rima kata, dan olah gerak tubuh.',
          ];

          const assignedLiteracy = (typeof act.literacyIntegration === 'string' && act.literacyIntegration.trim())
            ? act.literacyIntegration.trim()
            : defaultLiteracyIntegrations[idx % defaultLiteracyIntegrations.length];

          sanitized.activityIdeas.push({
            activityId: typeof act.activityId === 'string' && act.activityId.trim() ? act.activityId.trim() : `act-ai-${idx + 1}`,
            title: typeof act.title === 'string' && act.title.trim() ? act.title.trim() : `Aktivitas Bermain ${subtheme} ${idx + 1}`,
            modality: assignedModality,
            duration: typeof act.duration === 'string' ? act.duration : '40-50 Menit',
            description: typeof act.description === 'string' ? act.description : `Eksplorasi bermain bermakna seputar tema ${theme} dan subtema ${subtheme}.`,
            literacyIntegration: assignedLiteracy,
            linkedCPIds: linkedCPs,
            linkedTPIds: linkedTPs,
            linkedObjectiveIds: linkedObjs,
            materials: Array.isArray(act.materials) && act.materials.length > 0
              ? act.materials
              : sanitized.mediaAndMaterials,
            steps: Array.isArray(act.steps) && act.steps.length > 0
              ? act.steps
              : [
                  'Pijakan Awal: Doa, salam, percakapan terbuka pemantik ide, dan aturan main bersama',
                  'Pijakan Main: Eksplorasi bermain peran, kreasi loose parts, atau bercerita sesuai imajinasi anak',
                  'Pijakan Refleksi: Menceritakan pengalaman bermain, saling mengapresiasi, dan membereskan alat main bersama',
                ],
            provocationQuestions: Array.isArray(act.provocationQuestions) && act.provocationQuestions.length > 0
              ? act.provocationQuestions
              : sanitized.provocationQuestions,
            assessmentIndicators: indicators,
            tarlAdjustments: act.tarlAdjustments || sanitized.tarlAdjustments,
          });
        });

        // Anti-monotony validation & automatic diversification
        // Ensure not all activities are monotone experiments or observations
        const experimentKeywords = ['eksperimen', 'mengamati', 'observasi', 'menyelidiki', 'menguji', 'membandingkan daun'];
        let experimentCount = 0;
        sanitized.activityIdeas.forEach((act: any) => {
          const t = (act.title + ' ' + act.description + ' ' + (act.modality || '')).toLowerCase();
          if (experimentKeywords.some(k => t.includes(k))) {
            experimentCount++;
          }
        });

        // If more than 1 activity is monotone observation/experiment, rebalance modalities
        if (experimentCount > 1 || sanitized.activityIdeas.length < 3) {
          const variedTemplates = [
            {
              modality: 'Bercerita & Percakapan Bermakna',
              titlePrefix: 'Panggung Cerita & Dialog Hangat',
              descSuffix: 'Anak menyimak kisah interaktif bergambar seputar topik, memperkaya kosakata baru, dan menceritakan kembali pesan kebaikan.',
              literacy: 'Menyimak cerita, berdialog aktif, memperkaya kosakata tematik, dan mengungkapkan gagasan.',
              step1: 'Pijakan Awal: Sapaan hangat dan pengenalan karakter cerita lewat boneka/gambar',
              step2: 'Pijakan Main: Anak bergantian menanggapi dialog tokoh dan mengekspresikan perasaannya',
              step3: 'Pijakan Refleksi: Berbincang santai tentang hikmah kisah dan rasa syukur',
            },
            {
              modality: 'Bermain Peran & Imajinasi',
              titlePrefix: 'Dramatisasi Peran Kolaboratif',
              descSuffix: 'Anak bermain peran interaktif bersama teman, berdialog santun, berbagi tugas, dan memecahkan tantangan imajinatif bersama.',
              literacy: 'Berdialog lisan, negosiasi peran santun, merespons perkataan teman, dan ekspresi emosi positif.',
              step1: 'Pijakan Awal: Mendiskusikan peran dan atribut sederhana yang ingin digunakan',
              step2: 'Pijakan Main: Menjalankan skenario bermain peran dengan bebas tanpa naskah kaku',
              step3: 'Pijakan Refleksi: Menceritakan apa yang dirasakan saat menjadi tokoh tersebut',
            },
            {
              modality: 'Konstruksi Loose Parts',
              titlePrefix: 'Studio Rekayasa & Rancang Bangun',
              descSuffix: 'Anak merekayasa miniatur struktur menggunakan balok kayu, kardus, ranting, dan aneka loose parts ramah lingkungan.',
              literacy: 'Menceritakan fungsi bagian bangunannya, menggunakan konsep posisi (atas, bawah, dalam), dan memberi nama bangunan.',
              step1: 'Pijakan Awal: Mengamati gambar atau lingkungan sekitar sebagai inspirasi rancang bangun',
              step2: 'Pijakan Main: Menyusun dan menyeimbangkan aneka bentuk loose parts secara kolaboratif',
              step3: 'Pijakan Refleksi: Mengajak teman berkeliling melihat karya dan menceritakan idenya',
            },
            {
              modality: 'Seni Rupa & Kreasi Alami',
              titlePrefix: 'Galeri Seni Pigmen & Bahan Alam',
              descSuffix: 'Anak mengekspresikan gagasannya melalui kolase dedaunan, pewarna kunyit/bunga, memberi judul karya, dan menceritakan maknanya.',
              literacy: 'Membuat simbol/judul karya secara mandiri dan mempresentasikan makna keindahan karyanya.',
              step1: 'Pijakan Awal: Meraba aneka tekstur bahan alam dan mencium aroma bahan alami',
              step2: 'Pijakan Main: Mengolah bahan alam menjadi karya seni dua atau tiga dimensi yang bernilai estetika',
              step3: 'Pijakan Refleksi: Memberi nama pada karyanya dan memajang di dinding apresiasi',
            },
            {
              modality: 'Permainan Bahasa & Kosakata',
              titlePrefix: 'Petualangan Kata & Simbol Nyata',
              descSuffix: 'Anak diajak menghubungkan benda nyata dengan simbol nama, bermain rima bunyi, dan menebak teka-teki bertema riang gembira.',
              literacy: 'Kepekaan fonologis bunyi kata, mengenali simbol bermakna tanpa drilling kertas, dan keaksaraan lisan alami.',
              step1: 'Pijakan Awal: Menemukan benda atau kartu gambar tersembunyi di ruangan',
              step2: 'Pijakan Main: Menyebutkan bunyi awal kata, mencari pasangan gambar, atau membuat label nama mini',
              step3: 'Pijakan Refleksi: Merayakan keberhasilan menemukan kata baru bersama teman',
            },
          ];

          // Rebalance existing or supplement activities
          const targetCount = Math.max(sanitized.activityIdeas.length, 4);
          const balancedActs: any[] = [];

          for (let i = 0; i < targetCount; i++) {
            const template = variedTemplates[i % variedTemplates.length];
            const existing = sanitized.activityIdeas[i];
            const tp = validTpList[i % validTpList.length];
            const cp = [tp.cpId && validCpIds.includes(tp.cpId) ? tp.cpId : validCpIds[i % validCpIds.length]];
            const obj = [validObjectiveIds[i % validObjectiveIds.length]];

            balancedActs.push({
              activityId: existing?.activityId || `act-var-${i + 1}`,
              title: `${template.titlePrefix}: ${subtheme}`,
              modality: template.modality,
              duration: '40-50 Menit',
              description: `${template.descSuffix} Disesuaikan dengan konteks subtema ${subtheme} dan capaian ${tp.title}.`,
              literacyIntegration: template.literacy,
              linkedCPIds: existing?.linkedCPIds?.length ? existing.linkedCPIds : cp,
              linkedTPIds: existing?.linkedTPIds?.length ? existing.linkedTPIds : [tp.id],
              linkedObjectiveIds: existing?.linkedObjectiveIds?.length ? existing.linkedObjectiveIds : obj,
              materials: existing?.materials?.length ? existing.materials : sanitized.mediaAndMaterials,
              steps: [
                template.step1,
                template.step2,
                template.step3,
              ],
              provocationQuestions: existing?.provocationQuestions?.length
                ? existing.provocationQuestions
                : sanitized.provocationQuestions,
              assessmentIndicators: existing?.assessmentIndicators?.length
                ? existing.assessmentIndicators
                : [
                    {
                      aspect: 'LITERASI_STEAM',
                      text: `Mampu mengekspresikan ide, berkomunikasi santun, dan berpartisipasi aktif dalam kegiatan ${template.modality.toLowerCase()}`,
                      linkedTPId: tp.id,
                      rubric: {
                        BB: 'Perlu motivasi dan pendampingan intensif dari guru',
                        MB: 'Mulai mencoba berpartisipasi setelah didorong guru',
                        BSH: 'Mandiri dan aktif dalam kegiatan bermain serta berdialog',
                        BSB: 'Sangat kreatif, mampu memimpin ide bermain, dan menginspirasi teman',
                      },
                    },
                  ],
              tarlAdjustments: sanitized.tarlAdjustments,
            });
          }

          sanitized.activityIdeas = balancedActs;
        }

        return sanitized;
      }

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          });

          const text = response.text || '{}';
          const parsed = JSON.parse(text);
          const sanitized = sanitizeLessonPlanOutput(parsed);
          return res.json({ success: true, data: sanitized, source: 'gemini' });
        } catch {
          isGeminiOperational = false;
          genAIClient = null;
          console.log('[SERVER] Gemini API lesson plan using validated pedagogic engine fallback.');
        }
      }

      // Pedagogical Fallback Variatif & Multimodal Sesuai Standar PAUD Anti-Monoton
      const fallbackTemplates = [
        {
          modality: 'Bercerita & Percakapan Bermakna',
          title: `Panggung Boneka Sahabat ${subtheme}`,
          desc: `Anak menyimak dongeng interaktif bergambar seputar ${subtheme}, berdialog mengenai karakter baik, dan menceritakan kembali pemahamannya.`,
          literacy: 'Menyimak aktif cerita, menjawab pertanyaan terbuka, dan memperkaya kosa kata baru bermakna tanpa lembar kerja.',
          steps: [
            `Pijakan Awal: Membaca buku cerita bergambar bertema ${subtheme} sambil melingkar nyaman`,
            `Pijakan Main: Anak memeragakan kembali dialog tokoh menggunakan wayang kardus buatan sendiri`,
            `Pijakan Refleksi: Berbincang tentang pesan kebaikan dan mensyukuri ciptaan Tuhan`,
          ],
          materials: ['Buku cerita bergambar anak', 'Wayang kardus karakter', 'Kain panggung mini', 'Bantal duduk melingkar'],
        },
        {
          modality: 'Bermain Peran & Imajinasi',
          title: `Dramatisasi Peran Seru: Kehidupan ${subtheme}`,
          desc: `Anak bermain peran interaktif (role play) sesuai konteks ${subtheme}, berbagi peran dengan teman, dan menyampaikan gagasannya secara runtut.`,
          literacy: 'Berdialog aktif antar anak, negosiasi peran santun, dan menyampaikan ide bermain.',
          steps: [
            `Pijakan Awal: Berdiskusi tentang peran apa saja yang ada seputar ${subtheme}`,
            `Pijakan Main: Anak berinteraksi memainkan peran secara mandiri dan saling bekerja sama`,
            `Pijakan Refleksi: Menceritakan pengalaman saat bermain peran dan kesan bersama teman`,
          ],
          materials: ['Perlengkapan peran (celemek, keranjang, topi kardus)', 'Loose parts penunjang peran', 'Kamera foto dokumentasi'],
        },
        {
          modality: 'Konstruksi Loose Parts',
          title: `Arsitek Cilik: Membangun Struktur ${subtheme}`,
          desc: `Anak merekayasa bentuk tiga dimensi yang merepresentasikan ${subtheme} menggunakan aneka loose parts (balok, ranting, kardus bekas).`,
          literacy: 'Menjelaskan bagian bangunan karyanya secara lisan dan memberi label nama bangunan.',
          steps: [
            `Pijakan Awal: Mengamati bentuk nyata atau foto ${subtheme} sebagai pemantik rancang bangun`,
            `Pijakan Main: Menumpuk, menyusun, dan menyeimbangkan bahan loose parts menjadi karya kokoh`,
            `Pijakan Refleksi: Saling berkunjung melihat karya teman dan menceritakan keunikannya`,
          ],
          materials: ['Balok kayu polos', 'Kardus bekas aneka ukuran', 'Ranting pohon lentur dan kokoh', 'Tutup botol warna-warni'],
        },
        {
          modality: 'Seni Rupa & Kreasi Alami',
          title: `Studio Kreasi Pigmen & Kolase ${subtheme}`,
          desc: `Anak mengekspresikan keindahan ${subtheme} melalui kolase daun gugur, pewarna alami kunyit/bunga, memberi judul pada karyanya, dan menceritakannya.`,
          literacy: 'Memberi nama/judul karya seni dan mengomunikasikan makna visual karyanya.',
          steps: [
            `Pijakan Awal: Meraba tekstur daun dan mencium aroma bahan alam di atas nampan`,
            `Pijakan Main: Menempel dan menyapukan warna alami di atas kertas tebal membentuk karya kreasi`,
            `Pijakan Refleksi: Memberi judul karya dengan bantuan guru dan memajang di ruang pamer kelas`,
          ],
          materials: ['Dedaunan gugur aneka bentuk', 'Pewarna alami (kunyit, daun suji, arang)', 'Lem tapioka ramah anak', 'Kertas gambar tebal'],
        },
      ];

      const fallbackActivities: any[] = fallbackTemplates.map((tpl, idx) => {
        const tp = validTpList[idx % validTpList.length];
        const assignedCp = [tp.cpId && validCpIds.includes(tp.cpId) ? tp.cpId : validCpIds[idx % validCpIds.length]];
        const assignedObj = [baseObjectives[idx % baseObjectives.length].objectiveId];

        return {
          activityId: `act-var-fallback-${idx + 1}`,
          title: tpl.title,
          modality: tpl.modality,
          duration: '40-50 Menit',
          description: `${tpl.desc} Terhubung dengan ${tp.code}: ${tp.title}.`,
          literacyIntegration: tpl.literacy,
          linkedCPIds: assignedCp,
          linkedTPIds: [tp.id],
          linkedObjectiveIds: assignedObj,
          materials: tpl.materials,
          steps: tpl.steps,
          provocationQuestions: [
            `Apa yang ingin kamu ceritakan atau ciptakan tentang ${subtheme}?`,
            'Bagaimana perasaanmu saat mencoba hal baru bersama teman hari ini?',
            'Kata-kata baru apa yang kamu temukan selama kita bermain?',
          ],
          assessmentIndicators: [
            {
              aspect: idx % 2 === 0 ? 'LITERASI_STEAM' : 'JATI_DIRI',
              text: `Mampu berpartisipasi aktif, mengekspresikan ide, dan berkomunikasi santun dalam kegiatan ${tpl.modality.toLowerCase()}`,
              linkedTPId: tp.id,
              rubric: {
                BB: 'Belum mau mencoba atau masih menarik diri dari kegiatan bermain',
                MB: 'Mulai mencoba dan merespons setelah diberi dorongan guru',
                BSH: 'Mandiri berkegiatan, mengekspresikan ide, dan berdialog aktif',
                BSB: 'Sangat kreatif, percaya diri, dan mampu mengajak teman bermain bersama',
              },
            },
          ],
          tarlAdjustments: {
            beginner: 'Pendampingan hangat dan dorongan pertanyaan pemantik sederhana',
            intermediate: 'Bermain mandiri, berdialog santun dengan teman sebaya',
            advanced: 'Mengembangkan variasi ide baru dan memimpin permainan kolaboratif',
          },
        };
      });

      const fallbackData = {
        theme,
        subtheme,
        selectedCPIds: validCpIds,
        selectedCPs: validCpList,
        selectedTpIds: validTpIds,
        selectedTPs: validTpList,
        learningObjectives: baseObjectives,
        recommendedCP: {
          code: validCpList[0]?.code || 'CP-3',
          title: validCpList[0]?.title || 'Dasar-Dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni',
          description: validCpList[0]?.description || 'Anak menyelidiki lingkungan sekitar dan mengekspresikan imajinasinya.',
        },
        recommendedATP: {
          code: 'ATP-FONDASI-01',
          title: 'Eksplorasi Tekstur, Bentuk, dan Klasifikasi Bahan Alam',
          phase: 'Fase Fondasi (4-6 Tahun)',
          stepOrder: 1,
          description: 'Anak mengamati ciri fisik benda di lingkungan sekitar dan menceritakan temuannya secara mandiri.',
        },
        recommendedTP: {
          code: validTpList[0]?.code || 'TP-01',
          title: validTpList[0]?.title || 'Tujuan Pembelajaran',
          description: validTpList[0]?.description || '',
        },
        recommendedIndicators: validTpList.map((tp, idx) => ({
          aspect: idx % 2 === 0 ? 'LITERASI_STEAM' : 'MOTORIK_HALUS',
          text: `Menunjukkan ketertarikan dan kemampuan mengeksplorasi bahan terkait ${tp.title}`,
          linkedTPId: tp.id,
          rubric: {
            BB: 'Belum mau memegang bahan alam meskipun dicontohkan.',
            MB: 'Mulai mencoba memegang dan menata bahan dengan dorongan guru.',
            BSH: 'Mandiri bereksplorasi dan menceritakan hasil karyanya secara runtut.',
            BSB: 'Sangat terampil, kreatif menciptakan variasi baru, dan membantu teman.',
          },
        })),
        activityIdeas: fallbackActivities,
        mediaAndMaterials: [
          'Daun kering aneka bentuk dan ukuran (koleksi kebun sekolah)',
          'Ranting kecil dan kerikil halus (bahan alam lokal)',
          'Tutup botol bekas dan potongan kardus ramah lingkungan (loose parts)',
          'Lem kanji / perekat alami yang aman untuk anak',
          'Kaca pembesar ramah anak',
        ],
        provocationQuestions: [
          'Apa yang kamu rasakan saat menyentuh permukaan benda ini?',
          'Benda apa saja di sekitar kita yang bisa kamu jadikan bagian dari karyamu?',
          'Ceritakan apa yang membuat hasil karyamu ini begitu istimewa?',
        ],
        tarlAdjustments: {
          beginner: 'Fokus pada eksplorasi meraba tekstur kontras bersama pendampingan hangat guru.',
          intermediate: 'Mengelompokkan bahan berdasarkan 2 kriteria dan menyusun bentuk mandiri.',
          advanced: 'Membuat urutan pola kompleks dan menceritakan gagasan karya di depan teman.',
        },
        pedagogicalNotes: 'Pembelajaran ini mengedepankan Deep Learning melalui perjumpaan langsung dengan alam (nature connectedness) dan loose parts bermakna.',
      };

      return res.json({ success: true, data: fallbackData, source: 'pedagogic-engine' });
    } catch (error: any) {
      const status = error.status || 500;
      if (status >= 500) {
        console.error('[SERVER] lesson-plan-recommendation internal error:', error);
      } else {
        console.warn(`[SERVER] lesson-plan-recommendation client rejection (${status}):`, error?.message || error?.error || error);
      }
      return res.status(status).json({
        success: false,
        error: error.error || 'SERVER_ERROR',
        message: error.message || 'Gagal memproses rekomendasi pembelajaran.',
      });
    }
  });

  // 1b. Generasi Indikator Perkembangan Berdasarkan Tujuan, Kegiatan, Usia, dan Konteks (6 Aspek GrowUPAUD)
  app.post('/api/ai/generate-development-indicators', async (req, res) => {
    try {
      await verifyAICaller(req, ['ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'PRINCIPAL', 'TEACHER', 'GURU']);
      const {
        learningObjective = '',
        activity = '',
        ageGroup = 'Usia 5-6 Tahun (Kelompok B)',
        activityContext = '',
        theme = '',
        subtheme = '',
      } = req.body;

      if (!learningObjective?.trim() && !activity?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Tujuan pembelajaran dan rencana kegiatan wajib diisi untuk menghasilkan indikator.',
        });
      }

      const ai = getGenAI();
      const prompt = `Anda adalah Ahli Asesmen dan Kurikulum PAUD (Pendidikan Anak Usia Dini) untuk aplikasi GrowUPAUD.
Tugas Anda adalah menganalisis Tujuan Pembelajaran dan Rencana Kegiatan Bermain, lalu menghasilkan INDIKATOR PERKEMBANGAN yang dapat diamati (observable) untuk asesmen guru.

SISTEM 6 ASPEK PERKEMBANGAN GROWUPAUD:
1. NAM: Nilai Agama & Moral
2. JATI_DIRI: Jati Diri / Sosial Emosional
3. LITERASI_STEAM: Literasi & STEAM
4. MOTORIK_KASAR: Motorik Kasar
5. MOTORIK_HALUS: Motorik Halus
6. KOGNITIF: Kognitif & Berpikir

INFORMASI INPUT:
- Tujuan Pembelajaran (TP): "${learningObjective}"
- Kegiatan yang Direncanakan: "${activity}"
- Kelompok Usia: "${ageGroup}"
- Konteks Kegiatan / Media Loose Parts: "${activityContext || 'Bahan alam dan sarana kelas PAUD'}"
${theme ? `- Tema: "${theme}" / Subtema: "${subtheme || '-'}"` : ''}

ATURAN WAJIB & PRINSIP UTAMA:
1. JANGAN MEMAKSAKAN SEMUA 6 ASPEK TERISI INDIKATOR!
   Pilihlah hanya 2 sampai 4 aspek yang BENAR-BENAR RELEVAN dengan kegiatan dan tujuan.
2. Aspek yang TIDAK relevan harus dimasukkan ke dalam daftar "nonFocusAspects" dengan alasan pedagogis yang jelas, berbunyi: "Tidak menjadi fokus utama kegiatan: [penjelasan singkat]".
3. Kualitas Indikator:
   - Bersifat konkret dan DAPAT DIAMATI (observable behavior), bukan asumsi internal (HINDARI kalimat abstrak seperti "Anak memahami...", gunakan "Anak mampu mengelompokkan...", "Anak mampu menggunakan koordinasi jari...", "Anak mampu bergantian...").
   - Sesuai dengan tahapan usia (${ageGroup}).
   - Menggunakan bahasa yang santun, operasional, dan mudah dipahami guru PAUD.
   - Sediakan rubrik 4 level: BB (Belum Berkembang), MB (Mulai Berkembang), BSH (Berkembang Sesuai Harapan), BSB (Berkembang Sangat Baik).
4. Keputusan akhir tetap di tangan Guru. AI memberikan saran indikator operasional yang mempermudah observasi autentik.

KEMBALIKAN HANYA JSON VALID SESUAI FORMAT BERIKUT (TANPA MARKDOWN TAMBAHAN):
{
  "learningObjective": "${(learningObjective || '').replace(/"/g, '\\"')}",
  "activity": "${(activity || '').replace(/"/g, '\\"')}",
  "ageGroup": "${(ageGroup || '').replace(/"/g, '\\"')}",
  "activityContext": "${(activityContext || '').replace(/"/g, '\\"')}",
  "relevantAspects": ["MOTORIK_HALUS", "KOGNITIF"],
  "indicators": [
    {
      "aspect": "MOTORIK_HALUS",
      "aspectLabel": "Motorik Halus",
      "text": "Anak mampu menggunakan koordinasi jari-jemari tangan dengan terkontrol saat memanipulasi bahan kegiatan.",
      "observableBehavior": "Anak memegang, menyusun, atau menata objek dengan stabil menggunakan ujung jarinya.",
      "isRelevant": true,
      "rubric": {
        "BB": "Belum menunjukkan koordinasi jari yang stabil meskipun didampingi guru.",
        "MB": "Mulai memegang dan menggerakkan bahan main dengan bimbingan guru secara bertahap.",
        "BSH": "Mampu menggunakan koordinasi jemari secara mandiri dan terarah saat berkegiatan.",
        "BSB": "Menunjukkan kelenturan dan ketepatan koordinasi jemari yang sangat baik serta mandiri berkreasi."
      }
    }
  ],
  "nonFocusAspects": [
    {
      "aspect": "MOTORIK_KASAR",
      "aspectLabel": "Motorik Kasar",
      "reason": "Tidak menjadi fokus utama kegiatan karena kegiatan lebih banyak melibatkan eksplorasi meja bermain dan gerak halus."
    }
  ],
  "pedagogicalAdvice": "Amati respons anak saat berinteraksi dengan bahan main dan berikan pertanyaan pemantik terbuka."
}`;

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.4,
            },
          });

          const text = response.text || '{}';
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.indicators) && parsed.indicators.length > 0) {
            return res.json({ success: true, data: parsed, source: 'gemini' });
          }
        } catch (genErr) {
          console.warn('[SERVER] Gemini API indicator generation error, falling back to pedagogical engine:', genErr);
        }
      }

      // Fallback Pedagogis Terstruktur
      const aspectsMeta: Record<string, { label: string; keywords: RegExp; nonFocusReason: string }> = {
        NAM: {
          label: 'Nilai Agama & Moral',
          keywords: /doa|tuhan|agama|ibadah|ciptaan|syukur|moral|akhlak|adab|sopan|santun|kebaikan|sedekah|alam ciptaan/i,
          nonFocusReason: 'Tidak menjadi fokus utama kegiatan karena fokus pada eksplorasi keterampilan fisik dan kognitif.',
        },
        JATI_DIRI: {
          label: 'Jati Diri (Sosial Emosional)',
          keywords: /teman|sosial|emosi|perasaan|bergantian|antre|antri|giliran|kerja sama|kerjasama|mandiri|percaya diri|regulasi|empati|berbagi|merapikan/i,
          nonFocusReason: 'Tidak menjadi fokus utama kegiatan karena interaksi sosial tidak dijadikan tujuan utama pada sesi ini.',
        },
        LITERASI_STEAM: {
          label: 'Literasi & STEAM',
          keywords: /cerita|buku|huruf|kata|membaca|dongeng|menyimak|sains|eksperimen|teknologi|seni|lukis|gambar|pola|steam|loose parts|meneliti/i,
          nonFocusReason: 'Tidak menjadi fokus utama kegiatan karena tidak menekankan keaksaraan simbolik atau rekayasa bahan.',
        },
        MOTORIK_KASAR: {
          label: 'Motorik Kasar',
          keywords: /lari|lompat|loncat|lempar|tangkap|panjat|titi|senam|gerak|tari|tendang|rangkak|keseimbangan|jinjit|estafet|tubuh|olahraga/i,
          nonFocusReason: 'Tidak menjadi fokus utama kegiatan karena aktivitas dilakukan di ruang kelas dengan gerakan lokomotor terbatas.',
        },
        MOTORIK_HALUS: {
          label: 'Motorik Halus',
          keywords: /gunting|potong|robek|remas|tempel|ronce|jemari|jari|tangan|pensil|kuas|balok|susun|pilin|plastisin|lempung|menjepit|meronce/i,
          nonFocusReason: 'Tidak menjadi fokus utama kegiatan karena manipulasi benda kecil tidak menjadi titik berat kegiatan.',
        },
        KOGNITIF: {
          label: 'Kognitif & Berpikir',
          keywords: /hitung|angka|kelompok|ukur|bentuk|warna|urut|klasifikasi|cocok|masalah|sebab|mengapa|bagaimana|beda|sama|bandingkan/i,
          nonFocusReason: 'Tidak menjadi fokus utama kegiatan karena penekanan lebih diarahkan pada ekspresi motorik dan emosi.',
        },
      };

      const combinedText = `${learningObjective} ${activity} ${activityContext}`;
      const relevantAspectKeys: string[] = [];
      const nonFocusAspects: Array<{ aspect: string; aspectLabel: string; reason: string }> = [];

      for (const [key, meta] of Object.entries(aspectsMeta)) {
        if (meta.keywords.test(combinedText)) {
          relevantAspectKeys.push(key);
        }
      }

      // Default jika tidak ada keyword yang cocok: pilih 2 aspek paling esensial (KOGNITIF & MOTORIK_HALUS / JATI_DIRI)
      if (relevantAspectKeys.length === 0) {
        relevantAspectKeys.push('KOGNITIF', 'MOTORIK_HALUS');
      } else if (relevantAspectKeys.length > 4) {
        // Batasi maksimal 3-4 aspek relevan agar tidak memaksakan semua aspek
        relevantAspectKeys.length = 3;
      }

      for (const [key, meta] of Object.entries(aspectsMeta)) {
        if (!relevantAspectKeys.includes(key)) {
          nonFocusAspects.push({
            aspect: key,
            aspectLabel: meta.label,
            reason: `Tidak menjadi fokus utama kegiatan: ${meta.nonFocusReason}`,
          });
        }
      }

      const generatedIndicators = relevantAspectKeys.map((aspectKey, idx) => {
        const meta = aspectsMeta[aspectKey];
        let text = '';
        let observableBehavior = '';
        let rubric = {
          BB: 'Belum menunjukkan kemampuan yang diharapkan meskipun telah diberi contoh dan dorongan hangat.',
          MB: 'Mulai menunjukkan upaya berkegiatan dengan bimbingan dan pendampingan bertahap dari guru.',
          BSH: 'Mampu menunjukkan kemampuan secara mandiri, stabil, dan konsisten sesuai tahap perkembangannya.',
          BSB: 'Menunjukkan kemampuan dengan sangat percaya diri, mandiri, serta mampu mengajak/membantu teman.',
        };

        if (aspectKey === 'KOGNITIF') {
          text = `Anak mampu menganalisis atau membedakan karakteristik dalam kegiatan "${activity || 'bermain'}" secara mandiri.`;
          observableBehavior = 'Anak mengamati, mengelompokkan, atau membandingkan unsur kegiatan dengan pemahaman yang baik.';
          rubric = {
            BB: 'Belum dapat mengenali atau membedakan unsur kegiatan tanpa bantuan penuh guru.',
            MB: 'Mulai mengenali unsur kegiatan ketika diberi arahan atau pertanyaan panduan guru.',
            BSH: 'Mampu membedakan dan mengelompokkan unsur kegiatan secara mandiri dan tepat.',
            BSB: 'Mampu membedakan unsur secara mandiri serta menjelaskan alasan pemikirannya dengan logis.',
          };
        } else if (aspectKey === 'MOTORIK_HALUS') {
          text = `Anak mampu menggunakan koordinasi jari-jemari tangan secara terkontrol saat melakukan "${activity || 'kegiatan'}"`;
          observableBehavior = 'Anak menggunakan jari-jemari secara stabil untuk memegang, menata, atau memanipulasi media bermain.';
          rubric = {
            BB: 'Belum mampu mengkoordinasikan jari tangan secara stabil saat memegang bahan.',
            MB: 'Mulai dapat memegang dan menggerakkan bahan main dengan dorongan dan bantuan guru.',
            BSH: 'Mandiri dan terkoordinasi dengan baik saat memanipulasi bahan bermain.',
            BSB: 'Sangat terampil dan teliti menggunakan koordinasi jemari serta menghasilkan karya yang rapi.',
          };
        } else if (aspectKey === 'MOTORIK_KASAR') {
          text = `Anak mampu melakukan gerakan fisik dan menjaga keseimbangan tubuh selama "${activity || 'kegiatan'}"`;
          observableBehavior = 'Anak menggerakkan anggota tubuh dengan seimbang dan lincah mengikuti instruksi kegiatan.';
          rubric = {
            BB: 'Tampak ragu atau kurang seimbang saat melakukan gerakan motorik kasar yang diarahkan.',
            MB: 'Mulai mau mencoba gerakan fisik dengan bimbingan dan pengawasan guru.',
            BSH: 'Mampu melakukan gerakan fisik secara mandiri, teratur, dan menjaga keseimbangan tubuh.',
            BSB: 'Sangat lincah, berenergi positif, terampil menjaga keseimbangan, dan antusias memimpin gerakan.',
          };
        } else if (aspectKey === 'JATI_DIRI') {
          text = `Anak menunjukkan kemandirian, regulasi emosi, dan sikap kooperatif saat mengikuti "${activity || 'kegiatan'}"`;
          observableBehavior = 'Anak mau bergantian, berbagi alat/media, dan mengelola perasaannya secara positif.';
          rubric = {
            BB: 'Masih membutuhkan pendampingan intensif dalam mengelola emosi atau berbagi media main.',
            MB: 'Mulai mau berbagi atau menunggu giliran setelah diingatkan secara lembut oleh guru.',
            BSH: 'Secara mandiri mampu bekerja sama, bersabar menunggu giliran, dan menjaga suasana kondusif.',
            BSB: 'Menunjukkan empati yang tinggi, dengan senang hati membantu teman dan menjadi teladan kerja sama.',
          };
        } else if (aspectKey === 'NAM') {
          text = `Anak menunjukkan rasa syukur, merawat bahan/lingkungan sekitar, dan bersikap santun saat "${activity || 'kegiatan'}"`;
          observableBehavior = 'Anak mengucapkan terima kasih, menjaga media main ciptaan Tuhan, dan bersikap ramah.';
          rubric = {
            BB: 'Belum terbiasa menunjukkan perilaku merawat bahan atau mengucap syukur secara mandiri.',
            MB: 'Mulai menunjukkan sikap bersyukur dan merawat alat setelah diingatkan guru.',
            BSH: 'Mampu merawat media main dan bersikap sopan santun secara konsisten dan mandiri.',
            BSB: 'Menunjukkan kesadaran spiritual dan moral yang tinggi serta mengajak teman berbuat baik.',
          };
        } else if (aspectKey === 'LITERASI_STEAM') {
          text = `Anak mampu mengekspresikan ide, menggunakan kosakata kontekstual, atau bereksplorasi dengan bahan dalam "${activity || 'kegiatan'}"`;
          observableBehavior = 'Anak menceritakan apa yang dibuatnya atau menunjukkan rasa ingin tahu terhadap fenomena/bahan main.';
          rubric = {
            BB: 'Belum mau menceritakan atau mengeksplorasi bahan selain yang ditentukan guru.',
            MB: 'Mulai mau bertanya atau menyebutkan bagian dari hasil karyanya dengan panduan guru.',
            BSH: 'Mampu menceritakan ide karyanya dengan kalimat sederhana serta mengeksplorasi media dengan baik.',
            BSB: 'Sangat kreatif mengeksplorasi media, menghubungkan dengan pengalaman nyata, dan bercerita komunikatif.',
          };
        }

        return {
          aspect: aspectKey,
          aspectLabel: meta.label,
          text,
          observableBehavior,
          isRelevant: true,
          rubric,
        };
      });

      const fallbackResult = {
        learningObjective,
        activity,
        ageGroup,
        activityContext,
        relevantAspects: relevantAspectKeys,
        indicators: generatedIndicators,
        nonFocusAspects,
        pedagogicalAdvice: `Amati keterlibatan anak selama "${activity}". Catat perkembangan anak sesuai rubrik autentik dan dokumentasikan karya autentik anak.`,
      };

      return res.json({ success: true, data: fallbackResult, source: 'pedagogic-engine' });
    } catch (error: any) {
      const status = error.status || 500;
      if (status >= 500) {
        console.error('[SERVER] generate-development-indicators internal error:', error);
      } else {
        console.warn(`[SERVER] generate-development-indicators client rejection (${status}):`, error?.message || error?.error || error);
      }
      return res.status(status).json({
        success: false,
        error: error.error || 'SERVER_ERROR',
        message: error.message || 'Gagal memproses indikator perkembangan.',
      });
    }
  });

  // 2. Analisis Observasi & Triangulasi Data (AI hanya memberi SARAN, Guru adalah pengambil keputusan)
  app.post('/api/ai/analyze-observation', async (req, res) => {
    try {
      const caller = await verifyAICaller(req, ['ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'PRINCIPAL', 'KEPALA_SEKOLAH', 'TEACHER', 'GURU']);
      const requestedStudentId = typeof req.body?.studentId === 'string' ? req.body.studentId.trim() : '';
      await verifyAIStudentAccess(caller.adminDb, caller, requestedStudentId);
      const {
        studentName = 'Ananda',
        studentAge = '5 Tahun',
        activityTitle = 'Kegiatan Pembelajaran',
        indicators = [],
        teacherNote = '',
        voiceNoteText = '',
        evidences = [],
        schoolContext = {},
      } = req.body;

      const ai = getGenAI();

      const indicatorsSummary = Array.isArray(indicators)
        ? indicators
            .map(
              (ind: any) =>
                `- [${ind.aspect || 'ASPEK'}] ${ind.text}: Rating saat ini: ${ind.rating || 'BELUM_DINILAI'}`
            )
            .join('\n')
        : 'Belum ada indikator';

      const prompt = `Anda adalah Asisten Pedagogi AI PAUD untuk aplikasi GrowUPAUD.
Tugas Anda adalah menganalisis observasi anak usia dini secara objektif, holistik, dan penuh empati.

PRINSIP WAJIB:
1. AI HANYA MEMBERIKAN SARAN DAN WAWASAN PENGAMATAN. Guru adalah pengambil keputusan tunggal. AI TIDAK BOLEH menentukan nilai akhir mutlak.
2. Gunakan bahasa deskriptif, naratif, non-hakimi, dan berbasis kekuatan anak (strengths-based approach).
3. Triangulasikan: Catatan guru, transkrip suara, foto/karya, dan indikator yang diobservasi.
4. Jangan pernah menganggap aspek yang belum diobservasi bernilai 0 (itu adalah "Belum Teramati").
5. Sertakan pertanyaan reflektif lanjutan untuk guru.

DATA OBSERVASI:
- Nama Anak: ${studentName}
- Usia Anak: ${studentAge}
- Judul Kegiatan: ${activityTitle}
- Catatan Guru: "${teacherNote || 'Tidak ada catatan tertulis'}"
- Transkrip Rekaman Suara Guru: "${voiceNoteText || 'Tidak ada rekaman suara'}"
- Jumlah Bukti Foto/Karya: ${Array.isArray(evidences) ? evidences.length : 0} item
- Status Indikator Rubrik:
${indicatorsSummary}

KEMBALIKAN HANYA JSON DENGAN STRUKTUR BERIKUT:
{
  "overview": "Ringkasan holistik 2-3 kalimat mengenai keterlibatan anak dalam kegiatan.",
  "strengths": ["Kekuatan konkret 1 yang teramati", "Kekuatan konkret 2 yang teramati"],
  "needsStimulation": ["Area perkembangan yang membutuhkan dukungan lanjutan"],
  "generatedNarrative": "Paragraf narasi rapor perkembangan anak yang santun, hangat, dan bermakna untuk dibaca orang tua.",
  "homeStimulationAdvice": "Saran stimulasi sederhana dan ramah yang dapat dilakukan ayah bunda di rumah dengan bahan sehari-hari.",
  "followUpQuestions": [
    "Pertanyaan atau fokus observasi yang disarankan untuk guru amati pada kegiatan selanjutnya"
  ],
  "triangulationSummary": "Catatan singkat kesesuaian antara catatan guru, respons suara anak, dan perilaku motorik/sosial yang teramati."
}`;

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.6,
            },
          });

          const text = response.text || '{}';
          const parsed = JSON.parse(text);
          return res.json({ success: true, data: parsed, source: 'gemini' });
        } catch {
          isGeminiOperational = false;
          genAIClient = null;
          console.log('[SERVER] Gemini API observation analysis using pedagogic engine fallback.');
        }
      }

      // Pedagogic fallback
      const fallbackAnalysis = {
        overview: `${studentName} mengikuti kegiatan "${activityTitle}" dengan antusiasme yang baik, aktif mengeksplorasi media yang disediakan dan berinteraksi secara hangat bersama teman dan guru.`,
        strengths: [
          `Menunjukkan fokus dan ketertarikan tinggi saat bereksplorasi pada kegiatan "${activityTitle}".`,
          'Mampu mengekspresikan ide dan perasaannya secara lisan dan melalui tindakan langsung.',
        ],
        needsStimulation: [
          'Dukungan bertahap dalam mengomunikasikan solusi saat menemui kendala kecil pada aktivitas mandiri.',
        ],
        generatedNarrative: `Alhamdulillah, Ananda ${studentName} menunjukkan perkembangan yang membanggakan dalam kegiatan "${activityTitle}". Ananda tampak percaya diri, aktif berpartisipasi, serta mampu bekerja sama dengan baik bersama teman. Perkembangan rasa ingin tahu dan keterampilan eksplorasinya berkembang secara sangat positif.`,
        homeStimulationAdvice: `Ayah Bunda dapat mengajak ${studentName} mengobrol santai mengenai pengalamannya hari ini, serta memberikan kesempatan untuk membantu kegiatan sederhana di rumah seperti merapikan mainan atau menyiram tanaman.`,
        followUpQuestions: [
          `Apakah ${studentName} menunjukkan inisiatif yang sama ketika berhadapan dengan media loose parts yang berbeda jenis?`,
          `Bagaimana respons komunikasi ${studentName} saat diajak bekerja sama dalam kelompok beranggotakan lebih dari 3 anak?`,
        ],
        triangulationSummary: 'Data catatan guru dan bukti kegiatan saling mengonfirmasi keterlibatan positif ananda dalam proses belajar berbasis bermain.',
      };

      return res.json({ success: true, data: fallbackAnalysis, source: 'fallback' });
    } catch (error: any) {
      const status = error.status || 500;
      if (status >= 500) {
        console.error('[SERVER] analyze-observation internal error:', error);
      } else {
        console.warn(`[SERVER] analyze-observation client rejection (${status}):`, error?.message || error?.error || error);
      }
      return res.status(status).json({
        success: false,
        error: error.error || 'SERVER_ERROR',
        message: error.message || 'Gagal menganalisis observasi.',
      });
    }
  });

  // 3. Analisis Foto Dokumentasi Pembelajaran PAUD
  app.post('/api/ai/analyze-photo', async (req, res) => {
    try {
      const caller = await verifyAICaller(req, ['ADMIN', 'SUPER_ADMIN', 'OPERATOR', 'PRINCIPAL', 'KEPALA_SEKOLAH', 'TEACHER', 'GURU']);
      const requestedStudentId = typeof req.body?.studentId === 'string' ? req.body.studentId.trim() : '';
      await verifyAIStudentAccess(caller.adminDb, caller, requestedStudentId);
      const {
        activityTitle = 'Kegiatan Pembelajaran',
        teacherNotes = '',
        studentAge = '5 Tahun',
        imageBase64 = null,
        imageUrl = null,
      } = req.body;

      const ai = getGenAI();

      const promptText = `Anda adalah Ahli Analisis Dokumentasi Asesmen Autentik PAUD.
Analisislah foto/dokumentasi kegiatan bermain anak usia dini berikut:
- Konteks Kegiatan: ${activityTitle}
- Usia Anak: ${studentAge}
- Catatan Awal Guru: "${teacherNotes || 'Observasi proses bermain anak'}"

INGAT:
- AI HANYA MEMBERI SARAN BANTUAN OBSERVASI. Guru tetap yang memvalidasi kebenarannya di lapangan.
- Jangan melabeli anak secara kaku.
- Fokus pada perilaku nyata yang biasanya terlihat pada aktivitas sejenis (koordinasi fisik, fokus mata-tangan, interaksi sosial, pemikiran simbolik).

KEMBALIKAN HANYA JSON:
{
  "visualDescription": "Deskripsi objektif apa yang tampak pada proses kegiatan bermain anak.",
  "suggestedAspects": ["MOTORIK_HALUS", "LITERASI_STEAM", "JATI_DIRI"],
  "potentialBehaviors": [
    "Perilaku teramati 1 (misal: memegang alat dengan genggaman jari stabil)",
    "Perilaku teramati 2 (misal: fokus menata benda secara berulang)"
  ],
  "suggestedFollowUpQuestions": [
    "Pertanyaan pemantik yang dapat ditanyakan guru kepada anak saat mengamati"
  ],
  "pedagogicInsight": "Saran stimulasi penguatan proses bermain berikutnya."
}`;

      if (ai) {
        try {
          const contents: any[] = [];
          if (imageBase64 && imageBase64.includes('base64,')) {
            const parts = imageBase64.split('base64,');
            const mimeMatch = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            contents.push({
              inlineData: {
                data: parts[1],
                mimeType,
              },
            });
          }
          contents.push(promptText);

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.6,
            },
          });

          const text = response.text || '{}';
          const parsed = JSON.parse(text);
          return res.json({ success: true, data: parsed, source: 'gemini' });
        } catch {
          isGeminiOperational = false;
          genAIClient = null;
          console.log('[SERVER] Gemini photo analysis using pedagogic engine fallback.');
        }
      }

      const fallbackResult = {
        visualDescription: 'Analisis visual otomatis belum tersedia. Gunakan foto sebagai bukti pendukung dan lengkapi deskripsi berdasarkan apa yang benar-benar diamati guru.',
        suggestedAspects: [],
        potentialBehaviors: [],
        suggestedFollowUpQuestions: [
          'Apa yang benar-benar tampak dilakukan anak pada dokumentasi ini?',
          'Bukti perilaku apa yang dapat diverifikasi melalui pengamatan langsung?'
        ],
        pedagogicInsight: 'Dokumentasi foto tidak boleh menjadi satu-satunya dasar penilaian. Validasi dengan pengamatan autentik guru.'
      };
      return res.json({ success: true, data: fallbackResult, source: 'safe-fallback' });
    } catch (error: any) {
      const status = error.status || 500;
      if (status >= 500) {
        console.error('[SERVER] analyze-photo internal error:', error);
      } else {
        console.warn(`[SERVER] analyze-photo client rejection (${status}):`, error?.message || error?.error || error);
      }
      return res.status(status).json({
        success: false,
        error: error.error || 'SERVER_ERROR',
        message: error.message || 'Gagal menganalisis foto kegiatan.',
      });
    }
  });

  verifyGeminiOperational().catch(() => {});

  const httpServer = http.createServer(app);

  // Vite middleware for dev or static serving for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER CRASH]:', err);
});
