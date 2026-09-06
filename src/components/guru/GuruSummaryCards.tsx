import React from 'react';
import {
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  FileCheck,
  FolderOpen,
  Award,
  ArrowUpRight,
} from 'lucide-react';

interface GuruSummaryCardsProps {
  totalStudents: number;
  todayObservationsCount: number;
  weeklyObservationsCount: number;
  pendingReportsCount: number;
  completedReportsCount: number;
  uploadedEvidenceCount: number;
  semesterAssessmentPercentage: number;
  onSelectCard: (cardType: 'STUDENTS' | 'TODAY_OBS' | 'WEEKLY_OBS' | 'PENDING_REPORTS' | 'COMPLETED_REPORTS' | 'EVIDENCES' | 'ASSESSMENT_PROGRESS') => void;
}

export const GuruSummaryCards: React.FC<GuruSummaryCardsProps> = ({
  totalStudents,
  todayObservationsCount,
  weeklyObservationsCount,
  pendingReportsCount,
  completedReportsCount,
  uploadedEvidenceCount,
  semesterAssessmentPercentage,
  onSelectCard,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Ringkasan Aktivitas & Asesmen Guru
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          Klik kartu untuk melihat rincian & filter data
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {/* 1. Jumlah Peserta Didik */}
        <div
          onClick={() => onSelectCard('STUDENTS')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              Peserta Didik
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">
              {totalStudents} <span className="text-xs font-semibold text-slate-500">Anak</span>
            </h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
              <span>Kelompok B - Bintang</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* 2. Observasi Hari Ini */}
        <div
          onClick={() => onSelectCard('TODAY_OBS')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-teal-700 transition-colors">
              Observasi Hari Ini
            </span>
            <span className="p-1.5 rounded-xl bg-teal-50 text-teal-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">
              {todayObservationsCount} <span className="text-xs font-semibold text-slate-500">Selesai</span>
            </h3>
            <p className="text-[11px] text-teal-700 font-semibold mt-1 flex items-center gap-0.5">
              <span>Target Harian PAUD</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* 3. Observasi Minggu Ini */}
        <div
          onClick={() => onSelectCard('WEEKLY_OBS')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-700 transition-colors">
              Observasi Mingguan
            </span>
            <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">
              {weeklyObservationsCount} <span className="text-xs font-semibold text-slate-500">Catatan</span>
            </h3>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1 flex items-center gap-0.5">
              <span>Minggu Berjalan</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* 4. Laporan Belum Selesai */}
        <div
          onClick={() => onSelectCard('PENDING_REPORTS')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-amber-700 transition-colors">
              Laporan Proses
            </span>
            <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">
              {pendingReportsCount} <span className="text-xs font-semibold text-slate-500">Anak</span>
            </h3>
            <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-0.5">
              <span>Perlu tinjauan akhir</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* 5. Laporan Sudah Selesai */}
        <div
          onClick={() => onSelectCard('COMPLETED_REPORTS')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              Laporan Siap
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
              <FileCheck className="w-4 h-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">
              {completedReportsCount} <span className="text-xs font-semibold text-slate-500">Rapor</span>
            </h3>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-0.5">
              <span>Terverifikasi Kepala Sekolah</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* 6. Jumlah Dokumentasi */}
        <div
          onClick={() => onSelectCard('EVIDENCES')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-sky-700 transition-colors">
              Bukti Autentik
            </span>
            <span className="p-1.5 rounded-xl bg-sky-50 text-sky-600">
              <FolderOpen className="w-4 h-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">
              {uploadedEvidenceCount} <span className="text-xs font-semibold text-slate-500">File</span>
            </h3>
            <p className="text-[11px] text-sky-700 font-semibold mt-1 flex items-center gap-0.5">
              <span>Foto, Video & Voice Note</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* 7. Persentase Asesmen Semester */}
        <div
          onClick={() => onSelectCard('ASSESSMENT_PROGRESS')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-purple-700 transition-colors">
              Capaian Semester
            </span>
            <span className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">
              {semesterAssessmentPercentage}%
            </h3>
            <p className="text-[11px] text-purple-700 font-semibold mt-1 flex items-center gap-0.5">
              <span>Kurikulum Merdeka PAUD</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
