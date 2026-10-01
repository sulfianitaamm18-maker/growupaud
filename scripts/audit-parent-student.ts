import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'growupaud';

  let app;
  if (serviceAccountKey) {
    const parsedKey = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey;
    app = initializeApp({ credential: cert(parsedKey), projectId });
  } else {
    app = initializeApp({ projectId });
  }

  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log('=== 1. FIREBASE AUTH USERS ===');
  try {
    const userList = await auth.listUsers(1000);
    console.log(`Found ${userList.users.length} auth users:`);
    for (const u of userList.users) {
      console.log(`- UID: ${u.uid} | Email: ${u.email} | DisplayName: ${u.displayName}`);
    }
  } catch (e: any) {
    console.error('Error listing auth users:', e.message);
  }

  console.log('\n=== 2. FIRESTORE USERS COLLECTION ===');
  try {
    const usersSnap = await db.collection('users').get();
    console.log(`Found ${usersSnap.docs.length} user docs:`);
    for (const d of usersSnap.docs) {
      if (d.id === 'B9SIURpsLyfD4skDGBbhxEXIyPf2') {
        console.log('--- EXACT IBUNADERAH USER DOC ---');
        console.log(JSON.stringify(d.data(), null, 2));
      }
    }
  } catch (e: any) {
    console.error('Error listing firestore users:', e.message);
  }

  console.log('\n=== 3. FIRESTORE STUDENTS COLLECTION ===');
  try {
    const studentsSnap = await db.collection('students').get();
    console.log(`Found ${studentsSnap.docs.length} student docs:`);
    for (const d of studentsSnap.docs) {
      if (d.id === 'std-99568') {
        console.log('--- EXACT STD-99568 STUDENT DOC ---');
        console.log(JSON.stringify(d.data(), null, 2));
      }
    }
  } catch (e: any) {
    console.error('Error listing firestore students:', e.message);
  }
}

run().catch(console.error);
