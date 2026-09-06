import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userStore } from '../../services/userStore';
import { Sprout, Eye, EyeOff, LogIn, Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, logout, bootstrapFirstAdmin, error, clearError, loading, adminExists: authAdminExists, user } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // First admin bootstrap state
  const [hasAdmin, setHasAdmin] = useState<boolean>(true);
  const [isBootstrapMode, setIsBootstrapMode] = useState(false);
  const [adminFullName, setAdminFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setHasAdmin(authAdminExists);
    if (!authAdminExists) {
      setIsBootstrapMode(true);
    } else {
      setIsBootstrapMode(false);
    }
  }, [authAdminExists]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!username.trim()) {
      setLocalError('Silakan masukkan username Anda.');
      return;
    }
    if (!password) {
      setLocalError('Silakan masukkan password Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setLocalError(err.message || 'Username atau password tidak sesuai.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!adminFullName.trim() || !username.trim() || !password || !confirmPassword) {
      setLocalError('Semua kolom wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      await bootstrapFirstAdmin(username, password, adminFullName);
      setHasAdmin(true);
      setIsBootstrapMode(false);
    } catch (err: any) {
      setLocalError(err.message || 'Gagal membuat akun Admin pertama.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-4 font-sans text-slate-100">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/60 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6 text-center animate-fadeIn relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
            <Sprout className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1">
              Grow<span className="text-emerald-400">UP</span>AUD
            </h1>
            <p className="text-xs text-emerald-300 font-medium mt-1">
              Sistem Penilaian &amp; Capaian Perkembangan Anak Usia Dini
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {activeError && (
          <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-semibold text-left flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Authenticated Firebase Auth Session Badge */}
        {user && (
          <div className="p-3 rounded-2xl bg-slate-800/90 border border-emerald-500/30 text-slate-300 text-[11px] font-mono text-left space-y-2 shadow-inner">
            <div className="flex items-center justify-between">
              <p className="font-bold text-emerald-400 flex items-center gap-1.5 font-sans">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sesi Firebase Auth Aktif</span>
              </p>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  clearError();
                  setLocalError(null);
                }}
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-200 font-sans font-medium transition-colors"
              >
                Keluar / Ganti Akun
              </button>
            </div>
            <p className="text-slate-200">UID: <span className="text-emerald-300 font-bold">{user.uid}</span></p>
            <p className="text-slate-400">Email: {user.email || 'N/A'}</p>
          </div>
        )}

        {/* First Admin Bootstrap Form Mode */}
        {isBootstrapMode ? (
          <form onSubmit={handleBootstrapSubmit} className="space-y-4 text-left">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
              <p className="font-bold text-sm">Setup Admin Awal</p>
              <p className="text-[11px] mt-0.5 text-emerald-300/80">
                Belum ada Admin di sistem. Lakukan pembuatan akun Admin pertama sekolah Anda.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Nama Admin *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Admin Utama Sekolah"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Username *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Konfirmasi Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              {hasAdmin && (
                <button
                  type="button"
                  onClick={() => setIsBootstrapMode(false)}
                  className="w-1/3 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className={`${hasAdmin ? 'w-2/3' : 'w-full'} py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {isSubmitting ? 'Memproses...' : 'Buat Akun Admin Awal'}
              </button>
            </div>
          </form>
        ) : (
          /* Standard Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Masukkan username akun sekolah Anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-xs bg-slate-800/80 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-emerald-500 font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-xs bg-slate-800/80 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-emerald-500 font-medium transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting || loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* First time setup helper link if 0 admin exists */}
        {hasAdmin === false && !isBootstrapMode && (
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsBootstrapMode(true)}
              className="text-xs text-emerald-400 hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Inisialisasi Akun Admin Pertama Sekolah</span>
            </button>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800/80">
          <p className="text-[11px] text-slate-400 font-medium">
            🔒 Dilindungi dengan Akun Sekolah &amp; Firebase Authentication
          </p>
        </div>
      </div>
    </div>
  );
};
