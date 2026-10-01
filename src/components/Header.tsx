import React, { useState, useEffect } from 'react';
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
  Mail,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { UserProfileModal } from './common/UserProfileModal';
import { MessagingModal } from './messaging/MessagingModal';
import { messagingService } from '../services/messagingService';

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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
  const [messagingInitialTab, setMessagingInitialTab] = useState<'inbox' | 'compose' | 'notifications'>('inbox');
  const [unreadCounts, setUnreadCounts] = useState<{ unreadMessages: number; unreadNotifications: number }>({
    unreadMessages: 0,
    unreadNotifications: 0,
  });

  useEffect(() => {
    if (!currentUser.id) return;

    // Realtime unread counts listener directly from Firestore
    const unsubscribe = messagingService.subscribeUnreadCounts(currentUser.id, (counts) => {
      setUnreadCounts(counts);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser.id]);

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

            {/* Messages Inbox Button */}
            <button
              onClick={() => {
                setMessagingInitialTab('inbox');
                setIsMessagingModalOpen(true);
              }}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-emerald-700 transition-colors cursor-pointer"
              title="Pusat Pesan & Komunikasi Sekolah"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadCounts.unreadMessages > 0 && (
                <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold ring-2 ring-white">
                  {unreadCounts.unreadMessages > 9 ? '9+' : unreadCounts.unreadMessages}
                </span>
              )}
            </button>

            {/* Notification Bell Button */}
            <button
              onClick={() => {
                setMessagingInitialTab('notifications');
                setIsMessagingModalOpen(true);
              }}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-emerald-700 transition-colors cursor-pointer"
              title="Notifikasi Sistem & Perkembangan"
            >
              <Bell className="w-5 h-5" />
              {unreadCounts.unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white"></span>
              )}
            </button>

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

      {/* Real School Messaging & Communication Center */}
      {isMessagingModalOpen && (
        <MessagingModal
          isOpen={isMessagingModalOpen}
          onClose={() => {
            setIsMessagingModalOpen(false);
            messagingService.getUnreadCounts().then(setUnreadCounts).catch(() => {});
          }}
          currentUser={currentUser}
          initialTab={messagingInitialTab}
        />
      )}
    </header>
  );
};

