import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  User,
  Download,
  Printer,
  Eye,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Award,
  ChevronRight,
  BookOpen,
  Camera,
  Search,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { StudentProfile, ObservationRecord, DevelopmentalAspect } from '../../types';
import { ASPECT_LABELS, ASPECT_COLORS } from '../../data/initialData';
import {
  ALL_ASPECTS,
  calculateStudentAspectScores,
  calculateOverallScore,
  getAchievementPredicate,
} from '../../utils/studentMetrics';
import { schoolStore } from '../../services/schoolStore';
import { calculateStudentReportData } from '../../utils/reportCalculator';
import { generateStudentReportDocx } from '../../services/docxReportGenerator';
import { generateStudentReportPdf } from '../../services/pdfReportGenerator';

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
  // 1. Selection states
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return students && students.length > 0 ? students[0].id : '';
  });

  const [reportType, setReportType] = useState<'SEMESTER' | 'HARIAN'>('SEMESTER');

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [selectedSemester, setSelectedSemester] = useState<string>('Semester I (Ganjil)');
  const [academicYear, setAcademicYear] = useState<string>('2026/2027');

  // Loading & Toast
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

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

    // SEMESTER: all observations in this semester / academic year
    return studentObs.filter((o) => {
      if (o.semester && o.semester !== selectedSemester) return false;
      return true;
    });
  }, [observations, selectedStudent, reportType, selectedDate, selectedSemester]);

  // Calculate metrics strictly using SSoT (studentMetrics.ts)
  const aspectScores = useMemo(() => {
    return calculateStudentAspectScores(periodObservations);
  }, [periodObservations]);

  const overallScore = useMemo(() => {
    return calculateOverallScore(aspectScores);
  }, [aspectScores]);

  const overallPredicate = useMemo(() => {
    return getAchievementPredicate(overallScore);
  }, [overallScore]);

  // Handle direct PDF Download
  const handleDownloadPdf = async () => {
    if (!selectedStudent) return;
    setIsDownloadingPdf(true);
    try {
      const school = schoolStore.getSchoolProfile();
      const reportData = calculateStudentReportData(selectedStudent, periodObservations, school);
      await generateStudentReportPdf({
        student: selectedStudent,
        reportData,
        schoolProfile: school,
        canonicalDoc: reportData.canonicalDoc,
      });
      showToast(`Laporan PDF untuk ${selectedStudent.name} berhasil diunduh.`);
    } catch (err: any) {
      console.error('PDF download error:', err);
      showToast('Gagal mengunduh PDF. Silakan coba buka menu Pratinjau.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handle direct DOCX Download
  const handleDownloadDocx = async () => {
    if (!selectedStudent) return;
    setIsDownloadingDocx(true);
    try {
      const school = schoolStore.getSchoolProfile();
      const reportData = calculateStudentReportData(selectedStudent, periodObservations, school);
      await generateStudentReportDocx({ canonicalDoc: reportData.canonicalDoc });
      showToast(`Laporan DOCX Word untuk ${selectedStudent.name} berhasil diunduh.`);
    } catch (err: any) {
      console.error('DOCX download error:', err);
      showToast('Gagal mengunduh DOCX. Silakan coba lagi.');
    } finally {
      setIsDownloadingDocx(false);
    }
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
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-medium border border-slate-700 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Configuration Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-emerald-600" />
            Laporan Perkembangan Anak (Rapor PAUD)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pilih anak dan periode laporan untuk melihat ringkasan capaian perkembangan, membuka pratinjau lengkap (A4), atau mendownload dokumen PDF dan Word.
          </p>
        </div>

        {/* Form Controls: Student Selector, Report Type, Period */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 1. Pilih Anak */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Pilih Peserta Didik
            </label>
            <select
              value={selectedStudent.id}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.className || 'Kelas'}) - {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Jenis Laporan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Jenis Laporan
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setReportType('SEMESTER')}
                className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  reportType === 'SEMESTER'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rapor Semester
              </button>
              <button
                type="button"
                onClick={() => setReportType('HARIAN')}
                className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  reportType === 'HARIAN'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Laporan Harian
              </button>
            </div>
          </div>

          {/* 3. Periode / Tanggal */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              {reportType === 'HARIAN' ? 'Tanggal Observasi' : 'Semester & Tahun Ajaran'}
            </label>
            {reportType === 'HARIAN' ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
              />
            ) : (
              <div className="flex gap-2">
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
                  className="w-1/3 px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 text-center"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Terpilih: <strong className="text-slate-800">{selectedStudent.name}</strong> •{' '}
            <span>
              {reportType === 'HARIAN' ? `Tanggal ${selectedDate}` : `${selectedSemester} TA ${academicYear}`}
            </span>{' '}
            • <span className="font-semibold text-emerald-700">{periodObservations.length} observasi tercatat</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenReportPreview(selectedStudent)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              Buka Pratinjau Lengkap (A4)
            </button>

            <button
              disabled={isDownloadingPdf || periodObservations.length === 0}
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {isDownloadingPdf ? 'Membuat PDF...' : 'Unduh PDF'}
            </button>

            <button
              disabled={isDownloadingDocx || periodObservations.length === 0}
              onClick={handleDownloadDocx}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              {isDownloadingDocx ? 'Membuat DOCX...' : 'Unduh Word (.DOCX)'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics & SSoT Validation Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Overall Score & Child Identity */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-base flex items-center justify-center border border-emerald-200 shrink-0">
                {selectedStudent.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  {selectedStudent.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedStudent.className || 'Kelas'} • NISN: {selectedStudent.nisn || '-'}
                </p>
              </div>
            </div>

            {/* Overall Score Box (Macro-Average) */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Overall Score (Macro-Average Resmi SSoT)
              </span>
              {overallScore === null ? (
                <div className="py-2">
                  <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold">
                    Belum Ada Data Observasi
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nilai dihitung otomatis saat observasi terisi
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  <div className="text-3xl font-extrabold text-emerald-700">
                    {overallScore}%
                  </div>
                  <div className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {overallPredicate.conditionLabel}
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 pt-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Observasi Periode:</span>
                <span className="font-bold text-slate-800">{periodObservations.length} Kegiatan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Foto/Karya Terkait:</span>
                <span className="font-bold text-slate-800">
                  {periodObservations.reduce((acc, o) => acc + (o.evidences?.length || 0), 0)} Foto
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
            <strong>Standar SSoT GrowUPAUD:</strong> BB=25%, MB=50%, BSH=75%, BSB=100%. Aspek yang belum teramati tidak dihitung sebagai 0% agar tidak merusak akurasi rata-rata capaian.
          </div>
        </div>

        {/* Right 2 Columns: 6 Developmental Aspects Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Capaian 6 Aspek Perkembangan (Kurikulum Merdeka PAUD)
            </h3>
            <span className="text-[11px] text-slate-400">Formula Resmi SSoT</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_ASPECTS.map((aspect) => {
              const score = aspectScores[aspect];
              const predicate = getAchievementPredicate(score);
              const label = ASPECT_LABELS[aspect];

              return (
                <div
                  key={aspect}
                  className={`p-3.5 rounded-2xl border transition ${
                    score === null
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {aspect}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {label}
                      </h4>
                    </div>
                    {score === null ? (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-200 text-slate-600">
                        Belum Ada Data
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {predicate.code} ({score}%)
                      </span>
                    )}
                  </div>

                  {/* Progress Bar or Empty indicator */}
                  <div className="mt-3">
                    {score === null ? (
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div className="w-0 h-full bg-slate-300" />
                      </div>
                    ) : (
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2">
                    {score === null
                      ? 'Belum ada indikator yang dinilai pada aspek ini.'
                      : predicate.conditionLabel}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activities / Observations Included in this Report */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          Daftar Kegiatan & Observasi dalam Periode Laporan ({periodObservations.length})
        </h3>

        {periodObservations.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-600 font-medium">
              Tidak ada data observasi untuk {selectedStudent.name} pada periode yang dipilih.
            </p>
            <p className="text-[11px] text-slate-400">
              Gunakan menu "Input Observasi" untuk mulai mendokumentasikan kegiatan anak.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {periodObservations.map((obs, idx) => (
              <div
                key={obs.id || idx}
                className="p-4 bg-white hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {obs.date || obs.observationDateISO}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">{obs.activityTitle}</h4>
                  </div>
                  {obs.teacherNote && (
                    <p className="text-xs text-slate-600 line-clamp-1 italic">
                      "{obs.teacherNote}"
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{(obs.indicators || []).length} Indikator</span>
                    <span>•</span>
                    <span>{(obs.evidences || []).length} Foto/Karya</span>
                    {obs.aiAnalysis && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Narasi AI Tersedia
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onOpenReportPreview(selectedStudent)}
                  className="self-start sm:self-center px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Pratinjau
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
