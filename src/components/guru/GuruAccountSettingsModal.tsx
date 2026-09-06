import React, { useState } from 'react';
import {
  Settings,
  X,
  User,
  School,
  Bell,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';
import { userStore } from '../../services/userStore';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';

interface GuruAccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export const GuruAccountSettingsModal: React.FC<GuruAccountSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const { refreshUserProfile } = useAuth();
  const [name, setName] = useState(currentUser.name || currentUser.displayName || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [className, setClassName] = useState(currentUser.className || 'TK Kelompok B (Bintang)');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifWA, setNotifWA] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!auth.currentUser || auth.currentUser.uid !== currentUser.id) {
      setErrorMessage('Akses ditolak: Anda hanya dapat memperbarui data milik sendiri.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await userStore.updateUserProfile(currentUser.id, {
        name: name.trim(),
        displayName: name.trim(),
        email: email.trim(),
        className: className.trim(),
      });

      await refreshUserProfile();
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Pengaturan Akun Guru &amp; Sekolah PAUD</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {isSaved && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pengaturan akun berhasil disimpan!</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section: Profile Photo Uploader */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <ProfilePhotoUploader
              currentAvatar={currentUser.avatar}
              userName={currentUser.name}
              userId={currentUser.id}
            />
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Nama Lengkap &amp; Gelar
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Alamat Email Sekolah / Pribadi
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Kelas yang Diampu
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-emerald-600" />
                <span>Preferensi Notifikasi &amp; Pesan</span>
              </h4>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">
                    Notifikasi Email Laporan Rapor
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Kirim ringkasan mingguan capaian anak ke email guru
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifEmail}
                  onChange={(e) => setNotifEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">
                    Notifikasi WhatsApp Pesan Orang Tua
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Terima peringatan langsung saat ada pesan masuk dari wali murid
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifWA}
                  onChange={(e) => setNotifWA(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
