import React from 'react';
import { Award, FileCheck, FolderCheck } from 'lucide-react';

interface GuruDashboardProgressProps {
  assessmentProgress: number;
  reportProgress: number;
  portfolioProgress: number;
  onNavigateSection: (section: 'STUDENTS' | 'PORTFOLIO' | 'REPORT') => void;
}

export const GuruDashboardProgress: React.FC<GuruDashboardProgressProps> = ({
  assessmentProgress = 0,
  reportProgress = 0,
  portfolioProgress = 0,
  onNavigateSection,
}) => {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Indikator Progress Penyelesaian Asesmen & Rapor Semester
          </h2>
          <p className="text-xs text-slate-500">
            Target penyelesaian seluruh rangkaian administrasi asesmen PAUD Kurikulum Merdeka
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
          Semester I (Ganjil)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Persentase Asesmen Semester */}
        <div
          onClick={() => onNavigateSection('STUDENTS')}
          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 flex items-center gap-1.5 group-hover:text-emerald-700 transition-colors">
              <Award className="w-4 h-4 text-emerald-600" />
              Asesmen Semester
            </span>
            <span className="text-emerald-700">{assessmentProgress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${assessmentProgress}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Ketercapaian Tujuan Pembelajaran (TP & ATP)
          </p>
        </div>

        {/* 2. Persentase Laporan Selesai */}
        <div
          onClick={() => onNavigateSection('REPORT')}
          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 flex items-center gap-1.5 group-hover:text-indigo-700 transition-colors">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              Laporan Rapor Selesai
            </span>
            <span className="text-indigo-700">{reportProgress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${reportProgress}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Siap cetak PDF & dibagikan ke orang tua
          </p>
        </div>

        {/* 3. Persentase Portofolio Lengkap */}
        <div
          onClick={() => onNavigateSection('PORTFOLIO')}
          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 flex items-center gap-1.5 group-hover:text-amber-700 transition-colors">
              <FolderCheck className="w-4 h-4 text-amber-600" />
              Portofolio Autentik Lengkap
            </span>
            <span className="text-amber-700">{portfolioProgress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full transition-all duration-700"
              style={{ width: `${portfolioProgress}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Dokumentasi foto, video & voice note
          </p>
        </div>
      </div>
    </div>
  );
};
