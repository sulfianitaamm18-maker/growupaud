import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  User,
  Image as ImageIcon,
} from 'lucide-react';
import { userStore } from '../../services/userStore';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';

interface ProfilePhotoUploaderProps {
  currentAvatar?: string | null;
  userName?: string;
  userId: string;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
  className?: string;
  showCard?: boolean;
}

/**
 * Compresses an image file to an optimized WebP/JPEG data URL (256x256 max)
 */
async function compressImageToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Crop to square aspect ratio centered
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        canvas.width = Math.min(maxSize, minDim);
        canvas.height = Math.min(maxSize, minDim);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context could not be created'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
          img,
          startX,
          startY,
          minDim,
          minDim,
          0,
          0,
          canvas.width,
          canvas.height
        );

        // Try webp first, fallback to jpeg
        try {
          const webpData = canvas.toDataURL('image/webp', 0.85);
          if (webpData && webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback
        }

        const jpegData = canvas.toDataURL('image/jpeg', 0.85);
        resolve(jpegData);
      };
      img.onerror = () => reject(new Error('Format file gambar tidak valid atau rusak.'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsDataURL(file);
  });
}

export const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  currentAvatar,
  userName = 'User',
  userId,
  onAvatarUpdated,
  className = '',
  showCard = false,
}) => {
  const { refreshUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    userName || 'growupaud'
  )}`;

  const activeDisplayAvatar =
    previewUrl ||
    (!imageLoadError && currentAvatar && currentAvatar.trim().length > 0
      ? currentAvatar
      : fallbackAvatar);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setImageLoadError(false);

    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validation: Must be image
    if (!file.type.startsWith('image/')) {
      setErrorMessage('File harus berupa format gambar (JPG, PNG, WEBP, GIF).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validation: Max size 5MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage('Ukuran file foto terlalu besar (maksimal 5 MB).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      // Compress and generate preview
      const compressedDataUrl = await compressImageToDataUrl(file);
      setSelectedFile(file);
      setPreviewUrl(compressedDataUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses file foto.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelPreview = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveAvatar = async () => {
    if (!previewUrl) return;

    // Security check: Must be authenticated and editing own profile
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      setErrorMessage('Akses ditolak: Anda hanya dapat mengganti foto profil milik sendiri.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Update ONLY the avatar field on users/{uid}
      await userStore.updateUserProfile(userId, {
        avatar: previewUrl,
      });

      // Refresh Auth Context to sync avatar globally
      await refreshUserProfile();

      if (onAvatarUpdated) {
        onAvatarUpdated(previewUrl);
      }

      setSuccessMessage('Foto profil berhasil diperbarui!');
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Error saving avatar:', err);
      setErrorMessage(
        err.message || 'Gagal menyimpan foto profil ke Firestore. Silakan coba lagi.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const content = (
    <div className={`space-y-4 ${className}`}>
      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Gagal Mengganti Foto</p>
            <p>{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {/* Main Avatar & Actions Section */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar Display */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden ring-4 ring-slate-100 border border-slate-200 shadow-md bg-slate-50 flex items-center justify-center">
            <img
              src={activeDisplayAvatar}
              alt={userName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
              onError={() => setImageLoadError(true)}
            />
          </div>

          {previewUrl && (
            <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-xs">
              Preview
            </span>
          )}

          {/* Quick trigger overlay */}
          {!previewUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-slate-900/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
              title="Ganti Foto Profil"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px]">Ubah Foto</span>
            </button>
          )}
        </div>

        {/* Info & Action Controls */}
        <div className="flex-1 text-center sm:text-left space-y-2.5">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Foto Profil Akun</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Format yang didukung: JPG, PNG, WEBP. Maksimal ukuran file 5 MB.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Buttons State */}
          {!previewUrl ? (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ganti Foto Profil</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 inline-block">
                Foto baru siap disimpan. Konfirmasi untuk menerapkan perubahan.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Foto...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan Foto Profil</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelPreview}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (showCard) {
    return (
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        {content}
      </div>
    );
  }

  return content;
};
