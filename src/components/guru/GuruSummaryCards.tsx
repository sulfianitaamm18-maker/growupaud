import React from 'react';
import {
  Users,
  ClipboardCheck,
  FileCheck,
  FolderOpen,
  Award,
  ChevronRight,
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
  studentClassName?: string;
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
  studentClassName,
}) => {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. PESERTA DIDIK */}
        <div
          onClick={() => onSelectCard('STUDENTS')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              PESERTA DIDIK
            </span>
            <div className="mt-1">
              <h3 className="text-xl font-extrabold text-slate-800 leading-tight">
                {totalStudents} <span className="text-xs font-semibold text-slate-500">Anak</span>
              </h3>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                {studentClassName || 'Kelompok B'}
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* 2. OBSERVASI (Gabungan Hari Ini dan Minggu Ini) */}
        <div
          onClick={() => onSelectCard('WEEKLY_OBS')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-teal-700 transition-colors">
              OBSERVASI
            </span>
            <div className="mt-1 flex items-baseline gap-3 text-slate-800">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCard('TODAY_OBS');
                }}
                className="hover:text-teal-700 transition-colors"
                title="Lihat Observasi Hari Ini"
              >
                <span className="text-xl font-extrabold text-slate-800">{todayObservationsCount}</span>{' '}
                <span className="text-xs font-semibold text-slate-500">Hari Ini</span>
              </div>
              <span className="text-slate-300">•</span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCard('WEEKLY_OBS');
                }}
                className="hover:text-teal-700 transition-colors"
                title="Lihat Observasi Minggu Ini"
              >
                <span className="text-xl font-extrabold text-slate-800">{weeklyObservationsCount}</span>{' '}
                <span className="text-xs font-semibold text-slate-500">Minggu Ini</span>
              </div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 group-hover:scale-105 transition-transform">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        {/* 3. LAPORAN (Gabungan Laporan Proses dan Siap) */}
        <div
          onClick={() => onSelectCard('COMPLETED_REPORTS')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-700 transition-colors">
              LAPORAN PERKEMBANGAN
            </span>
            <div className="mt-1">
              <h3 className="text-xl font-extrabold text-slate-800 leading-tight">
                {pendingReportsCount} <span className="text-xs font-semibold text-slate-500">Proses</span>
                <span className="mx-1.5 text-slate-300 font-normal">·</span>
                {completedReportsCount} <span className="text-xs font-semibold text-slate-500">Siap</span>
              </h3>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        {/* 4. CAPAIAN SEMESTER */}
        <div
          onClick={() => onSelectCard('ASSESSMENT_PROGRESS')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-purple-700 transition-colors">
              CAPAIAN SEMESTER
            </span>
            <div className="mt-1">
              <h3 className="text-xl font-extrabold text-slate-800 leading-tight">
                {semesterAssessmentPercentage}%
              </h3>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* 5. BUKTI AUTENTIK (Compact bar spanning 2 columns) */}
        <div
          onClick={() => onSelectCard('EVIDENCES')}
          className="md:col-span-2 bg-white hover:bg-sky-50/40 px-4 py-2.5 rounded-xl border border-slate-200/80 hover:border-sky-300 transition-all cursor-pointer flex items-center justify-between text-xs group"
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-slate-700">Bukti Autentik</span>
            <span className="text-slate-300">—</span>
            <span className="font-semibold text-slate-500">{uploadedEvidenceCount} File</span>
          </div>
          <span className="text-[11px] font-semibold text-sky-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            <span>Buka Portofolio</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};

