import React from 'react';
import {
  PlusCircle,
  Users,
  FolderHeart,
  Clock,
  FileText,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface GuruQuickActionsProps {
  onOpenNewObservation: () => void;
  onNavigateSection: (section: 'STUDENTS' | 'PORTFOLIO' | 'REPORT' | 'CALENDAR' | 'PLANNER') => void;
}

export const GuruQuickActions: React.FC<GuruQuickActionsProps> = ({
  onOpenNewObservation,
  onNavigateSection,
}) => {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Aksi Cepat Guru PAUD
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          Akses langsung ke menu utama & perencanaan
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={onOpenNewObservation}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95 cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-white/20 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span>+ Catat Observasi</span>
        </button>

        <button
          onClick={() => onNavigateSection('PLANNER')}
          className="p-3.5 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-300 text-emerald-900 font-bold text-xs transition-all flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-emerald-600 text-white group-hover:scale-110 transition-transform shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <span>Rancang Kegiatan AI</span>
        </button>

        <button
          onClick={() => onNavigateSection('STUDENTS')}
          className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 text-slate-800 font-bold text-xs transition-all flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <span>Lihat Daftar Anak</span>
        </button>

        <button
          onClick={() => onNavigateSection('PORTFOLIO')}
          className="p-3.5 rounded-2xl bg-slate-50 hover:bg-sky-50/70 border border-slate-200 hover:border-sky-300 text-slate-800 font-bold text-xs transition-all flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-sky-100 text-sky-700 group-hover:scale-110 transition-transform">
            <FolderHeart className="w-5 h-5" />
          </div>
          <span>Portofolio Anak</span>
        </button>

        <button
          onClick={() => onNavigateSection('REPORT')}
          className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 text-slate-800 font-bold text-xs transition-all flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <span>Laporan Semester</span>
        </button>

        <button
          onClick={() => onNavigateSection('CALENDAR')}
          className="p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 text-slate-800 font-bold text-xs transition-all flex flex-col items-center justify-center text-center gap-2 group cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <span>Kalender Akademik</span>
        </button>
      </div>
    </div>
  );
};
