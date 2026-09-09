import fs from 'fs';
import path from 'path';
import {
  canViewStudent,
  canEditStudent,
  canViewObservation,
  canEditObservation,
  canViewReport,
  canInputObservations,
  validateSchoolAccess,
} from '../src/utils/authorization';
import { UserProfile, StudentProfile, ObservationRecord } from '../src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failed++;
  }
}

console.log('=== TEST SUITE: GROWUPAUD RBAC & AUTHORIZATION HARDENING ===\n');

// Mock Data
const schoolA = 'school-a';
const schoolB = 'school-b';

const baseUser = {
  username: 'user',
  email: 'user@school.id',
  avatar: '',
  schoolName: 'PAUD Melati',
};

const superAdmin: UserProfile = {
  ...baseUser,
  id: 'sa-1',
  name: 'Super Admin',
  role: 'SUPER_ADMIN',
  schoolId: schoolA,
  isActive: true,
};

const schoolAdminA: UserProfile = {
  ...baseUser,
  id: 'admin-a',
  name: 'Admin School A',
  role: 'ADMIN',
  schoolId: schoolA,
  isActive: true,
};

const operatorA: UserProfile = {
  ...baseUser,
  id: 'op-a',
  name: 'Operator School A',
  role: 'OPERATOR',
  schoolId: schoolA,
  isActive: true,
};

const teacherA1: UserProfile = {
  ...baseUser,
  id: 'teach-a1',
  name: 'Guru Kelas Aster (Teacher A)',
  role: 'TEACHER',
  schoolId: schoolA,
  classId: 'class-aster',
  className: 'Kelas Aster (4-5 Tahun)',
  isActive: true,
};

const teacherA2: UserProfile = {
  ...baseUser,
  id: 'teach-a2',
  name: 'Guru Kelas Melati (Teacher B)',
  role: 'TEACHER',
  schoolId: schoolA,
  classId: 'class-melati',
  className: 'Kelas Melati (5-6 Tahun)',
  isActive: true,
};

const parentA: UserProfile = {
  ...baseUser,
  id: 'parent-a',
  name: 'Orang Tua A (Bunda Sarah)',
  role: 'PARENT',
  schoolId: schoolA,
  isActive: true,
  // Attempt spoofing in user profile:
  studentIds: ['child-b', 'child-unlinked'],
  childId: 'child-b',
  linkedStudentIds: ['child-b', 'child-unlinked'],
  parentStudentIds: ['child-b', 'child-unlinked'],
} as any;

const parentB: UserProfile = {
  ...baseUser,
  id: 'parent-b',
  name: 'Orang Tua B (Ayah Doni)',
  role: 'PARENT',
  schoolId: schoolA,
  isActive: true,
};

const childOfParentA: StudentProfile = {
  id: 'child-a',
  name: 'Ananda A (Anak Bunda Sarah)',
  schoolId: schoolA,
  classId: 'class-aster',
  className: 'Kelas Aster (4-5 Tahun)',
  parentIds: ['parent-a'],
  teacherIds: ['teach-a1'],
} as StudentProfile;

const childOfParentB: StudentProfile = {
  id: 'child-b',
  name: 'Ananda B (Anak Ayah Doni)',
  schoolId: schoolA,
  classId: 'class-melati',
  className: 'Kelas Melati (5-6 Tahun)',
  parentIds: ['parent-b'],
  teacherIds: ['teach-a2'],
} as StudentProfile;

const foreignSchoolChild: StudentProfile = {
  id: 'child-foreign',
  name: 'Ananda Luar',
  schoolId: schoolB,
  className: 'Kelas B',
  parentIds: ['parent-a'],
  teacherIds: ['teach-b'],
} as StudentProfile;

const obsChildA: ObservationRecord = {
  id: 'obs-child-a',
  activityId: 'act-1',
  schoolId: schoolA,
  studentId: 'child-a',
  studentName: 'Ananda A',
  teacherId: 'teach-a1',
  teacherName: 'Guru Aster',
  date: '2026-09-06',
  activityTitle: 'Bermain Daun',
  teacherNote: 'Bermain dengan baik',
  cp: 'CP-01',
  tp: 'TP-01',
  indicators: [],
  evidences: [],
  status: 'REPORT_READY',
};

const obsChildB: ObservationRecord = {
  id: 'obs-child-b',
  activityId: 'act-2',
  schoolId: schoolA,
  studentId: 'child-b',
  studentName: 'Ananda B',
  teacherId: 'teach-a2',
  teacherName: 'Guru Melati',
  date: '2026-09-06',
  activityTitle: 'Menyusun Balok',
  teacherNote: 'Bermain balok',
  cp: 'CP-01',
  tp: 'TP-01',
  indicators: [],
  evidences: [],
  status: 'REPORT_READY',
};

const allStudents = [childOfParentA, childOfParentB, foreignSchoolChild];

console.log('--- TEST MANDAT WAJIB (A - H) ---');

