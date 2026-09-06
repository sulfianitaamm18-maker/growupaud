import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let adminApp: App | null = null;
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!genAIClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY') {
      genAIClient = new GoogleGenAI({ apiKey: key.trim() });
    }
  }
  return genAIClient;
}

function getAdminApp(): App {
  if (!adminApp) {
    const existingApps = getApps();
    if (!existingApps.length) {
      try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'growupaud';

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

  app.use(express.json());

  // Check if server-side ADMIN_NEW_PASSWORD is provided to update admin password dynamically
  if (process.env.ADMIN_NEW_PASSWORD && process.env.ADMIN_NEW_PASSWORD.length >= 6) {
    try {
      const appInstance = getAdminApp();
      const adminAuth = getAuth(appInstance);
      const adminDb = getFirestore(appInstance);

      // Dynamically locate existing ADMIN or SUPER_ADMIN user
      const adminSnap = await adminDb
        .collection('users')
        .where('role', 'in', ['ADMIN', 'SUPER_ADMIN'])
        .limit(1)
        .get();

      if (!adminSnap.empty) {
        const adminDoc = adminSnap.docs[0];
        const targetUid = adminDoc.id;
        await adminAuth.updateUser(targetUid, {
          password: process.env.ADMIN_NEW_PASSWORD,
        });
        console.log(`[SERVER] Admin password updated dynamically for UID ${targetUid}.`);
      }
    } catch (err: any) {
      console.error('[SERVER] Startup admin password update warning:', err?.message || err);
    }
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
    const isCallerAdmin = (callerData?.role === 'ADMIN' || callerData?.role === 'SUPER_ADMIN') && callerData?.isActive;
    if (!isCallerAdmin) {
      throw { status: 403, error: 'FORBIDDEN', message: 'Akses ditolak: Hanya ADMIN atau SUPER_ADMIN aktif yang berwenang.' };
    }

    return { callerUid, callerData, adminAuth, adminDb };
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

      const results = authList.users.map((u) => {
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
      });

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

      const validRoles = ['ADMIN', 'PRINCIPAL', 'TEACHER', 'PARENT'];
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
      const targetSchoolId = callerData?.role === 'SUPER_ADMIN'
        ? (schoolId || callerData?.schoolId || 'main-school')
        : (callerData?.schoolId || 'main-school');
      const targetSchoolName = schoolName || 'Sekolah PAUD';

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
        studentIds: Array.isArray(selectedStudentIds) ? selectedStudentIds : [],
        linkedStudentIds: Array.isArray(selectedStudentIds) ? selectedStudentIds : [],
        createdAt: now,
        updatedAt: now,
      };

      if (Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
        profileData.childId = selectedStudentIds[0];
      }
      if (role === 'TEACHER' && className) {
        profileData.className = className;
      }

      try {
        await adminDb.collection('users').doc(uid).set(profileData);
        console.log(`[SERVER] Created Firestore profile users/${uid} for ${cleanUsername}`);
      } catch (firestoreErr: any) {
        console.error(`[SERVER] Failed creating Firestore profile users/${uid}:`, firestoreErr);
        return res.status(500).json({
          success: false,
          error: 'FIRESTORE_PROFILE_FAILED',
          message:
            'Akun Auth berhasil dibuat, tetapi profil Firestore gagal dibuat. Silakan gunakan tombol "Sinkronkan Profil" untuk akun ini.',
          uid,
        });
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
      console.error('[SERVER] create-user error:', err);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal membuat pengguna.',
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

      const inferredEmail = authUser.email || formatAuthEmail(username || 'user');
      const cleanUsername = (username || (inferredEmail.split('@')[0] ?? 'user')).toLowerCase().trim();
      const targetName = name || authUser.displayName || cleanUsername;
      const validRoles = ['ADMIN', 'PRINCIPAL', 'TEACHER', 'PARENT'];
      const targetRole = validRoles.includes(role) ? role : 'TEACHER';
      const targetSchoolId = callerData?.role === 'SUPER_ADMIN'
        ? (schoolId || callerData?.schoolId || 'main-school')
        : (callerData?.schoolId || 'main-school');
      const targetSchoolName = schoolName || 'Sekolah PAUD';

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
          targetRole === 'PARENT'
            ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
            : targetRole === 'TEACHER'
            ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
            : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
        schoolId: targetSchoolId,
        schoolName: targetSchoolName,
        isActive: isActive !== false,
        studentIds: Array.isArray(selectedStudentIds) ? selectedStudentIds : [],
        linkedStudentIds: Array.isArray(selectedStudentIds) ? selectedStudentIds : [],
        updatedAt: now,
      };

      // Check if existing document has createdAt
      const existingDoc = await adminDb.collection('users').doc(uid).get();
      if (existingDoc.exists) {
        const existingData = existingDoc.data() || {};
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

      await adminDb.collection('users').doc(uid).set(profileData, { merge: true });
      console.log(`[SERVER] Successfully synced Firestore profile users/${uid} for ${cleanUsername}`);

      return res.json({
        success: true,
        message: 'Profil Firestore berhasil disinkronkan dengan Firebase Authentication.',
        profile: profileData,
      });
    } catch (err: any) {
      console.error('[SERVER] sync-profile error:', err);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Gagal menyinkronkan profil Firestore.',
      });
    }
  });

  // Admin Change Password API
  app.post('/api/admin/change-password', async (req, res) => {
    try {
      const { adminAuth, adminDb } = await verifyAdminCaller(req);
      const { targetUid, newPassword } = req.body || {};

      if (!targetUid || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ARGUMENTS',
          message: 'UID target dan password baru wajib diisi.'
        });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'WEAK_PASSWORD',
          message: 'Password minimal 6 karakter.'
        });
      }

      try {
        await adminAuth.updateUser(targetUid, { password: newPassword });
        return res.json({
          success: true,
          message: `Password berhasil diperbarui untuk UID ${targetUid}`
        });
      } catch (updateErr: any) {
        console.error('[SERVER] updateUser error code:', updateErr?.code || 'UNKNOWN_ERROR');
        return res.status(500).json({
          success: false,
          error: updateErr?.code || 'ADMIN_UPDATE_FAILED',
          message: updateErr?.message || 'Gagal merubah password via Firebase Admin SDK.'
        });
      }
    } catch (err: any) {
      console.error('[SERVER] change-password endpoint error:', err?.message || err);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.error || 'SERVER_ERROR',
        message: err.message || 'Terjadi kesalahan internal pada server.'
      });
    }
  });

  // ==========================================
  // GEMINI AI SERVER-SIDE ROUTES
  // ==========================================

  // 1. Rekomendasi Perencanaan & Kurikulum (CP, ATP, TP, Kegiatan, Loose Parts)
  app.post('/api/ai/lesson-plan-recommendation', async (req, res) => {
    try {
      const {
        theme = 'Aku Sayang Bumi',
        subtheme = 'Tanaman di Sekitarku',
        ageGroup = 'Usia 4-6 Tahun (Fase Fondasi)',
        schoolContext = {},
        customPrompt = '',
      } = req.body;

      const ai = getGenAI();

      const contextSummary = `
- Konteks Lokasi Sekolah: ${schoolContext.locationContext || 'Lingkungan ramah anak'}
- Budaya & Kearifan Lokal: ${schoolContext.cultureContext || 'Kearifan lokal Indonesia'}
- Media & Loose Parts Tersedia: ${Array.isArray(schoolContext.availableMedia) ? schoolContext.availableMedia.join(', ') : 'Bahan alam, ranting, batu, daun kering, kardus bekas'}
- Fasilitas Sekolah: ${schoolContext.facilitiesSummary || 'Area kelas dan halaman bermain'}
- Karakteristik Anak: ${schoolContext.studentCharacteristics || 'Senang bereksplorasi secara aktif dan bermain peran'}
`;

      const prompt = `Anda adalah Ahli Pedagogi PAUD, Kurikulum Merdeka Fase Fondasi, Deep Learning, TaRL (Teaching at the Right Level), dan CRT (Culturally Responsive Teaching).
Tugas Anda adalah merancang REKOMENDASI pembelajaran untuk Guru PAUD.

INFORMASI:
- Tema: ${theme}
- Subtema: ${subtheme}
- Kelompok Usia: ${ageGroup}
- Konteks Sekolah:
${contextSummary}
- Catatan Tambahan Guru: ${customPrompt || 'Fokus pada eksplorasi bermakna, bermain berbasis loose parts, dan penguatan karakter'}

PEDOMAN PENTING:
1. Deep Learning PAUD: Pembelajaran berkesadaran, bermakna, dan menggembirakan (mindful, meaningful, joyful) melalui eksplorasi sensoris dan pemecahan masalah sederhana.
2. TaRL: Sediakan alternatif diferensiasi untuk tahapan kesiapan anak yang beragam (tahap awal, tahap sedang berkembang, tahap mahir).
3. CRT & Bahan Alam: Prioritaskan media bahan alam lokal dan loose parts tanpa biaya mahal yang mudah ditemukan di sekitar anak.
4. AI HANYA MEMBERI SARAN: Guru tetap menjadi penentu dan pengambil keputusan akhir.

KEMBALIKAN HANYA JSON DENGAN FORMAT BERIKUT:
{
  "theme": "${theme}",
  "subtheme": "${subtheme}",
  "recommendedCP": {
    "code": "CP-PAUD",
    "title": "Capaian Pembelajaran Terkait",
    "description": "Deskripsi CP yang sesuai"
  },
  "recommendedATP": {
    "code": "ATP-01",
    "title": "Alur Tujuan Pembelajaran",
    "phase": "Fase Fondasi",
    "stepOrder": 1,
    "description": "Langkah alur perkembangan"
  },
  "recommendedTP": {
    "code": "TP-01",
    "title": "Tujuan Pembelajaran Spesifik",
    "description": "Deskripsi TP konkret dan teramati"
  },
  "recommendedIndicators": [
    {
      "aspect": "LITERASI_STEAM",
      "text": "Deskripsi indikator perilaku anak",
      "rubric": {
        "BB": "Belum menunjukkan minat...",
        "MB": "Mulai mencoba dengan bimbingan...",
        "BSH": "Mampu mandiri mengeksplorasi...",
        "BSB": "Mampu mandiri dan membantu teman..."
      }
    }
  ],
  "activityIdeas": [
    {
      "title": "Nama Kegiatan Bermain",
      "duration": "45-60 menit",
      "description": "Deskripsi kegiatan eksplorasi",
      "steps": ["Langkah 1", "Langkah 2", "Langkah 3", "Refleksi penutup"]
    }
  ],
  "mediaAndMaterials": [
    "Bahan alam (daun, ranting, biji)",
    "Loose parts daur ulang"
  ],
  "provocationQuestions": [
    "Pertanyaan pemantik 1?",
    "Pertanyaan pemantik 2?"
  ],
  "tarlAdjustments": {
    "beginner": "Penyesuaian untuk anak yang butuh pendampingan lebih",
    "intermediate": "Penyesuaian untuk anak pada tahap berkembang sesuai harapan",
    "advanced": "Tantangan pengayaan untuk anak yang sudah mandiri"
  },
  "pedagogicalNotes": "Catatan singkat penguatan guru mengenai Deep Learning dan CRT"
}`;

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
          return res.json({ success: true, data: parsed, source: 'gemini' });
        } catch (apiErr: any) {
          console.warn('[SERVER] Gemini API lesson plan failed, using pedagogic fallback:', apiErr?.message);
        }
      }

      // Fallback Pedagogis Bermakna
      const fallbackData = {
        theme,
        subtheme,
        recommendedCP: {
          code: 'CP-03',
          title: 'Dasar-Dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni',
          description: 'Anak mengenali dan memahami berbagai informasi, mengomunikasikan perasaan dan pikiran secara lisan, tulisan, atau menggunakan berbagai media serta membangun percakapan.',
        },
        recommendedATP: {
          code: 'ATP-LIT-01',
          title: 'Eksplorasi Bentuk, Tekstur dan Klasifikasi Bahan Alam',
          phase: 'Fase Fondasi (4-6 Tahun)',
          stepOrder: 1,
          description: 'Anak mengamati ciri fisik benda di lingkungan sekitar, mengelompokkan menurut ukuran/warna/tekstur, dan menceritakan temuannya.',
        },
        recommendedTP: {
          code: 'TP-LIT-01',
          title: 'Menginvestigasi Pola Daun & Membuat Kolase Bahan Alam',
          description: 'Anak mampu mengumpulkan ragam daun kering di kebun, membandingkan tekstur kasar/halus, dan menyusun karya imajinatif secara mandiri.',
        },
        recommendedIndicators: [
          {
            aspect: 'LITERASI_STEAM',
            text: 'Mengelompokkan daun atau ranting berdasarkan ukuran atau bentuk secara mandiri',
            rubric: {
              BB: 'Belum mau memegang atau mengelompokkan bahan alam meskipun dicontohkan.',
              MB: 'Mulai mengelompokkan daun setelah diajak dan dibimbing guru secara bertahap.',
              BSH: 'Mampu mengelompokkan 2-3 jenis daun/ranting secara mandiri dan menceritakan perbedaannya.',
              BSB: 'Mampu mengklasifikasikan bahan alam dengan variasi kategori sendiri dan membantu teman dalam kelompok.',
            },
          },
          {
            aspect: 'MOTORIK_HALUS',
            text: 'Menggunakan jari-jemari untuk merobek, menempel, atau menata loose parts dengan koordinasi yang baik',
            rubric: {
              BB: 'Belum terbiasa mengkoordinasikan jemari untuk menempel bahan alam.',
              MB: 'Mulai menggunakan jemari menempel bahan dengan bantuan guru mengoleskan perekat.',
              BSH: 'Mandiri menata dan menempelkan loose parts pada media gambar dengan rapi.',
              BSB: 'Menunjukkan kelenturan dan kekuatan jemari yang sangat baik serta menciptakan detail karya yang kaya.',
            },
          },
          {
            aspect: 'JATI_DIRI',
            text: 'Menunjukkan rasa bangga dan percaya diri menceritakan hasil karya eksplorasinya',
            rubric: {
              BB: 'Tampak ragu atau enggan berbicara saat diajak menceritakan hasil mainnya.',
              MB: 'Mulai mau menjawab singkat saat ditanya tentang karyanya oleh guru.',
              BSH: 'Secara mandiri dan ceria menceritakan apa yang dibuatnya di depan guru dan teman.',
              BSB: 'Antusias menceritakan karyanya dengan kalimat runtut dan mengapresiasi karya teman di sebelahnya.',
            },
          },
        ],
        activityIdeas: [
          {
            title: 'Detektif Daun & Galeri Kolase Bahan Alam',
            duration: '60 Menit',
            description: 'Anak diajak berjalan santai di kebun sekolah mengumpulkan daun berguguran, mengamati tulang daun dengan kaca pembesar, lalu menyusun karya bebas.',
            steps: [
              'Morning circle: Membaca buku dongeng bergambar tentang pohon yang rimbun.',
              'Penyelidikan luar ruang: Anak membawa keranjang kecil mengumpulkan 5 daun berbeda tekstur.',
              'Eksplorasi sensoris: Meraba permukaan daun (kasar, halus, licin, berbulu).',
              'Kreasi mandiri: Menyusun pola daun di atas kertas atau nampan kayu tanpa batasan bentuk.',
              'Circle refleksi: Memberi apresiasi pada setiap temuan dan karya unik anak.',
            ],
          },
        ],
        mediaAndMaterials: [
          'Daun kering aneka bentuk dan ukuran (koleksi kebun sekolah)',
          'Ranting kecil dan kerikil halus (bahan alam lokal)',
          'Tutup botol bekas dan potongan kardus ramah lingkungan (loose parts)',
          'Lem kanji / perekat berbahan alami yang aman untuk anak',
          'Kaca pembesar ramah anak (opsional)',
        ],
        provocationQuestions: [
          'Apa yang kamu rasakan saat menyentuh permukaan daun yang ini dibanding yang itu?',
          'Kira-kira benda apa saja di kebun ini yang bisa kita jadikan bagian dari karyamu?',
          'Mengapa daun-daun ini memiliki warna yang berbeda ya?',
        ],
        tarlAdjustments: {
          beginner: 'Fokus pada eksplorasi meraba 2 jenis tekstur daun yang sangat kontras (kasar vs halus) bersama pendampingan hangat guru.',
          intermediate: 'Mengelompokkan daun berdasarkan 2 kriteria (besar-kecil atau hijau-kuning) dan menempelkan menjadi bentuk figuratif sederhana.',
          advanced: 'Membuat urutan pola (gradasi ukuran dari terkecil ke terbesar) dan menciptakan pola simetris daun secara mandiri.',
        },
        pedagogicalNotes: 'Pembelajaran ini mengedepankan Deep Learning melalui perjumpaan langsung dengan alam (nature connectedness) serta memanfaatkan loose parts lokal yang kontekstual.',
      };

      return res.json({ success: true, data: fallbackData, source: 'fallback' });
    } catch (error: any) {
      console.error('[SERVER] lesson-plan-recommendation error:', error);
      return res.status(500).json({ success: false, message: 'Gagal memproses rekomendasi pembelajaran.' });
    }
  });

  // 2. Analisis Observasi & Triangulasi Data (AI hanya memberi SARAN, Guru adalah pengambil keputusan)
  app.post('/api/ai/analyze-observation', async (req, res) => {
    try {
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
        } catch (apiErr: any) {
          console.warn('[SERVER] Gemini API observation analysis failed, using pedagogic fallback:', apiErr?.message);
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
      console.error('[SERVER] analyze-observation error:', error);
      return res.status(500).json({ success: false, message: 'Gagal menganalisis observasi.' });
    }
  });

  // 3. Analisis Foto Dokumentasi Pembelajaran PAUD
  app.post('/api/ai/analyze-photo', async (req, res) => {
    try {
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
        } catch (apiErr: any) {
          console.warn('[SERVER] Gemini photo analysis failed, using fallback:', apiErr?.message);
        }
      }

      const fallbackResult = {
        visualDescription: `Dokumentasi menunjukkan keaktifan anak dalam berproses pada kegiatan "${activityTitle}". Terlihat koordinasi gerakan dan interaksi langsung dengan media bermain.`,
        suggestedAspects: ['MOTORIK_HALUS', 'LITERASI_STEAM', 'JATI_DIRI'],
        potentialBehaviors: [
          'Menunjukkan koordinasi visual-motorik yang baik saat mengoperasikan media kegiatan.',
          'Memperlihatkan ekspresi konsentrasi dan rasa ingin tahu yang tinggi terhadap benda di depannya.',
          'Mencoba menyusun atau mengeksplorasi media dengan cara unik dan mandiri.',
        ],
        suggestedFollowUpQuestions: [
          'Bagaimana caramu menyusun benda ini sehingga bisa berdiri seimbang?',
          'Ceritakan pada Ibu guru, apa yang sedang kamu buat ini?',
        ],
        pedagogicInsight: 'Apresiasi proses usaha anak daripada hasil jadinya. Sediakan media variatif tambahan jika anak ingin memperluas kreasinya.',
      };

      return res.json({ success: true, data: fallbackResult, source: 'fallback' });
    } catch (error: any) {
      console.error('[SERVER] analyze-photo error:', error);
      return res.status(500).json({ success: false, message: 'Gagal menganalisis foto kegiatan.' });
    }
  });

  const httpServer = http.createServer(app);

  // Vite middleware for dev or static serving for prod
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled
          ? false
          : {
              server: httpServer,
            },
        watch: isHmrDisabled ? null : undefined,
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
