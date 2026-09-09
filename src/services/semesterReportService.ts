import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  DevelopmentalAspect,
  ObservationRecord,
  RatingLevel,
  SemesterAspectAssessment,
  SemesterNumber,
  SemesterReport,
  SemesterReportStatus,
  StudentProfile,
  UserRole,
} from '../types';
import { normalizeSemester, formatSemesterLabel } from '../utils/semesterUtils';
import { auditLogService } from './auditLogService';

const COLLECTION_NAME = 'semesterReports';

const ASPECT_TITLES: Record<DevelopmentalAspect, string> = {
  NAM: 'Nilai Agama & Budi Pekerti',
  JATI_DIRI: 'Jati Diri & Sosial Emosional',
  LITERASI_STEAM: 'Literasi & STEAM',
  MOTORIK_KASAR: 'Motorik Kasar',
  MOTORIK_HALUS: 'Motorik Halus',
  KOGNITIF: 'Kognitif',
};

export const semesterReportService = {
  /**
   * Mengambil laporan semester spesifik berdasarkan:
   * studentId + enrollmentId + academicYearId + semester
   */
  async getSemesterReport(
    studentId: string,
    enrollmentId: string,
    academicYearId: string,
    semester: SemesterNumber | any
  ): Promise<SemesterReport | null> {
    if (!auth.currentUser) return null;

    const normSem = normalizeSemester(semester);
    const reportId = `rep-sem-${studentId}-${academicYearId}-${normSem}`;

    try {
      const docRef = doc(db, COLLECTION_NAME, reportId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as SemesterReport;
      }
    } catch (err) {
      console.warn('Gagal membaca dokumen semesterReport:', err);
    }
    return null;
  },

  /**
   * Mengambil semua laporan semester untuk sekolah atau kelas tertentu
   */
  async getReportsBySchool(
    schoolId: string,
    filters?: {
      academicYearId?: string;
      classId?: string;
      semester?: SemesterNumber;
      status?: SemesterReportStatus;
    }
  ): Promise<SemesterReport[]> {
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
      if (filters?.semester) {
        constraints.push(where('semester', '==', filters.semester));
      }
      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      return snap.docs.map((d) => d.data() as SemesterReport);
    } catch (err) {
      console.warn('Gagal mengambil daftar semester reports:', err);
      return [];
    }
  },

  /**
   * Filter observasi khusus yang COCOK dengan studentId, academicYearId, dan semester
   * (Menggunakan normalisasi ketat, BUKAN String.includes!)
   */
  filterObservationsForSemester(
    observations: ObservationRecord[],
    studentId: string,
    academicYearId: string,
    academicYearName: string,
    targetSemester: SemesterNumber
  ): ObservationRecord[] {
    return observations.filter((obs) => {
      // 1. Siswa harus sama
      if (obs.studentId !== studentId) return false;

      // 2. Tahun Ajaran harus cocok (cek ID atau fallback Nama untuk kompatibilitas data lama)
      if (obs.academicYearId) {
        if (obs.academicYearId !== academicYearId) return false;
      } else if (obs.academicYear) {
        if (obs.academicYear.trim() !== academicYearName.trim()) return false;
      }

      // 3. Semester harus cocok secara presisi via normalisasi ketat
      const rawSemesterVal = obs.semesterNumber || obs.semester;
      if (rawSemesterVal !== undefined && rawSemesterVal !== null) {
        const obsSem = normalizeSemester(rawSemesterVal);
        if (obsSem !== targetSemester) return false;
      }

      return true;
    });
  },

  /**
   * Komputasi aspek dan narasi perkembangan berdasarkan data observasi nyata
   */
  compileSemesterReport(
    student: StudentProfile,
    enrollmentId: string,
    academicYearId: string,
    academicYearName: string,
    semester: SemesterNumber,
    rawObservations: ObservationRecord[],
    currentTeacher?: { id: string; name: string }
  ): SemesterReport {
    const targetSemester = normalizeSemester(semester);
    const matchingObs = this.filterObservationsForSemester(
      rawObservations,
      student.id,
      academicYearId,
      academicYearName,
      targetSemester
    );

    const aspectKeys: DevelopmentalAspect[] = [
      'NAM',
      'JATI_DIRI',
      'LITERASI_STEAM',
      'MOTORIK_KASAR',
      'MOTORIK_HALUS',
      'KOGNITIF',
    ];

    const aspectsMap: Record<DevelopmentalAspect, SemesterAspectAssessment> = {} as any;
    const generalStrengths: string[] = [];
    const areasToDevelop: string[] = [];

    aspectKeys.forEach((aspect) => {
      // Kumpulkan observasi untuk aspek ini
      const aspectObs = matchingObs.filter((o) => {
        if ((o as any).aspect === aspect) return true;
        return o.indicators && o.indicators.some((ind) => ind.aspect === aspect || ind.aspectId === aspect);
      });

      let totalScores = 0;
      let scoreCount = 0;
      let evidenceCount = 0;
      const strengthsList: string[] = [];
      const devList: string[] = [];

      aspectObs.forEach((o) => {
        evidenceCount += o.evidences ? o.evidences.length : 0;
        o.indicators?.forEach((ind) => {
          if (ind.aspect === aspect || ind.aspectId === aspect) {
            const r = ind.rating;
            if (r === 'BSB') {
              totalScores += 100;
              scoreCount++;
              strengthsList.push(ind.text);
            } else if (r === 'BSH') {
              totalScores += 75;
              scoreCount++;
            } else if (r === 'MB') {
              totalScores += 50;
              scoreCount++;
              devList.push(ind.text);
            } else if (r === 'BB') {
              totalScores += 25;
              scoreCount++;
              devList.push(ind.text);
            }
          }
        });
      });

      const avgScore = scoreCount > 0 ? Math.round(totalScores / scoreCount) : 0;
      let ratingLevel: RatingLevel = 'BELUM_DINILAI';
      if (scoreCount > 0) {
        if (avgScore >= 85) ratingLevel = 'BSB';
        else if (avgScore >= 65) ratingLevel = 'BSH';
        else if (avgScore >= 45) ratingLevel = 'MB';
        else ratingLevel = 'BB';
      }

      if (ratingLevel === 'BSB' || ratingLevel === 'BSH') {
        generalStrengths.push(
          `Capaian ${ASPECT_TITLES[aspect]}: Ananda menunjukkan perkembangan yang sangat baik.`
        );
      } else if (ratingLevel === 'MB' || ratingLevel === 'BB') {
        areasToDevelop.push(
          `Pendampingan ${ASPECT_TITLES[aspect]}: Perlu stimulasi lanjutan melalui kegiatan bermain terpimpin.`
        );
      }

      aspectsMap[aspect] = {
        aspect,
        aspectName: ASPECT_TITLES[aspect],
        scorePercentage: avgScore,
        ratingLevel,
        observationsCount: aspectObs.length,
        evidenceCount,
        strengths: Array.from(new Set(strengthsList)).slice(0, 3),
        needsDevelopment: Array.from(new Set(devList)).slice(0, 3),
        teacherNotes:
          aspectObs.length > 0
            ? `Berdasarkan ${aspectObs.length} catatan observasi dengan ${evidenceCount} bukti dokumentasi.`
            : 'Belum ada observasi spesifik pada periode ini.',
      };
    });

    const recommendations = [
      'Pertahankan pembiasaan positif yang telah dibangun di lingkungan sekolah.',
      'Dukung eksplorasi rasa ingin tahu anak melalui tanya-jawab dan penyediaan bahan lepasan (loose parts) di rumah.',
      'Tingkatkan aktivitas fisik motorik terkoordinasi secara teratur.',
    ];

    const homeStimulationAdvice = [
      'Ajak anak bercerita mengenai pengalamannya beraktivitas setiap hari.',
      'Libatkan anak dalam tugas-tugas harian sederhana untuk melatih kemandirian.',
      'Sediakan buku cerita bergambar yang menyenangkan sebelum waktu tidur.',
    ];

    const reportId = `rep-sem-${student.id}-${academicYearId}-${targetSemester}`;

    return {
      id: reportId,
      schoolId: student.schoolId || 'main-school',
      studentId: student.id,
      studentName: student.name,
      studentNickname: student.nickname,
      enrollmentId,
      academicYearId,
      academicYearName,
      semester: targetSemester,
      classId: student.classId || '',
      className: student.className || '',
      teacherId: currentTeacher?.id,
      teacherName: currentTeacher?.name,
      status: 'DRAFT',
      totalObservations: matchingObs.length,
      aspects: aspectsMap,
      generalStrengths: generalStrengths.slice(0, 4),
      areasToDevelop: areasToDevelop.slice(0, 4),
      overallTeacherNote: `Rekap perkembangan ${formatSemesterLabel(targetSemester)} Tahun Ajaran ${academicYearName}. Total observasi terdata: ${matchingObs.length}.`,
      recommendations,
      homeStimulationAdvice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Simpan atau perbarui laporan semester
   */
  async saveSemesterReport(report: SemesterReport): Promise<SemesterReport> {
    const docRef = doc(db, COLLECTION_NAME, report.id);

    // Cek apakah sudah FINAL di database. Jika sudah FINAL dan tidak ada override, tolak overwrite!
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      const existing = existingSnap.data() as SemesterReport;
      if (existing.status === 'FINAL' && report.status !== 'FINAL') {
        throw new Error(
          'Laporan semester ini sudah berstatus FINAL (terkunci). Snapshot laporan tidak dapat diubah sembarangan.'
        );
      }
    }

    const payload = {
      ...report,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, payload, { merge: true });
    return payload as SemesterReport;
  },

  /**
   * Finalisasi laporan semester (Status -> FINAL, simpan snapshot data)
   */
  async finalizeSemesterReport(
    reportId: string,
    actorRole: UserRole | string = 'TEACHER',
    actorName?: string
  ): Promise<SemesterReport> {
    const docRef = doc(db, COLLECTION_NAME, reportId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Dokumen laporan semester tidak ditemukan.');
    }

    const currentData = snap.data() as SemesterReport;
    const finalizedTimestamp = new Date().toISOString();

    const finalizedReport: SemesterReport = {
      ...currentData,
      status: 'FINAL',
      finalizedAt: finalizedTimestamp,
      finalizedBy: auth.currentUser?.uid || 'user',
      snapshotData: {
        ...currentData,
        status: 'FINAL',
        finalizedAt: finalizedTimestamp,
      },
      updatedAt: finalizedTimestamp,
    };

    await setDoc(docRef, finalizedReport);

    await auditLogService.logAction({
      schoolId: currentData.schoolId,
      actorUserId: auth.currentUser?.uid || 'user',
      actorRole,
      actorName,
      action: 'FINALIZE_SEMESTER_REPORT',
      targetType: 'SEMESTER_REPORT',
      targetId: reportId,
      targetName: `Laporan Semester ${currentData.semester} - ${currentData.studentName}`,
      metadata: {
        studentId: currentData.studentId,
        semester: currentData.semester,
        academicYearId: currentData.academicYearId,
      },
    });

    return finalizedReport;
  },
};
