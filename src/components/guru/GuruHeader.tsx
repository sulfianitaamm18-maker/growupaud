import React, { useState, useEffect } from 'react';
import {
  Bell,
  MessageSquare,
  Settings,
  Calendar as CalendarIcon,
  School,
  Sparkles,
  UserCheck,
  PlusCircle,
} from 'lucide-react';
import { UserProfile } from '../../types';

interface GuruHeaderProps {
  currentUser: UserProfile;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onOpenInbox?: () => void;
  onLogout?: () => void;
  unreadCount?: number;
  unreadMessagesCount?: number;
  onOpenNewObservation?: () => void;
}

export const GuruHeader: React.FC<GuruHeaderProps> = ({
  currentUser,
  onOpenSettings,
  onOpenNotifications,
  onOpenInbox,
  unreadCount = 0,
  unreadMessagesCount = 0,
  onOpenNewObservation,
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
    <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
      <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute right-32 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Sisi Kiri: Foto Guru, Role Badge, Sapaan & Identitas Sekolah */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={onOpenSettings}
              className="relative block rounded-2xl group cursor-pointer focus:outline-none"
              title="Klik untuk membuka Pengaturan Profil & Foto Guru"
            >
              <img
                src={
                  currentUser.avatar && currentUser.avatar.trim().length > 0
                    ? currentUser.avatar
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                        currentUser.name || 'guru'
                      )}`
                }
                alt={currentUser.name || 'Guru'}
                referrerPolicy="no-referrer"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-white/10 shadow-xl transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    currentUser.name || 'guru'
                  )}`;
                }}
              />
              <span
                className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg border-2 border-slate-900 transition-all flex items-center justify-center"
                title="Pengaturan Akun & Foto"
              >
                <Settings className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Dashboard Guru — GrowUPAUD</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-white border border-white/15">
                <UserCheck className="w-3 h-3 text-emerald-400" />
                <span>{currentUser.className ? `Wali Kelas ${currentUser.className}` : 'Guru Kelas PAUD'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {greeting}, <span className="text-emerald-400">{currentUser.name}</span> 👋
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="flex items-center gap-1 text-white font-semibold">
                <School className="w-3.5 h-3.5 text-emerald-400" />
                {currentUser.schoolName || 'PAUD Terpadu'}
              </span>
              <span className="text-slate-500">•</span>
              <span>Tahun Ajaran 2026/2027</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-300 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                Semester I (Ganjil)
              </span>
            </p>
          </div>
        </div>

        {/* Sisi Kanan: Tombol Observasi Cepat, Tanggal, Notifikasi & Profil (Tanpa tombol keluar duplikat) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenNewObservation && (
            <button
              onClick={onOpenNewObservation}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              title="Catat Observasi Baru"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Observasi Baru</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-slate-200 text-xs font-semibold">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{todayString || 'Senin, 3 Agustus 2026'}</span>
          </div>

          {onOpenInbox && (
            <button
              onClick={onOpenInbox}
              className="relative px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              title="Kotak Masuk Pesan & Komunikasi Sekolah"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Pesan</span>
              {unreadMessagesCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-slate-900">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenNotifications}
            className="relative px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            title="Pusat Notifikasi Sistem"
          >
            <Bell className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Notifikasi</span>
            {unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            title="Pengaturan Akun Guru"
          >
            <Settings className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

