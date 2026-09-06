import React from 'react';
import {
  BarChart2,
  X,
  Award,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { StudentProfile } from '../../types';
import { formatStudentAge } from '../../utils/ageUtils';
import { getAchievementPredicate } from '../../utils/studentMetrics';
import { RadarChartCard } from '../common/RadarChartCard';
import { AspectScoreBars } from '../common/AspectScoreBars';

interface GuruStudentGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  onOpenReportPreview?: (student: StudentProfile) => void;
}

export const GuruStudentGraphModal: React.FC<GuruStudentGraphModalProps> = ({
  isOpen,
  onClose,
  student,
  onOpenReportPreview,
}) => {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <img
              src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`}
              alt={student.name || 'Anak'}
              className="w-10 h-10 rounded-full object-cover border border-slate-700"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`;
              }}
            />
            <div>
              <h3 className="font-bold text-sm">
                Grafik Capaian 6 Aspek — Ananda {student.name}
              </h3>
              <p className="text-xs text-slate-400">
                {student.className} • Usia: {formatStudentAge(student)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Radar & Score Bars */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                Capaian Keseluruhan Semester
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Berdasarkan pengukuran 6 Aspek Kurikulum Merdeka PAUD.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-sm shadow-xs">
                {student.overallScore !== null && student.overallScore !== undefined
                  ? `${student.overallScore}% — ${getAchievementPredicate(student.overallScore).label}`
                  : 'Belum Ada Penilaian'}
              </span>
              {onOpenReportPreview && (
                <button
                  type="button"
                  id="graph-report-preview-btn-top"
                  onClick={() => {
                    if (student) onOpenReportPreview(student);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Pertinjau Laporan</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RadarChartCard
              aspectScores={student.aspectScores}
              title={`Radar Capaian ${student.nickname}`}
              subtitle="6 Aspek Perkembangan (0 - 100%)"
              height={240}
            />
            <AspectScoreBars
              aspectScores={student.aspectScores}
              title="Ketercapaian Indikator"
              subtitle="Rata-rata observasi semester I"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Data terintegrasi real-time dari riwayat observasi harian
          </span>
          <div className="flex items-center gap-2">
            {onOpenReportPreview && (
              <button
                type="button"
                id="graph-report-preview-btn-bottom"
                onClick={() => {
                  if (student) onOpenReportPreview(student);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Pertinjau / Cetak Laporan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
