import React from 'react';
import {
  GraduationCap,
  Users,
  School,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { UserRole } from '../types';

interface RoleSwitcherBarProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export const RoleSwitcherBar: React.FC<RoleSwitcherBarProps> = ({
  currentRole,
  onSelectRole,
}) => {
  const roles: { id: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'GURU',
      label: 'Guru PAUD (Bu Rina)',
      icon: <GraduationCap className="w-4 h-4" />,
      desc: 'Input observasi, checklist indikator, AI Insight & narasi rapor',
    },
    {
      id: 'ORANG_TUA',
      label: 'Orang Tua (Ibu Aisyah)',
      icon: <Users className="w-4 h-4" />,
      desc: 'Pantau perkembangan Fatih, portofolio timeline & stimulasi rumah',
    },
    {
      id: 'KEPALA_SEKOLAH',
      label: 'Kepala Sekolah (Bu Hj. Nurhasanah)',
      icon: <School className="w-4 h-4" />,
      desc: 'Monitoring kelas, grafik perkembangan sekolah & rekap asesmen',
    },
    {
      id: 'ADMIN',
      label: 'Admin Sekolah',
      icon: <ShieldAlert className="w-4 h-4" />,
      desc: 'Kelola data anak, guru, kelas, kurikulum & profil sekolah',
    },
  ];

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              RBAC Demo
            </span>
            <span>Pilih peran untuk melihat Wireframe & Fitur masing-masing pengguna (Bab VII):</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {roles.map((item) => {
              const active = currentRole === item.id || (item.id === 'ADMIN' && currentRole === 'SUPER_ADMIN');
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectRole(item.id)}
                  title={item.desc}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
