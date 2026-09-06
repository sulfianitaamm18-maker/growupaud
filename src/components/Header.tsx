import React, { useState } from 'react';
import {
  Sprout,
  Bell,
  Search,
  ShieldCheck,
  Building2,
  Sparkles,
  PlusCircle,
  LogOut,
  MessageSquare,
  CheckCircle2,
  X,
  User,
  Camera,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { UserProfileModal } from './common/UserProfileModal';

interface HeaderProps {
  currentUser: UserProfile;
  onOpenNewObservation?: () => void;
  onOpenReportModal?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onLogout?: () => void;
}

const ROLE_BADGE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  GURU: {
    bg: 'bg-emerald-100 border-emerald-300',
    text: 'text-emerald-800',
    label: 'Guru PAUD',
  },
  TEACHER: {
    bg: 'bg-emerald-100 border-emerald-300',
    text: 'text-emerald-800',
    label: 'Guru PAUD',
  },
  ORANG_TUA: {
    bg: 'bg-blue-100 border-blue-300',
    text: 'text-blue-800',
    label: 'Orang Tua',
  },
  PARENT: {
    bg: 'bg-blue-100 border-blue-300',
    text: 'text-blue-800',
    label: 'Orang Tua',
  },
  KEPALA_SEKOLAH: {
    bg: 'bg-amber-100 border-amber-300',
    text: 'text-amber-800',
    label: 'Kepala Sekolah',
  },
  PRINCIPAL: {
    bg: 'bg-amber-100 border-amber-300',
    text: 'text-amber-800',
    label: 'Kepala Sekolah',
  },
  SUPER_ADMIN: {
    bg: 'bg-purple-100 border-purple-300',
    text: 'text-purple-800',
    label: 'Super Admin',
  },
  ADMIN: {
    bg: 'bg-purple-100 border-purple-300',
    text: 'text-purple-800',
    label: 'Admin Sekolah',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenNewObservation,
  searchQuery,
  setSearchQuery,
  onLogout,
}) => {
  const badge = ROLE_BADGE_COLORS[currentUser.role] || {
    bg: 'bg-slate-100 border-slate-300',
    text: 'text-slate-800',
    label: currentUser.role,
  };
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const notifications = [
    {
      id: 'notif-1',
      title: 'Tanggapan Orang Tua (Ananda Fatih Al-Fatih)',
      message: 'Ibu Aisyah Rahmawati: "Terima kasih Bu Guru atas laporannya. Di rumah Ananda sudah mulai rajin berdoa sebelum makan."',
      time: '10 menit yang lalu',
      read: false,
      type: 'feedback',
    },
    {
      id: 'notif-2',
      title: 'Status Laporan Dibaca',
      message: 'Orang Tua Ananda Fatih Al-Fatih telah membaca dan memeriksa Laporan Capaian Perkembangan Semester I.',
      time: '1 jam yang lalu',
      read: true,
      type: 'status',
    },
    {
      id: 'notif-3',
      title: 'Aktivitas Kelas Bintang',
      message: '6 anak telah berhasil dicatat observasinya untuk modul Nilai Agama & Moral.',
      time: 'Hari ini',
      read: true,
      type: 'system',
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-800">
                  Grow<span className="text-emerald-600">UP</span>AUD
                </span>
                <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  GAI AI-Powered
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block font-medium">
                Growth Monitoring Platform for Early Childhood Education
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama anak (Ananda...), kelas, atau observasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all text-slate-700 font-medium"
              />
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* School identity badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-semibold text-slate-700 truncate max-w-[170px]">
                {currentUser.schoolName}
              </span>
            </div>

            {/* Tombol Observasi Baru (Hanya untuk Guru) */}
            {(currentUser.role === 'GURU' || currentUser.role === 'TEACHER') && onOpenNewObservation && (
              <button
                onClick={onOpenNewObservation}
                id="btn-new-observation"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Observasi Baru</span>
              </button>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                title="Notifikasi & Komunikasi Guru - Orang Tua"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white"></span>
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <span>Pesan &amp; Notifikasi Perkembangan</span>
                    </div>
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 text-left hover:bg-slate-50 transition-colors ${
                          !item.read ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {item.type === 'feedback' && <MessageSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                            {item.type === 'status' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            <span>{item.title}</span>
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 font-medium">
                      ✓ Komunikasi Dua Arah Aktif (Guru ↔ Orang Tua)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile + Tombol Log Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors text-left group cursor-pointer"
                title="Klik untuk membuka Profil & Ganti Foto"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatar && currentUser.avatar.trim().length > 0 ? currentUser.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name || 'user')}`}
                    alt={currentUser.name || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200 group-hover:ring-emerald-500 transition-all"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name || 'user')}`;
                    }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-600 rounded-full text-white flex items-center justify-center shadow-xs">
                    <Camera className="w-2 h-2" />
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-none group-hover:text-emerald-700 transition-colors">
                    {currentUser.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                    {currentUser.className && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        • {currentUser.className}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Tombol Log Out (Keluar Akun) */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Keluar Akun (Log Out)"
                  className="ml-1 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Universal User Profile & Photo Modal */}
      {isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
        />
      )}
    </header>
  );
};

