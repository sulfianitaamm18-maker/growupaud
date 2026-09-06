import React, { useState } from 'react';
import {
  User,
  X,
  Building2,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Camera,
  School,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { ProfilePhotoUploader } from './ProfilePhotoUploader';
import { userStore } from '../../services/userStore';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  ADMIN: 'Administrator Sekolah',
  SUPER_ADMIN: 'Super Administrator',
  TEACHER: 'Guru / Wali Kelas PAUD',
  GURU: 'Guru / Wali Kelas PAUD',
  PRINCIPAL: 'Kepala Sekolah',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  PARENT: 'Orang Tua / Wali Murid',
  ORANG_TUA: 'Orang Tua / Wali Murid',
};

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const { refreshUserProfile } = useAuth();
  const [name, setName] = useState(currentUser.name || currentUser.displayName || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  if (!isOpen) return null;

  const roleLabel = ROLE_DISPLAY_NAMES[currentUser.role] || currentUser.role;

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!auth.currentUser || auth.currentUser.uid !== currentUser.id) {
      setDetailsError('Akses ditolak: Anda hanya dapat memperbarui data milik sendiri.');
      return;
    }

    setIsSavingDetails(true);
    setDetailsError(null);
    setDetailsSuccess(false);

    try {
      // Safe update: only name & email
      await userStore.updateUserProfile(currentUser.id, {
        name: name.trim(),
        displayName: name.trim(),
        email: email.trim(),
      });

      await refreshUserProfile();
      setDetailsSuccess(true);
      setTimeout(() => setDetailsSuccess(false), 3000);
    } catch (err: any) {
      setDetailsError(err.message || 'Gagal menyimpan pembaruan profil.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Profil &amp; Foto Akun Saya
              </h3>
              <p className="text-xs text-slate-500">
                Kelola foto profil dan informasi akun Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Photo Uploader */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <ProfilePhotoUploader
            currentAvatar={currentUser.avatar}
            userName={currentUser.name || currentUser.displayName}
            userId={currentUser.id}
          />
        </div>

        {/* Section 2: Account Details */}
        <form onSubmit={handleSaveDetails} className="space-y-3.5 text-xs">
          {detailsSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Informasi profil berhasil diperbarui!</span>
            </div>
          )}

          {detailsError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{detailsError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Username</label>
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-mono font-bold">
                @{currentUser.username}
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Peran / Role</label>
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold truncate">
                {roleLabel}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@sekolah.sch.id"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {currentUser.schoolName && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sekolah</label>
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-medium flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentUser.schoolName}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-xs transition"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={isSavingDetails}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingDetails ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
