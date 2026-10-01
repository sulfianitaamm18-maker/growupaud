import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Calendar,
  User,
  Download,
  Eye,
  Sparkles,
  CheckCircle2,
  Clock,
  Award,
  ShieldCheck,
  Share2,
  Copy,
  Check,
  Heart,
  Compass,
  Lightbulb,
  MessageSquare,
  Image as ImageIcon,
  PenTool,
  Stamp,
  RotateCcw,
} from 'lucide-react';
import { StudentProfile, ObservationRecord } from '../../types';
import {
  calculateStudentAspectScores,
  calculateOverallScore,
  getAchievementPredicate,
} from '../../utils/studentMetrics';
import { schoolStore } from '../../services/schoolStore';
import { calculateStudentReportData } from '../../utils/reportCalculator';
import { generateStudentReportDocx } from '../../services/docxReportGenerator';
import { generateStudentReportPdf } from '../../services/pdfReportGenerator';
import { ChildDevelopmentTrendChart } from '../ortu/ChildDevelopmentTrendChart';
import {
  digitalSignatureService,
  DigitalSignatureData,
  ReportAuthorizationRecord,
} from '../../services/digitalSignatureService';
import { DigitalSignatureModal } from '../reports/DigitalSignatureModal';

interface GuruReportViewProps {
  students?: StudentProfile[];
  observations?: ObservationRecord[];
  onOpenReportPreview: (student: StudentProfile) => void;
}