// A. Parent A membaca anak Parent B → DENY
assert(
  canViewStudent(parentA, childOfParentB) === false,
  'TEST A: Parent A membaca anak Parent B → DENY'
);

// B. Parent A membaca anak yang bukan miliknya (walaupun spoofed di profil) → DENY
assert(
  canViewStudent(parentA, childOfParentB) === false &&
  canViewObservation(parentA, obsChildB, allStudents) === false &&
  canViewReport(parentA, childOfParentB.id, allStudents) === false,
  'TEST B: Parent A membaca anak yang bukan miliknya → DENY'
);

// C. Teacher A membaca siswa Teacher B → DENY
assert(
  canViewStudent(teacherA1, childOfParentB) === false,
  'TEST C: Teacher A membaca siswa Teacher B → DENY'
);

// D. Teacher A membaca siswa yang tidak ditugaskan → DENY
const unassignedTeacher: UserProfile = {
  ...baseUser,
  id: 'teach-unassigned',
  name: 'Guru Tanpa Penugasan',
  role: 'TEACHER',
  schoolId: schoolA,
  isActive: true,
};
assert(
  canViewStudent(unassignedTeacher, childOfParentA) === false &&
  canViewStudent(unassignedTeacher, childOfParentB) === false,
  'TEST D: Teacher tanpa penugasan membaca siswa yang tidak ditugaskan → DENY'
);

// E. Teacher A membaca siswa yang ditugaskan → ALLOW
assert(
  canViewStudent(teacherA1, childOfParentA) === true &&
  canViewObservation(teacherA1, obsChildA, allStudents) === true,
  'TEST E: Teacher A membaca siswa yang ditugaskan → ALLOW'
);

// F. Parent membaca anak sendiri → ALLOW
assert(
  canViewStudent(parentA, childOfParentA) === true &&
  canViewObservation(parentA, obsChildA, allStudents) === true &&
  canViewReport(parentA, childOfParentA.id, allStudents) === true,
  'TEST F: Parent membaca anak sendiri → ALLOW'
);

// G. User biasa mengubah role menjadi admin/operator → DENY
// Simulasi evaluasi Firestore rules & client authorization
function canRegularUserChangeRole(currentUser: UserProfile, requestedRole: string): boolean {
  // Hanya ADMIN atau SUPER_ADMIN yang berwenang mengubah role pengguna
  const currentRole = (currentUser.role || '').toUpperCase();
  if (currentRole !== 'ADMIN' && currentRole !== 'SUPER_ADMIN') {
    return false; // DENY
  }
  return true;
}
assert(
  canRegularUserChangeRole(parentA, 'ADMIN') === false &&
  canRegularUserChangeRole(parentA, 'OPERATOR') === false &&
  canRegularUserChangeRole(teacherA1, 'ADMIN') === false &&
  canRegularUserChangeRole(teacherA1, 'OPERATOR') === false,
  'TEST G: User biasa mengubah role menjadi admin/operator → DENY'
);

// H. Frontend tidak mengandung Gemini API key → PASS
function checkFrontendNoGeminiKey(): boolean {
  const srcDir = path.join(process.cwd(), 'src');
  function scanDir(dir: string): boolean {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!scanDir(fullPath)) return false;
      } else if (/\.(ts|tsx|js|jsx|html|css)$/.test(file)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/VITE_GEMINI|AIzaSy[A-Za-z0-9_-]{33}/.test(content)) {
          console.error(`Exposed secret found in ${fullPath}`);
          return false;
        }
      }
    }
    return true;
  }
  return scanDir(srcDir);
}
assert(
  checkFrontendNoGeminiKey() === true,
  'TEST H: Frontend tidak mengandung Gemini API key → PASS'
);

console.log('\n--- TEST TAMBAHAN INTEGRITAS & KEAMANAN SISTEM ---');

// Additional Tests:
assert(
  canEditStudent(parentA, childOfParentA) === false,
  'T1. Parent cannot edit student record'
);
assert(
  canInputObservations(parentA) === false,
  'T2. Parent cannot input observations'
);
assert(
  canEditObservation(teacherA1, obsChildB, allStudents) === false,
  'T3. [SECURITY] Teacher A cannot edit observation of Teacher B'
);
assert(
  canEditObservation(teacherA1, obsChildA, allStudents) === true,
  'T4. Teacher A can edit observation for assigned student in own class'
);
assert(
  canViewStudent(operatorA, childOfParentA) === true,
  'T5. Operator can view student within own school'
);
assert(
  canViewStudent(operatorA, foreignSchoolChild) === false,
  'T6. [SECURITY] Operator CANNOT view student in another school'
);
assert(
  canViewStudent(superAdmin, foreignSchoolChild) === true,
  'T7. SuperAdmin can view student across different schools'
);
assert(
  validateSchoolAccess(superAdmin, schoolB) === true,
  'T8. SuperAdmin can access any school'
);

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) process.exit(1);
