import React, { useState, useEffect } from 'react';
import {
  Bell,
  Settings,
  LogOut,
  Calendar as CalendarIcon,
  Award,
  School,
  CheckCircle2,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { UserProfile } from '../../types';

interface GuruHeaderProps {
  currentUser: UserProfile;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onLogout: () => void;
  unreadCount?: number;
}

export const GuruHeader: React.FC<GuruHeaderProps> = ({
  currentUser,
  onOpenSettings,
  onOpenNotifications,
  onLogout,
  unreadCount = 2,
}) => {
  const [greeting, setGreeting] = useState<string>('Selamat pagi');
  const [todayString, setTodayString] = useState<string>('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) {
      setGreeting('Selamat pagi');
    } else if (hour < 15) {
      setGreeting('Selamat siang');
    } else if (hour < 18) {
      setGreeting('Selamat sore');
    } else {
      setGreeting('Selamat malam');
    }

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    try {
      setTodayString(new Date().toLocaleDateString('id-ID', options));
    } catch {
      setTodayString('Senin, 3 Agustus 2026');
    }
  }, []);

  return (
    <header className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Section: Sapaan Guru & Identitas Sekolah */}
        <div className="flex items-start sm:items-center gap-4">
          <button
            type="button"
            onClick={onOpenSettings}
            className="relative shrink-0 group cursor-pointer"
            title="Klik untuk membuka Pengaturan Profil & Foto"
          >
            <img
              src={currentUser.avatar && currentUser.avatar.trim().length > 0 ? currentUser.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name || 'guru')}`}
              alt={currentUser.name || 'Guru'}
              referrerPolicy="no-referrer"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-emerald-500/30 group-hover:ring-emerald-500 border border-slate-200 shadow-sm transition-all"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name || 'guru')}`;
              }}
            />
            <span
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"
              title="Aktif • Wali Kelas"
            ></span>
            <span className="absolute inset-0 bg-slate-900/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
              Ubah
            </span>
          </button>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <UserCheck className="w-3 h-3" />
                Wali Kelas PAUD
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                <School className="w-3 h-3" />
                TK Kelompok B (Bintang)
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {greeting}, <span className="text-emerald-700">{currentUser.name}</span>
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1 text-slate-700">
                <School className="w-3.5 h-3.5 text-emerald-600" />
                {currentUser.schoolName || 'Profil Sekolah Belum Diisi'}
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="text-slate-600 font-semibold">Tahun Ajaran 2026/2027</span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="text-emerald-700 font-bold bg-emerald-50/80 px-2 py-0.5 rounded-md">
                Semester I - Ganjil
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Tanggal Hari Ini & Tombol Aksi Header (Pengaturan, Notifikasi, Logout) */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-semibold">
            <CalendarIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{todayString || 'Senin, 3 Agustus 2026'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNotifications}
              className="relative p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 hover:text-emerald-700 transition-colors shadow-2xs group"
              title="Pusat Notifikasi & Pesan"
            >
              <Bell className="w-5 h-5 group-hover:scale-105 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 hover:text-emerald-700 transition-colors shadow-2xs group"
              title="Pengaturan Akun Guru"
            >
              <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            </button>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-700 text-xs font-bold transition-colors shadow-2xs"
              title="Keluar dari Aplikasi"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
