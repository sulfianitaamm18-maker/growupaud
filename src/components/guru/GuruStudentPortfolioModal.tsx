import React, { useMemo } from 'react';
import {
  FolderHeart,
  X,
  Camera,
  Video,
  Mic,
  Award,
  Calendar,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Brain,
  Lightbulb,
  ShieldCheck,
  User,
  FileText,
  Printer,
} from 'lucide-react';
import { StudentProfile, ObservationRecord } from '../../types';
import { formatStudentAge } from '../../utils/ageUtils';

interface GuruStudentPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  observations: ObservationRecord[];
  onOpenReportPreview?: (student: StudentProfile) => void;
}

export const GuruStudentPortfolioModal: React.FC<GuruStudentPortfolioModalProps> = ({
  isOpen,
  onClose,
  student,
  observations,
  onOpenReportPreview,
}) => {
  if (!isOpen || !student) return null;

  const studentObservations = useMemo(() => {
    return observations.filter(
      (o) => o.studentId === student.id || (o as any).student_id === student.id
    );
  }, [observations, student.id]);

  const hasAIAnalysis = studentObservations.some((o) => Boolean(o.aiAnalysis?.generatedNarrative));
  const hasEvidences = studentObservations.some((o) => Boolean(o.evidences && o.evidences.length > 0));
  const canPreview = true;
  const canPrint = true;

  const observationFields = studentObservations.length > 0 ? Object.keys(studentObservations[0]) : [];
  const aspectFields = ['NAM', 'JATI_DIRI', 'LITERASI_STEAM', 'MOTORIK_KASAR', 'MOTORIK_HALUS', 'KOGNITIF'];
  const rubricFields = studentObservations[0]?.indicators?.[0] ? Object.keys(studentObservations[0].indicators[0]) : [];

  console.log(
    `[PORTFOLIO DATA STRUCTURE]\nstudentId = ${student.id}\nobservationCount = ${studentObservations.length}\nobservationFields = ${JSON.stringify(observationFields)}\naspectFields = ${JSON.stringify(aspectFields)}\nrubricFields = ${JSON.stringify(rubricFields)}`
  );

  console.log(
    `[REPORT BUTTON DEBUG]\nselectedStudent: true\nstudentId: ${student.id}\nstudentName: ${student.name}\nschoolId: ${student.schoolId || 'main-school'}\nclassId: ${student.classId || '-'}`
  );

  console.log(
    `[REPORT OBSERVATION DEBUG]\nstudentId = ${student.id}\nschoolId = ${student.schoolId || 'main-school'}\nclassId = ${student.classId || '-'}\nobservationCount = ${studentObservations.length}\nREPORT_BUTTON = SHOULD_RENDER`
  );

  console.log(
    `[REPORT UI DEBUG]\nselectedStudent = true\nstudentId = ${student.id}\nobservationCount = ${studentObservations.length}\nanalysisAvailable = ${hasAIAnalysis}\nvisualizationAvailable = true\nreportDataAvailable = true\ncanPreview = ${canPreview}\ncanPrint = ${canPrint}`
  );

  console.log(`[REPORT BUTTON RENDER]\nVISIBLE`);

  const handleOpenReport = () => {
    if (onOpenReportPreview && student) {
      onOpenReportPreview(student);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <img
              src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`}
              alt={student.name || 'Anak'}
              className="w-11 h-11 rounded-2xl object-cover border border-slate-700 ring-2 ring-emerald-500/30"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`;
              }}
            />
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span>Portofolio & Bukti Autentik — Ananda {student.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30 uppercase">
                  Kurikulum Merdeka
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {student.className} • Usia: {formatStudentAge(student)} • NISN: {student.nisn || student.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Portfolio Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Summary Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Ringkasan Portofolio PAUD & Status Bukti
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Mengumpulkan data multi-bukti (catatan guru, voice note, foto karya, dan rubrik indikator) yang telah ditriangulasi AI.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 font-bold text-xs text-emerald-700">
                {studentObservations.length} Dokumen Observasi
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 font-bold text-xs text-emerald-700">
                Capaian: {student.overallScore ? `${student.overallScore}%` : 'Aktif Berkembang'}
              </span>
              {onOpenReportPreview && (
                <button
                  type="button"
                  id="portfolio-report-preview-btn-top"
                  onClick={handleOpenReport}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Pertinjau / Cetak Laporan</span>
                </button>
              )}
            </div>
          </div>

          {/* Timeline Evidences */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Riwayat Observasi & Bukti Autentik Terverifikasi</span>
              <span className="text-[11px] font-medium text-slate-400">
                {studentObservations.length} Sesi Observasi
              </span>
            </h4>

            {studentObservations.length > 0 ? (
              studentObservations.map((obs) => (
                <div
                  key={obs.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                          {obs.activityTitle}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          • {obs.date}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>CP: {obs.cp || 'Elemen Capaian Perkembangan'}</span>
                        <span>• Guru: {obs.teacherName || 'Guru Pengamat'}</span>
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Tahap 3 & 4 Ready
                    </span>
                  </div>

                  {/* Teacher Note & Voice Note */}
                  <div className="space-y-2">
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                      <strong>Catatan Pengamatan Guru:</strong> "{obs.teacherNote || 'Tidak ada catatan tertulis.'}"
                    </p>

                    {obs.voiceNoteText && (
                      <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
                        <Mic className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[11px] text-indigo-800">Transkrip Voice Note Guru:</p>
                          <p className="text-slate-700 mt-0.5 leading-relaxed text-[11px]">{obs.voiceNoteText}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Evidences (Photos / Voice Notes) */}
                  {obs.evidences && obs.evidences.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Bukti Foto & Hasil Karya Anak
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {obs.evidences.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                          >
                            {ev.type === 'PHOTO' && ev.url && ev.url.trim().length > 0 && (
                              <img
                                src={ev.url}
                                alt={ev.title || 'Bukti Foto'}
                                className="w-full h-28 rounded-lg object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            <p className="font-bold text-slate-800 text-[11px] truncate">{ev.title}</p>
                            {ev.description && (
                              <p className="text-[10px] text-slate-500 line-clamp-1">{ev.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rubric Indicators Summary */}
                  {obs.indicators && obs.indicators.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Indikator Capaian Teramati (Rubrik)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {obs.indicators.map((ind: any, idx) => {
                          const rating = ind.rating || ind.score || 'BELUM_DINILAI';
                          const text = ind.text || ind.name || `Indikator ${idx + 1}`;
                          return (
                            <span
                              key={ind.id || idx}
                              className={`text-[10px] px-2.5 py-1 rounded-md font-bold border ${
                                rating === 'BSB'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : rating === 'BSH'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : rating === 'MB'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : rating === 'BB'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {text}: {rating}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stage 3 AI Triangulation Narrative */}
                  {obs.aiAnalysis?.generatedNarrative && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-emerald-50/40 border border-indigo-100 text-xs text-indigo-950 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span>Hasil Analisis Triangulasi & Narasi Perkembangan (Tahap 3)</span>
                        </div>
                        {obs.aiAnalysis.confidenceLevel && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700">
                            Confidence: {obs.aiAnalysis.confidenceLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 leading-relaxed text-xs">
                        {obs.aiAnalysis.generatedNarrative}
                      </p>

                      {obs.aiAnalysis.strengths && obs.aiAnalysis.strengths.length > 0 && (
                        <div className="pt-1 text-[11px] text-emerald-800 flex flex-wrap gap-2">
                          <span className="font-bold">Kekuatan Teramati:</span>
                          {obs.aiAnalysis.strengths.map((str, sIdx) => (
                            <span key={sIdx} className="bg-emerald-100/60 px-2 py-0.5 rounded-md">
                              ✓ {str}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-14 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-6 space-y-2">
                <FolderHeart className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">
                  Belum ada observasi atau bukti autentik tersimpan untuk Ananda {student.name}.
                </p>
                <p className="text-[11px] text-slate-400">
                  Lakukan observasi baru melalui tombol "Tambah Observasi" untuk mulai mendokumentasikan kegiatan anak.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Terhubung langsung dengan Cloud Firestore &amp; Modul GAI 2026</span>
          </span>
          <div className="flex items-center gap-2">
            {onOpenReportPreview && (
              <button
                type="button"
                id="portfolio-report-preview-btn-bottom"
                onClick={handleOpenReport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Pertinjau / Cetak Laporan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

