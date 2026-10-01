import React from 'react';
import { CanonicalReportDocument } from '../../../services/reportDocumentModel';
import { sanitizeReportText, formatStudentGroupAndAge } from '../../../utils/textSanitizer';
import { School, Award } from 'lucide-react';

interface ReportHeaderProps {
  canonical: CanonicalReportDocument;
  pageNumber?: number;
  totalPages?: number;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  canonical,
  pageNumber = 1,
}) => {
  const assessmentDate =
    canonical.observationSummary?.latestObservationDate ||
    canonical.metadata?.generatedDate ||
    new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  if (pageNumber > 1) {
    // Formal Running Header for Page 2+ (Ensures student, class, assessment date & school appear on all printed pages)
    return (
      <div className="pb-1.5 border-b border-slate-300 flex items-center justify-between text-[7.2pt] text-slate-700 mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          {canonical.school.logoUrl ? (
            <img
              src={canonical.school.logoUrl}
              alt="Logo Sekolah"
              className="w-4 h-4 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-4 h-4 rounded bg-slate-800 text-white flex items-center justify-center text-[5.5pt] font-black shrink-0">
              {canonical.school.name ? canonical.school.name.charAt(0) : 'P'}
            </div>
          )}
          <span className="font-bold text-slate-900 tracking-tight">
            {sanitizeReportText(canonical.school.name)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span>
            Nama: <strong className="text-slate-900 font-bold">{sanitizeReportText(canonical.student.fullName)}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Kelas: <strong className="text-slate-900 font-bold">{sanitizeReportText(canonical.student.className)}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Tgl Asesmen: <strong className="text-slate-900 font-bold">{sanitizeReportText(assessmentDate)}</strong>
          </span>
        </div>
      </div>
    );
  }

  // Page 1: Official Kop Surat & Formal Student Identity Block
  return (
    <div className="space-y-2.5 shrink-0 formal-header-block">
      {/* Kop Surat Header */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b-2 border-slate-900 relative">
        {/* Left: Official Logo or Formal School Emblem */}
        <div className="w-16 h-16 flex items-center justify-center shrink-0">
          {canonical.school.logoUrl ? (
            <img
              src={canonical.school.logoUrl}
              alt="Logo Resmi Sekolah"
              className="w-16 h-16 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-full border-2 border-slate-800 bg-slate-50 flex flex-col items-center justify-center text-slate-800 shadow-xs p-1">
              <School className="w-6 h-6 text-slate-800 mb-0.5" />
              <span className="text-[5pt] font-black tracking-widest uppercase">PAUD</span>
            </div>
          )}
        </div>

        {/* Center: Official Title, School Name, Semester & Address */}
        <div className="flex-1 text-center px-1">
          <h1 className="text-[11.5pt] font-black text-slate-950 tracking-wide uppercase leading-tight font-sans">
            {sanitizeReportText(canonical.metadata.documentTitle || 'LAPORAN CAPAIAN PERKEMBANGAN PESERTA DIDIK')}
          </h1>
          <h2 className="text-[10pt] font-extrabold text-slate-900 uppercase leading-snug tracking-normal">
            {sanitizeReportText(canonical.school.name || 'SATUAN PAUD')}
          </h2>
          <p className="text-[7.5pt] text-slate-700 font-medium leading-tight mt-0.5">
            {sanitizeReportText(canonical.metadata.semester)} • TAHUN AJARAN {sanitizeReportText(canonical.metadata.academicYear)}
          </p>
          {canonical.school.address && (
            <p className="text-[6.8pt] text-slate-500 leading-tight mt-0.5">
              {sanitizeReportText(canonical.school.address)}
            </p>
          )}
        </div>

        {/* Right: Official Curriculum Seal / Badge */}
        <div className="w-16 h-16 flex flex-col items-center justify-center shrink-0">
          <div className="w-14 h-14 rounded-full border-2 border-emerald-700 bg-emerald-50/70 flex flex-col items-center justify-center text-emerald-900 text-center p-1 shadow-xs">
            <Award className="w-4 h-4 text-emerald-700" />
            <span className="text-[5pt] font-black tracking-tight leading-none mt-0.5">KURIKULUM</span>
            <span className="text-[4.8pt] font-bold text-emerald-700 leading-none">MERDEKA</span>
          </div>
        </div>
      </div>
      {/* Thin sub-line to complete traditional Indonesian Kop Surat standard */}
      <div className="h-[1px] bg-slate-300 -mt-2"></div>

      {/* Formal Student & Assessment Identity Block (Grid 2 Kolom Presisi) */}
      <div className="bg-slate-50/90 border border-slate-300 rounded-md p-2.5 text-[7.6pt] grid grid-cols-2 gap-x-6 gap-y-1 shadow-2xs break-inside-avoid">
        {/* Kolom Kiri */}
        <div className="space-y-1">
          <div className="flex items-baseline">
            <span className="w-32 text-slate-600 font-medium">Nama Peserta Didik</span>
            <span className="text-slate-400 mr-1.5">:</span>
            <strong className="text-slate-950 font-bold truncate">
              {sanitizeReportText(canonical.student.fullName)}
              {canonical.student.nickname && ` (${sanitizeReportText(canonical.student.nickname)})`}
            </strong>
          </div>
          <div className="flex items-baseline">
            <span className="w-32 text-slate-600 font-medium">Kelas / Kelompok</span>
            <span className="text-slate-400 mr-1.5">:</span>
            <span className="text-slate-900 font-bold">
              {formatStudentGroupAndAge(canonical.student.className, canonical.student.ageDisplay)}
            </span>
          </div>
          <div className="flex items-baseline">
            <span className="w-32 text-slate-600 font-medium">NISN / ID Siswa</span>
            <span className="text-slate-400 mr-1.5">:</span>
            <span className="text-slate-800">
              {sanitizeReportText(canonical.student.nisn || canonical.student.id || '—')}
            </span>
          </div>
          <div className="flex items-baseline">
            <span className="w-32 text-slate-600 font-medium">Fase Perkembangan</span>
            <span className="text-slate-400 mr-1.5">:</span>
            <span className="text-slate-800 font-medium">
              Fase Fondasi (PAUD / TK)
            </span>
          </div>
        </div>

        {/* Kolom Kanan */}
        <div className="space-y-1">
          <div className="flex items-baseline">
            <span className="w-28 text-slate-600 font-medium">Tanggal Asesmen</span>
            <span className="text-slate-400 mr-1.5">:</span>
            <strong className="text-slate-950 font-bold">
              {sanitizeReportText(assessmentDate)}
            </strong>
          </div>
          <div className="flex items-baseline">
            <span className="w-28 text-slate-600 font-medium">Satuan PAUD</span>
            <span className="text-slate-400 mr-1.5">:</span>
            <span className="text-slate-900 font-semibold truncate">
              {sanitizeReportText(canonical.school.name)}
            </span>
          </div>
          <div className="flex items-baseline">
            <span className="w-28 text-slate-600 font-medium">Orang Tua / Wali</span>
            <span className="text-slate-400 mr-1.5">:</span>
            <span className="text-slate-800 truncate">
              {sanitizeReportText(canonical.student.parentName || '—')}
            </span>
          </div>
          <div className="flex items-baseline">
            <span className="w-28 text-slate-600 font-medium">Guru Wali Kelas</span>
            <span className="text-slate-400 mr-1.5">:</span>
            <span className="text-slate-800 truncate">
              {sanitizeReportText(canonical.signatures?.teacher?.name || '—')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
