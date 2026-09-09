import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  AnnualReport,
  AnnualReportDecision,
  DevelopmentalAspect,
  SemesterReport,
  StudentProfile,
  UserRole,
} from '../types';
import { semesterReportService } from './semesterReportService';
import { auditLogService } from './auditLogService';

const COLLECTION_NAME = 'annualReports';

export const annualReportService = {
  /**
   * Ambil laporan tahunan berdasarkan studentId dan academicYearId
   */
  async getAnnualReport(
    studentId: string,
    academicYearId: string
  ): Promise<AnnualReport | null> {
    if (!auth.currentUser) return null;

    const id = `rep-ann-${studentId}-${academicYearId}`;
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as AnnualReport;
      }
    } catch (err) {
      console.warn('Gagal membaca annual report:', err);
    }
    return null;
  },

  /**
   * Ambil daftar laporan tahunan untuk sekolah
   */
  async getAnnualReports(
    schoolId: string,
    filters?: { academicYearId?: string; classId?: string }
  ): Promise<AnnualReport[]> {
    if (!auth.currentUser) return [];

    try {
      const colRef = collection(db, COLLECTION_NAME);
      let constraints: any[] = [where('schoolId', '==', schoolId)];

      if (filters?.academicYearId) {
        constraints.push(where('academicYearId', '==', filters.academicYearId));
      }
      if (filters?.classId) {
        constraints.push(where('classId', '==', filters.classId));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      return snap.docs.map((d) => d.data() as AnnualReport);
    } catch (err) {
      console.warn('Gagal mengambil daftar annual reports:', err);
      return [];
    }
  },

  /**
   * Susun Laporan Tahunan menggabungkan Semester 1 dan Semester 2
   */
  async generateAnnualReport(
    student: StudentProfile,
    enrollmentId: string,
    academicYearId: string,
    academicYearName: string,
    defaultDecision: AnnualReportDecision = 'PROMOTED',
    currentTeacher?: { id: string; name: string }
  ): Promise<AnnualReport> {
    const sem1Report = await semesterReportService.getSemesterReport(
      student.id,
      enrollmentId,
      academicYearId,
      1
    );

    const sem2Report = await semesterReportService.getSemesterReport(
      student.id,
      enrollmentId,
      academicYearId,
      2
    );

    const aspectKeys: DevelopmentalAspect[] = [
      'NAM',
      'JATI_DIRI',
      'LITERASI_STEAM',
      'MOTORIK_KASAR',
      'MOTORIK_HALUS',
      'KOGNITIF',
    ];

    const s1Averages: Record<DevelopmentalAspect, number> = {} as any;
    const s2Averages: Record<DevelopmentalAspect, number> = {} as any;

    aspectKeys.forEach((k) => {
      s1Averages[k] = sem1Report?.aspects?.[k]?.scorePercentage || 0;
      s2Averages[k] = sem2Report?.aspects?.[k]?.scorePercentage || 0;
    });

    const combinedStrengths: string[] = [];
    if (sem1Report?.generalStrengths) combinedStrengths.push(...sem1Report.generalStrengths);
    if (sem2Report?.generalStrengths) combinedStrengths.push(...sem2Report.generalStrengths);

    const uniqueStrengths = Array.from(new Set(combinedStrengths)).slice(0, 5);

    const recommendations = [
      'Terus kembangkan rasa ingin tahu, empati, dan kolaborasi positif bersama teman sebaya.',
      'Dukung kemandirian dalam merawat diri dan mengelola emosi secara adaptif.',
    ];

    const reportId = `rep-ann-${student.id}-${academicYearId}`;

    const totalObs =
      (sem1Report?.totalObservations || 0) + (sem2Report?.totalObservations || 0);

    const overview = `Rekapitulasi Perkembangan Tahunan Tahun Ajaran ${academicYearName}. Total observasi terintegrasi sepanjang tahun: ${totalObs} observasi (Semester 1: ${sem1Report?.totalObservations || 0}, Semester 2: ${sem2Report?.totalObservations || 0}).`;

    return {
      id: reportId,
      schoolId: student.schoolId || 'main-school',
      studentId: student.id,
      studentName: student.name,
      studentNickname: student.nickname,
      enrollmentId,
      academicYearId,
      academicYearName,
      classId: student.classId || '',
      className: student.className || '',
      teacherId: currentTeacher?.id,
      teacherName: currentTeacher?.name,
      semester1ReportId: sem1Report?.id,
      semester2ReportId: sem2Report?.id,
      semester1Summary: {
        totalObservations: sem1Report?.totalObservations || 0,
        aspectAverages: s1Averages,
      },
      semester2Summary: {
        totalObservations: sem2Report?.totalObservations || 0,
        aspectAverages: s2Averages,
      },
      annualProgressOverview: overview,
      strengths: uniqueStrengths,
      recommendations,
      finalDecision: defaultDecision,
      isFinal: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Simpan atau update Annual Report
   */
  async saveAnnualReport(report: AnnualReport): Promise<AnnualReport> {
    const docRef = doc(db, COLLECTION_NAME, report.id);
    const payload = {
      ...report,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    return payload as AnnualReport;
  },

  /**
   * Finalisasi Annual Report (terkunci dan dicatat di audit log)
   */
  async finalizeAnnualReport(
    reportId: string,
    actorRole: UserRole | string = 'PRINCIPAL',
    actorName?: string
  ): Promise<AnnualReport> {
    const docRef = doc(db, COLLECTION_NAME, reportId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Laporan tahunan tidak ditemukan.');
    }

    const currentData = snap.data() as AnnualReport;
    const timestamp = new Date().toISOString();

    const finalized: AnnualReport = {
      ...currentData,
      isFinal: true,
      finalizedAt: timestamp,
      finalizedBy: auth.currentUser?.uid || 'user',
      updatedAt: timestamp,
    };

    await setDoc(docRef, finalized);

    await auditLogService.logAction({
      schoolId: currentData.schoolId,
      actorUserId: auth.currentUser?.uid || 'user',
      actorRole,
      actorName,
      action: 'FINALIZE_ANNUAL_REPORT',
      targetType: 'ANNUAL_REPORT',
      targetId: reportId,
      targetName: `Laporan Tahunan - ${currentData.studentName}`,
      metadata: {
        studentId: currentData.studentId,
        academicYearId: currentData.academicYearId,
        finalDecision: currentData.finalDecision,
      },
    });

    return finalized;
  },
};
