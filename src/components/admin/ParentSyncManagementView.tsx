import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  KeyRound,
  GraduationCap,
  Filter,
  Eye,
  EyeOff,
  ChevronRight,
  Info,
  Check,
  X,
} from 'lucide-react';
import { parentSyncService, ParentSyncItem } from '../../services/parentSyncService';
import { userStore } from '../../services/userStore';
import { schoolStore } from '../../services/schoolStore';

export const ParentSyncManagementView: React.FC = () => {
  const [items, setItems] = useState<ParentSyncItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Summary counts
  const [summary, setSummary] = useState<{
    totalExamined: number;
    created: number;
    alreadyExisting: number;
    incomplete: number;
    failed: number;
  }>({
    totalExamined: 0,
    created: 0,
    alreadyExisting: 0,
    incomplete: 0,
    failed: 0,
  });

  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [showPasswords, setShowPasswords] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  // Load initial status of 64 students
  const loadStatus = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await parentSyncService.getStatus();
      setItems(res.items);
      setSummary({
        totalExamined: res.summary.totalStudents,
        created: 0,
        alreadyExisting: res.summary.alreadyExisting,
        incomplete: res.summary.incomplete,
        failed: 0,
      });
    } catch (err: any) {
      console.error('Failed to load parent sync status:', err);
      setErrorMessage(err.message || 'Gagal memuat status data anak.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Execute full sync
  const handleExecuteSync = async () => {
    setIsConfirmModalOpen(false);
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const res = await parentSyncService.executeSync();
      setItems(res.items);
      setSummary({
        totalExamined: res.summary.totalStudents,
        created: res.summary.created,
        alreadyExisting: res.summary.alreadyExisting,
        incomplete: res.summary.incomplete,
        failed: res.summary.failed,
      });
      setHasExecuted(true);

      // Invalidate user cache to ensure UserManagementView and store see new users
      userStore.invalidateUserCache();
      schoolStore.clearCache();

      showToast(`Sinkronisasi selesai! ${res.summary.created} akun dibuat, ${res.summary.alreadyExisting} akun terhubung.`);
    } catch (err: any) {
      console.error('Execute sync error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat menjalankan sinkronisasi.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Extract available classes for filter
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.className && it.className !== '-') set.add(it.className);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        it.studentName.toLowerCase().includes(q) ||
        it.parentName.toLowerCase().includes(q) ||
        it.className.toLowerCase().includes(q) ||
        it.username.toLowerCase().includes(q);

      let matchStatus = true;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'BERHASIL') {
          matchStatus = it.status === 'BERHASIL';
        } else if (statusFilter === 'SUDAH ADA') {
          matchStatus = it.status === 'SUDAH ADA';
        } else if (statusFilter === 'BELUM_LENGKAP') {
          matchStatus = it.status === 'BELUM_LENGKAP';
        } else if (statusFilter === 'GAGAL') {
          matchStatus = it.status === 'GAGAL';
        }
      }

      let matchClass = true;
      if (classFilter !== 'ALL') {
        matchClass = it.className.toLowerCase() === classFilter.toLowerCase();
      }

      return matchSearch && matchStatus && matchClass;
    });
  }, [items, searchQuery, statusFilter, classFilter]);

  const renderStatusBadge = (status: ParentSyncItem['status']) => {
    switch (status) {
      case 'BERHASIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Berhasil</span>
          </span>
        );
      case 'SUDAH ADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Sudah Ada</span>
          </span>
        );
      case 'BELUM_LENGKAP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Belum Lengkap</span>
          </span>
        );
      case 'GAGAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Gagal</span>
          </span>
        );
      case 'BELUM_DISINKRONKAN':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Belum Disinkronkan</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-800">
                Konfirmasi Sinkronisasi Akun Orang Tua
              </h3>
              <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs text-indigo-950 font-medium leading-relaxed">
                &ldquo;Sistem akan memeriksa seluruh data anak dan membuat/menautkan akun orang tua yang belum tersedia. Data anak dan data akademik tidak akan diubah.&rdquo;
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>Aturan Pembuatan Akun:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                <li>Username diambil dari nama orang tua/wali (dibersihkan spasi &amp; karakter khusus).</li>
                <li>Password awal berasal dari nama kelas anak (dikonversi ke lowercase).</li>
                <li>Jika satu orang tua memiliki lebih dari satu anak, hanya satu akun yang dibuat dan dihubungkan ke semua anaknya.</li>
                <li>Akun yang sudah ada tidak akan diduplikasi, melainkan dipastikan relasinya tetap terhubung.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteSync}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ya, Mulai Sinkronisasi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200/80 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
              <span>Manajemen Pengguna Orang Tua</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-700 font-bold">Sinkronisasi Akun Orang Tua</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <HeartHandshake className="w-6 h-6 text-indigo-600" />
              <span>Sinkronisasi Otomatis Data Anak &rarr; Pengguna Orang Tua</span>
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              Hubungkan 64 data anak dengan akun orang tua secara otomatis. Orang tua dapat login dengan username dari nama wali dan password awal dari nama kelas.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={loadStatus}
              disabled={isLoading || isSyncing}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Segarkan Status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Segarkan</span>
            </button>

            <button
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={isLoading || isSyncing}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Sedang Menyinkronkan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Sinkronkan 64 Data Anak</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sync Result Summary Banner */}
        {hasExecuted && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-emerald-900">Sinkronisasi Berhasil Dijalankan!</p>
                <p className="text-[11px] text-emerald-700">
                  Seluruh 64 data anak telah diperiksa. Akun pengguna orang tua dan relasinya telah diperbarui.
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-emerald-800">
              Dibuat: <span className="font-bold">{summary.created}</span> | Sudah Ada: <span className="font-bold">{summary.alreadyExisting}</span> | Belum Lengkap: <span className="font-bold">{summary.incomplete}</span>
            </div>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Total Anak</span>
            </div>
            <p className="text-xl font-black text-slate-800">{items.length}</p>
            <p className="text-[10px] text-slate-400">Data tersimpan di sekolah</p>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Berhasil Dibuat</span>
            </div>
            <p className="text-xl font-black text-emerald-800">
              {hasExecuted ? summary.created : items.filter((i) => i.status === 'BERHASIL').length}
            </p>
            <p className="text-[10px] text-emerald-600">Akun baru tersinkron</p>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Sudah Ada</span>
            </div>
            <p className="text-xl font-black text-blue-800">
              {hasExecuted ? summary.alreadyExisting : items.filter((i) => i.status === 'SUDAH ADA').length}
            </p>
            <p className="text-[10px] text-blue-600">Akun tertaut sebelumnya</p>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Belum Lengkap</span>
            </div>
            <p className="text-xl font-black text-amber-800">
              {items.filter((i) => i.status === 'BELUM_LENGKAP').length}
            </p>
            <p className="text-[10px] text-amber-600">Data orang tua/kelas kosong</p>
          </div>

          <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Gagal</span>
            </div>
            <p className="text-xl font-black text-rose-800">
              {items.filter((i) => i.status === 'GAGAL').length}
            </p>
            <p className="text-[10px] text-rose-600">Kendala sistem/auth</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama anak, orang tua, kelas, atau username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-hidden font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Status</option>
              <option value="BERHASIL">Status: Berhasil</option>
              <option value="SUDAH ADA">Status: Sudah Ada</option>
              <option value="BELUM_LENGKAP">Status: Belum Lengkap</option>
              <option value="GAGAL">Status: Gagal</option>
            </select>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Semua Kelas</option>
              {availableClasses.map((c) => (
                <option key={c} value={c}>
                  Kelas: {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                showPasswords
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title={showPasswords ? 'Sembunyikan password awal' : 'Tampilkan password awal'}
            >
              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden md:inline">Password</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Anak</th>
                <th className="py-3 px-4">Orang Tua / Wali</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Password Awal</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <span className="text-xs font-semibold">Memeriksa 64 data anak...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Tidak ada data ditemukan</p>
                    <p className="text-xs text-slate-400">Sesuaikan kata kunci pencarian atau filter status.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr key={item.studentId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    {/* Anak */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{item.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.studentId}</div>
                    </td>

                    {/* Orang Tua */}
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {item.parentName !== '-' ? (
                        item.parentName
                      ) : (
                        <span className="text-amber-600 font-bold italic">Tidak tersedia</span>
                      )}
                    </td>

                    {/* Kelas */}
                    <td className="py-3 px-4">
                      {item.className !== '-' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200/60">
                          <GraduationCap className="w-3 h-3 text-indigo-500" />
                          <span>{item.className}</span>
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold italic">Tidak tersedia</span>
                      )}
                    </td>

                    {/* Username */}
                    <td className="py-3 px-4">
                      {item.username !== '-' ? (
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.username}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Password Awal */}
                    <td className="py-3 px-4">
                      {item.displayPassword !== '-' ? (
                        <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {showPasswords ? item.displayPassword : '••••••••'}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Keterangan */}
                    <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs">
                      {item.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <p>
            Menampilkan <span className="font-bold text-slate-800">{filteredItems.length}</span> dari{' '}
            <span className="font-bold text-slate-800">{items.length}</span> data anak.
          </p>
          <p className="text-[11px] text-slate-400">
            Sistem menjamin data profil siswa, catatan perkembangan, dan observasi tidak dimodifikasi.
          </p>
        </div>
      </div>
    </div>
  );
};