export const GuruReportView: React.FC<GuruReportViewProps> = ({
  students = [],
  observations = [],
  onOpenReportPreview,
}) => {
  // Selection states
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return students && students.length > 0 ? students[0].id : '';
  });

  const [reportType, setReportType] = useState<'SEMESTER' | 'HARIAN'>('SEMESTER');

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [selectedSemester, setSelectedSemester] = useState<string>('Semester I (Ganjil)');
  const [academicYear, setAcademicYear] = useState<string>('2026/2027');

  // Loading & Toast states
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedWa, setCopiedWa] = useState(false);

  // Digital Signature & Official Authorization State
  const [authorization, setAuthorization] = useState<ReportAuthorizationRecord | null>(null);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [signingRole, setSigningRole] = useState<'TEACHER' | 'PRINCIPAL'>('TEACHER');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  const school = useMemo(() => schoolStore.getSchoolProfile(), []);

  // Load existing authorization from storage for this student and academic period
  useEffect(() => {
    if (selectedStudent) {
      const rec = digitalSignatureService.getStoredAuthorization(
        selectedStudent.id,
        academicYear,
        selectedSemester
      );
      setAuthorization(rec);
    }
  }, [selectedStudent, academicYear, selectedSemester]);

  const handleAuthorized = (data: DigitalSignatureData) => {
    if (!selectedStudent) return;
    const currentRec: ReportAuthorizationRecord = authorization || {
      studentId: selectedStudent.id,
      academicYear,
      semester: selectedSemester,
      teacherSignature: null,
      principalSignature: null,
      parentSignature: null,
      status: 'UNAUTHORIZED',
      lastUpdated: new Date().toISOString(),
    };

    if (data.role === 'TEACHER') {
      currentRec.teacherSignature = data;
    } else if (data.role === 'PRINCIPAL') {
      currentRec.principalSignature = data;
    }

    const hasTeacher = Boolean(currentRec.teacherSignature?.isAuthorized);
    const hasPrincipal = Boolean(currentRec.principalSignature?.isAuthorized);

    currentRec.status =
      hasTeacher && hasPrincipal
        ? 'FULLY_AUTHORIZED'
        : hasTeacher || hasPrincipal
        ? 'PARTIALLY_AUTHORIZED'
        : 'UNAUTHORIZED';
    currentRec.lastUpdated = new Date().toISOString();

    digitalSignatureService.saveStoredAuthorization(currentRec);
    setAuthorization({ ...currentRec });
    showToast(
      `Otorisasi resmi sebagai ${data.signerTitle} (${data.signerName}) berhasil disahkan pada rapor.`
    );
  };

  const handleRevokeSignature = (targetRole: 'TEACHER' | 'PRINCIPAL') => {
    if (!selectedStudent) return;
    const updated = digitalSignatureService.removeSignature(
      selectedStudent.id,
      academicYear,
      selectedSemester,
      targetRole
    );
    setAuthorization({ ...updated });
    showToast(
      `Otorisasi ${targetRole === 'PRINCIPAL' ? 'Kepala Sekolah' : 'Guru'} telah dibatalkan.`
    );
  };

  // Filter observations by student and period
  const periodObservations = useMemo(() => {
    if (!selectedStudent) return [];

    const studentObs = observations.filter(
      (o) => o.studentId === selectedStudent.id || (o as any).student_id === selectedStudent.id
    );

    if (reportType === 'HARIAN') {
      return studentObs.filter((o) => {
        const obsDate = o.observationDateISO || o.date || '';
        return obsDate.includes(selectedDate) || o.date === selectedDate;
      });
    }

    // SEMESTER: all observations in this semester
    return studentObs.filter((o) => {
      if (o.semester && o.semester !== selectedSemester) return false;
      return true;
    });
  }, [observations, selectedStudent, reportType, selectedDate, selectedSemester]);

  // SSoT Metrics
  const aspectScores = useMemo(() => {
    return calculateStudentAspectScores(periodObservations);
  }, [periodObservations]);

  const overallScore = useMemo(() => {
    return calculateOverallScore(aspectScores);
  }, [aspectScores]);

  const overallPredicate = useMemo(() => {
    return getAchievementPredicate(overallScore);
  }, [overallScore]);

  // Report Calculations & Official Narratives
  const reportData = useMemo(() => {
    if (!selectedStudent) return null;
    return calculateStudentReportData(selectedStudent, periodObservations, school, {
      digitalSignatures: {
        teacher: authorization?.teacherSignature,
        principal: authorization?.principalSignature,
        parent: authorization?.parentSignature,
      },
    });
  }, [selectedStudent, periodObservations, school, authorization]);

  // 3 Elemen Kurikulum Merdeka score mapping
  const elemenScores = useMemo(() => {
    return {
      agama: aspectScores['NILAI_AGAMA_DAN_BUDI_PEKERTI'] ?? null,
      jatiDiri: aspectScores['JATI_DIRI'] ?? null,
      steam: aspectScores['DASAR_LITERASI_DAN_STEAM'] ?? null,
    };
  }, [aspectScores]);

  // Direct PDF Download
  const handleDownloadPdf = async () => {
    if (!selectedStudent || !reportData) return;
    setIsDownloadingPdf(true);
    try {
      await generateStudentReportPdf({
        student: selectedStudent,
        reportData,
        schoolProfile: school,
        canonicalDoc: reportData.canonicalDoc,
      });
      showToast(`Rapor PDF ${selectedStudent.name} berhasil diunduh.`);
    } catch (err) {
      console.error('PDF download error:', err);
      showToast('Gagal mengunduh PDF. Silakan coba buka Pratinjau.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Direct DOCX Download
  const handleDownloadDocx = async () => {
    if (!selectedStudent || !reportData) return;
    setIsDownloadingDocx(true);
    try {
      await generateStudentReportDocx({ canonicalDoc: reportData.canonicalDoc });
      showToast(`Rapor DOCX Word ${selectedStudent.name} berhasil diunduh.`);
    } catch (err) {
      console.error('DOCX download error:', err);
      showToast('Gagal mengunduh Word. Silakan coba lagi.');
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  // Quick Copy to WhatsApp for Daily Report
  const handleCopyWhatsappDaily = () => {
    if (!selectedStudent || periodObservations.length === 0) return;
    const activitiesList = periodObservations
      .map(
        (o, i) =>
          `${i + 1}. *${o.activityTitle}*\n   Catatan Guru: ${
            o.teacherNote || 'Ananda aktif dan berpartisipasi dengan ceria.'
          }`
      )
      .join('\n\n');

    const text =
      `*LAPORAN HARIAN BELAJAR & BERMAIN PAUD*\n` +
      `🏫 *${school.name || 'PAUD Terpadu'}*\n` +
      `📅 *Hari/Tanggal:* ${selectedDate}\n` +
      `👶 *Ananda:* ${selectedStudent.name} (${selectedStudent.className || 'Kelas PAUD'})\n\n` +
      `🌟 *Ringkasan Aktivitas Hari Ini:*\n${activitiesList}\n\n` +
      `Dokumentasi foto dan capaian belajar lengkap dapat dilihat langsung melalui Portal Orang Tua GrowUPAUD.\n\n` +
      `Salam hangat,\n*Wali Kelas:* ${selectedStudent.teacherName || 'Guru Pendamping'}`;

    navigator.clipboard.writeText(text);
    setCopiedWa(true);
    showToast('Teks laporan harian berhasil disalin untuk WhatsApp Orang Tua.');
    setTimeout(() => setCopiedWa(false), 3000);
  };

  if (!selectedStudent) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
        <User className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Belum Ada Peserta Didik</h3>
        <p className="text-xs text-slate-500">Silakan tambahkan data anak terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" id="guru-report-view">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold border border-slate-700 animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER KONTROL UTAMA (Rapi, Ringkas & Bersih) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        {/* Baris 1: Mode Switcher & Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setReportType('SEMESTER')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === 'SEMESTER'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Laporan Semester</span>
            </button>

            <button
              type="button"
              onClick={() => setReportType('HARIAN')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === 'HARIAN'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Laporan Harian</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {reportType === 'HARIAN' ? (
              <button
                type="button"
                onClick={handleCopyWhatsappDaily}
                disabled={periodObservations.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {copiedWa ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWa ? 'Tersalin!' : 'Salin untuk WA'}</span>
              </button>
            ) : null}

            {reportType === 'SEMESTER' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSigningRole('TEACHER');
                    setIsSigningModalOpen(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 ${
                    authorization?.teacherSignature?.isAuthorized
                      ? 'bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100'
                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                  }`}
                  title="Bubuhkan Tanda Tangan Guru Wali Kelas"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>
                    {authorization?.teacherSignature?.isAuthorized
                      ? '✓ TTD Guru (Sah)'
                      : '✍️ Tanda Tangani Guru'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSigningRole('PRINCIPAL');
                    setIsSigningModalOpen(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 ${
                    authorization?.principalSignature?.isAuthorized
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  title="Pengesahan Resmi Kepala Sekolah"
                >
                  <Stamp className="w-3.5 h-3.5" />
                  <span>
                    {authorization?.principalSignature?.isAuthorized
                      ? '✓ Disahkan KS'
                      : '🔏 Sahkan KS'}
                  </span>
                </button>
              </div>
            )}

            <button
              onClick={() => onOpenReportPreview(selectedStudent)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau Rapor (A4)</span>
            </button>

            <button
              disabled={isDownloadingPdf || periodObservations.length === 0}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isDownloadingPdf ? 'Membuat...' : 'PDF'}</span>
            </button>

            <button
              disabled={isDownloadingDocx || periodObservations.length === 0}
              onClick={handleDownloadDocx}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>DOCX</span>
            </button>
          </div>
        </div>

        {/* Baris 2: Pemilihan Peserta Didik & Periode (Kompak & Elegan) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
          <div className="sm:col-span-6 flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 shrink-0">Siswa:</label>
            <select
              value={selectedStudent.id}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.className || 'Kelas'})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-6 flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 shrink-0">Periode:</label>
            {reportType === 'HARIAN' ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
              />
            ) : (
              <div className="flex gap-2 w-full">
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-2/3 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                >
                  <option value="Semester I (Ganjil)">Semester I (Ganjil)</option>
                  <option value="Semester II (Genap)">Semester II (Genap)</option>
                </select>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026/2027"
                  className="w-1/3 px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 text-center"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAMPILAN LAPORAN SEMESTER GURU (RAPI, FOKUS & BERSIH)    */}
      {/* ========================================================= */}
      {reportType === 'SEMESTER' && (
        <div className="space-y-6 animate-fadeIn">
          {/* KARTU 1: RINGKASAN CAPAIAN SEMESTER & 3 ELEMEN KURIKULUM MERDEKA */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Profil & Predikat Akhir */}
              <div className="lg:col-span-5 space-y-4 lg:pr-6 lg:border-r lg:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-lg flex items-center justify-center border border-emerald-200 shrink-0">
                    {selectedStudent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                      {selectedStudent.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedStudent.className || 'Kelompok PAUD'} • NISN: {selectedStudent.nisn || '-'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {school.name || 'PAUD Terpadu'} • {selectedSemester}
                    </span>
                  </div>
                </div>

                {/* Status Capaian Akhir */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Status Capaian Semester
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-emerald-800">
                      {overallScore !== null ? `${overallScore}%` : 'Dalam Proses'}
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {overallPredicate.conditionLabel} ({overallPredicate.code})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Berdasarkan {periodObservations.length} kegiatan belajar dan pengamatan terobservasi.
                  </p>
                </div>

                {/* Status & Tombol Pengesahan Resmi Guru & Kepala Sekolah */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Status Otorisasi Dokumen
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        authorization?.status === 'FULLY_AUTHORIZED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : authorization?.status === 'PARTIALLY_AUTHORIZED'
                          ? 'bg-sky-100 text-sky-800 border-sky-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {authorization?.status === 'FULLY_AUTHORIZED'
                        ? '✓ Sah Lengkap'
                        : authorization?.status === 'PARTIALLY_AUTHORIZED'
                        ? 'Sebagian Sah'
                        : 'Belum Ditandatangani'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                    {/* Guru Button */}
                    {authorization?.teacherSignature?.isAuthorized ? (
                      <div className="p-2.5 rounded-xl bg-white border border-sky-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-sky-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-sky-600" /> Guru Sah
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevokeSignature('TEACHER')}
                            className="text-[9px] text-rose-500 hover:underline cursor-pointer"
                            title="Batalkan tanda tangan guru"
                          >
                            Batal
                          </button>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-800 truncate mt-1">
                          {authorization.teacherSignature.signerName}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSigningRole('TEACHER');
                            setIsSigningModalOpen(true);
                          }}
                          className="mt-1 text-[10px] text-sky-600 hover:text-sky-800 font-bold text-left cursor-pointer flex items-center gap-1"
                        >
                          <PenTool className="w-2.5 h-2.5" /> Ganti TTD
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSigningRole('TEACHER');
                          setIsSigningModalOpen(true);
                        }}
                        className="p-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 text-left transition cursor-pointer flex flex-col justify-between active:scale-95"
                      >
                        <span className="text-[10px] font-bold text-sky-700 flex items-center gap-1">
                          <PenTool className="w-3 h-3" /> Tanda Tangan Guru
                        </span>
                        <span className="text-[11px] font-bold text-sky-950 mt-1">
                          + Bubuhkan TTD
                        </span>
                      </button>
                    )}

                    {/* Kepala Sekolah Button */}
                    {authorization?.principalSignature?.isAuthorized ? (
                      <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> KS Sah
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevokeSignature('PRINCIPAL')}
                            className="text-[9px] text-rose-500 hover:underline cursor-pointer"
                            title="Batalkan pengesahan kepala sekolah"
                          >
                            Batal
                          </button>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-800 truncate mt-1">
                          {authorization.principalSignature.signerName}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSigningRole('PRINCIPAL');
                            setIsSigningModalOpen(true);
                          }}
                          className="mt-1 text-[10px] text-emerald-700 hover:text-emerald-900 font-bold text-left cursor-pointer flex items-center gap-1"
                        >
                          <Stamp className="w-2.5 h-2.5" /> Ganti Sahkan
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSigningRole('PRINCIPAL');
                          setIsSigningModalOpen(true);
                        }}
                        className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-left transition cursor-pointer flex flex-col justify-between active:scale-95"
                      >
                        <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                          <Stamp className="w-3 h-3" /> Pengesahan KS
                        </span>
                        <span className="text-[11px] font-bold text-emerald-950 mt-1">
                          + Sahkan (KS)
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 3 Elemen Capaian Pembelajaran Kurikulum Merdeka */}
              <div className="lg:col-span-7 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Capaian 3 Elemen Pembelajaran PAUD
                  </h4>
                  <span className="text-[11px] text-slate-400">Semester I</span>
                </div>

                <div className="space-y-3">
                  {/* Elemen 1: Nilai Agama & Budi Pekerti */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        1. Nilai Agama &amp; Budi Pekerti
                      </span>
                      <span className="font-bold text-emerald-700">
                        {elemenScores.agama !== null ? `${elemenScores.agama}%` : 'Observasi'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${elemenScores.agama || 70}%` }}
                      />
                    </div>
                  </div>

                  {/* Elemen 2: Jati Diri */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-indigo-500" />
                        2. Jati Diri &amp; Sosial Emosional
                      </span>
                      <span className="font-bold text-emerald-700">
                        {elemenScores.jatiDiri !== null ? `${elemenScores.jatiDiri}%` : 'Observasi'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${elemenScores.jatiDiri || 75}%` }}
                      />
                    </div>
                  </div>

                  {/* Elemen 3: Dasar Literasi & STEAM */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        3. Dasar Literasi, Matematika &amp; STEAM
                      </span>
                      <span className="font-bold text-emerald-700">
                        {elemenScores.steam !== null ? `${elemenScores.steam}%` : 'Observasi'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${elemenScores.steam || 75}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KARTU 2: GRAFIK TREN PERKEMBANGAN 1 SEMESTER (Visual & Jelas) */}
          <ChildDevelopmentTrendChart
            observations={periodObservations}
            student={selectedStudent}
            title={`Grafik Tren Perkembangan — Ananda ${selectedStudent.name}`}
            subtitle={`Laju pertumbuhan capaian ananda dari minggu ke minggu selama ${selectedSemester} TA ${academicYear}`}
          />

          {/* KARTU 3: NARASI RESMI RAPOR KURIKULUM MERDEKA */}
          {reportData && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Narasi Rapor Kurikulum Merdeka (Tercetak di Rapor A4)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenReportPreview(selectedStudent)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  Edit &amp; Tanda Tangani &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Nilai Agama & Budi Pekerti */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 space-y-2">
                  <h5 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Nilai Agama &amp; Budi Pekerti
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {reportData.narrativeAgama || 'Ananda menunjukkan pembiasaan berdoa sebelum dan sesudah kegiatan, menghargai sesama teman, serta menyayangi ciptaan Tuhan dengan baik.'}
                  </p>
                </div>

                {/* 2. Jati Diri */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 space-y-2">
                  <h5 className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-500" />
                    Jati Diri
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {reportData.narrativeJatiDiri || 'Ananda mampu mengekspresikan emosi secara wajar, mandiri dalam mengenakan sepatu dan makan, serta percaya diri saat berinteraksi dengan guru dan teman.'}
                  </p>
                </div>

                {/* 3. Dasar Literasi & STEAM */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 space-y-2">
                  <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    Dasar Literasi &amp; STEAM
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {reportData.narrativeSteam || 'Ananda antusias menyimak cerita buku bergambar, mampu mengenali pola angka dan warna, serta aktif bereksplorasi dengan media loose parts.'}
                  </p>
                </div>
              </div>

              {/* Refleksi & Rekomendasi Pendidik */}
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-emerald-900">
                    Refleksi &amp; Rekomendasi Kerja Sama Guru dengan Orang Tua:
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {reportData.narrativeRefleksi || 'Di semester depan, ananda disarankan untuk diajak lebih banyak berdialog seputar pengalaman harian dan diajak bermain stimulasi gerak motorik di lingkungan rumah.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAMPILAN LAPORAN HARIAN GURU                             */}
      {/* ========================================================= */}
      {reportType === 'HARIAN' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Catatan Kegiatan Belajar Ananda — {selectedDate}</span>
            </h3>
            <span className="text-xs text-slate-500">
              {periodObservations.length} kegiatan ditemukan
            </span>
          </div>

          {periodObservations.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                Tidak ada observasi pada {selectedDate}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Silakan pilih tanggal lain pada formulir di atas, atau gunakan tab <strong>"Input Observasi"</strong> untuk mencatat aktivitas baru.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {periodObservations.map((obs, idx) => (
                <div
                  key={obs.id || idx}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3.5 hover:border-emerald-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {obs.date || obs.observationDateISO}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{obs.activityTitle}</h4>
                    </div>

                    <button
                      onClick={() => onOpenReportPreview(selectedStudent)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer self-start sm:self-center"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Lihat Rapor
                    </button>
                  </div>

                  {/* Catatan Guru */}
                  {obs.teacherNote && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-bold text-slate-700">Catatan Guru: </span>
                      <span className="text-slate-700 italic">"{obs.teacherNote}"</span>
                    </div>
                  )}

                  {/* Bukti Foto jika ada */}
                  {obs.evidences && obs.evidences.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                      {obs.evidences.map((ev, i) => (
                        <div
                          key={i}
                          className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100"
                        >
                          <img
                            src={ev.url}
                            alt={ev.caption || 'Foto kegiatan'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Modal Tanda Tangan & Pengesahan Digital Resmi */}
      {selectedStudent && (
        <DigitalSignatureModal
          isOpen={isSigningModalOpen}
          onClose={() => setIsSigningModalOpen(false)}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          academicYear={academicYear}
          semester={selectedSemester}
          schoolName={school.name}
          defaultRole={signingRole}
          initialTeacherName={school.teacherName || 'Guru Wali Kelas'}
          initialPrincipalName={school.principalName || 'Kepala Sekolah'}
          onAuthorized={handleAuthorized}
        />
      )}
    </div>
  );
};
