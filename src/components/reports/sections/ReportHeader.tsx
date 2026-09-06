import React from 'react';
import { CanonicalReportDocument } from '../../../services/reportDocumentModel';
import { sanitizeReportText, formatStudentGroupAndAge } from '../../../utils/textSanitizer';

interface ReportHeaderProps {
  canonical: CanonicalReportDocument;
  pageNumber?: number;
  totalPages?: number;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  canonical,
  pageNumber = 1,
}) => {
  if (pageNumber > 1) {
    // Subtle Running Header for Page 2+
    return (
      <div className="pb-1 border-b border-slate-300 flex items-center justify-between text-[7.2pt] text-slate-500 italic mb-2 shrink-0">
        <span>
          Laporan Perkembangan Ananda {sanitizeReportText(canonical.student.fullName)} • {sanitizeReportText(canonical.school.name)}
        </span>
        <span className="text-[6.8pt] text-slate-400 not-italic">
          {sanitizeReportText(canonical.metadata.documentTitle)}
        </span>
      </div>
    );
  }

  // Page 1: Official Kop Surat & Student Identity
  return (
    <div className="space-y-3 shrink-0">
      {/* Kop Surat Header */}
      <div className="flex items-center gap-4 pb-2 border-b-2 border-slate-800">
        {canonical.school.logoUrl && (
          <img
            src={canonical.school.logoUrl}
            alt="Logo Sekolah"
            className="w-14 h-14 object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="flex-1 text-center">
          <h1 className="text-[12pt] font-black text-slate-900 tracking-wide uppercase leading-tight font-sans">
            {sanitizeReportText(canonical.metadata.documentTitle)}
          </h1>
          <h2 className="text-[10pt] font-bold text-slate-800 uppercase leading-snug">
            {sanitizeReportText(canonical.school.name)}
          </h2>
          <p className="text-[7.8pt] text-slate-600 font-medium">
            {sanitizeReportText(canonical.metadata.semester)} • TAHUN AJARAN {sanitizeReportText(canonical.metadata.academicYear)}
          </p>
          {canonical.school.address && (
            <p className="text-[7.2pt] text-slate-500">{sanitizeReportText(canonical.school.address)}</p>
          )}
        </div>
      </div>

      {/* Student Identity Grid (2 Balanced Columns) */}
      <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 text-[7.8pt] grid grid-cols-2 gap-x-6 gap-y-1">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-slate-500">Nama Peserta Didik</span>
            <span className="text-slate-400 mr-1">:</span>
            <strong className="text-slate-900 font-bold truncate">
              {sanitizeReportText(canonical.student.fullName)}
              {canonical.student.nickname && ` (${sanitizeReportText(canonical.student.nickname)})`}
            </strong>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500">Kelompok / Usia</span>
            <span className="text-slate-400 mr-1">:</span>
            <span className="text-slate-800 font-medium">
              {formatStudentGroupAndAge(canonical.student.className, canonical.student.ageDisplay)}
            </span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500">NISN / ID Siswa</span>
            <span className="text-slate-400 mr-1">:</span>
            <span className="text-slate-800">
              {sanitizeReportText(canonical.student.nisn || canonical.student.id || '—')}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex">
            <span className="w-24 text-slate-500">Orang Tua / Wali</span>
            <span className="text-slate-400 mr-1">:</span>
            <span className="text-slate-800 truncate">
              {sanitizeReportText(canonical.student.parentName || '—')}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 text-slate-500">Guru Wali Kelas</span>
            <span className="text-slate-400 mr-1">:</span>
            <span className="text-slate-800 truncate">
              {sanitizeReportText(canonical.signatures.teacher.name || '—')}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 text-slate-500">Tanggal Laporan</span>
            <span className="text-slate-400 mr-1">:</span>
            <span className="text-slate-800">{sanitizeReportText(canonical.metadata.generatedDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
