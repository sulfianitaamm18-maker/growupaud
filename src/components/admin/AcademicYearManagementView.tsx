import React, { useState, useEffect } from 'react';
import {
  Calendar,
  PlusCircle,
  CheckCircle2,
  Lock,
  ArrowRightLeft,
  AlertCircle,
  Clock,
  Sparkles,
  Users,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { academicYearService } from '../../services/academicYearService';
import { enrollmentService } from '../../services/enrollmentService';
import { AcademicYear, SemesterNumber } from '../../types';
import { formatSemesterLabel } from '../../utils/semesterUtils';
import { useAuth } from '../../context/AuthContext';

interface AcademicYearManagementViewProps {
  schoolId?: string;
}

export const AcademicYearManagementView: React.FC<AcademicYearManagementViewProps> = ({
  schoolId = 'main-school',
}) => {
  const { userProfile } = useAuth();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formSemester, setFormSemester] = useState<SemesterNumber>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Confirmation Modal
  const [confirmAction, setConfirmAction] = useState<{
    type: 'ACTIVATE' | 'SWITCH_SEMESTER' | 'CLOSE';
    year: AcademicYear;
    targetSemester?: SemesterNumber;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const list = await academicYearService.getAcademicYears(schoolId);
      setAcademicYears(list);

      // Load enrollment counts for each academic year
      const counts: Record<string, number> = {};
      await Promise.all(
        list.map(async (y) => {
          const enrs = await enrollmentService.getEnrollments(schoolId, { academicYearId: y.id });
          counts[y.id] = enrs.length;
        })
      );
      setEnrollmentCounts(counts);
    } catch (err: any) {
      console.error('Gagal memuat tahun ajaran:', err);
      setErrorBanner(err.message || 'Gagal mengambil data tahun ajaran.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama tahun ajaran wajib diisi (contoh: 2026/2027).');
      return;
    }
    if (!formStartDate || !formEndDate) {
      alert('Tanggal mulai dan selesai wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await academicYearService.createAcademicYear(
        {
          schoolId,
          name: formName.trim(),
          startDate: formStartDate,
          endDate: formEndDate,
          status: 'PLANNED',
          activeSemester: formSemester,
        },
        userProfile?.role || 'ADMIN',
        userProfile?.name || 'Administrator'
      );

      setShowAddModal(false);
      setFormName('');
      setFormStartDate('');
      setFormEndDate('');
      setFormSemester(1);
      showToast(`Tahun Ajaran ${formName.trim()} berhasil ditambahkan.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat tahun ajaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, year, targetSemester } = confirmAction;
    setSubmitting(true);

    try {
      if (type === 'ACTIVATE') {
        await academicYearService.activateAcademicYear(
          year.id,
          schoolId,
          userProfile?.role || 'ADMIN',
          userProfile?.name || 'Administrator'
        );
        showToast(`Tahun Ajaran ${year.name} sekarang AKTIF.`);
      } else if (type === 'SWITCH_SEMESTER') {
        await academicYearService.switchSemester(
          year.id,
          schoolId,
          userProfile?.role || 'ADMIN',
          userProfile?.name || 'Administrator'
        );
        showToast(`Tahun Ajaran ${year.name} beralih ke ${formatSemesterLabel(targetSemester || 2)}.`);
      } else if (type === 'CLOSE') {
        await academicYearService.closeAcademicYear(
          year.id,
          schoolId,
          undefined,
          userProfile?.role || 'ADMIN',
          userProfile?.name || 'Administrator'
        );
        showToast(`Tahun Ajaran ${year.name} berhasil ditutup (CLOSED).`);
      }
      setConfirmAction(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses aksi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Siklus Akademik Sekolah</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Kelola Tahun Ajaran & Semester
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Atur tahun ajaran aktif, pergantian semester, dan penutupan periode. Hanya boleh ada 1
            Tahun Ajaran aktif di sekolah dalam satu waktu.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-md shadow-emerald-700/10 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tahun Ajaran Baru</span>
        </button>
      </div>

      {errorBanner && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-800 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* List of Academic Years */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Memuat data tahun ajaran...</p>
        </div>
      ) : academicYears.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Belum Ada Tahun Ajaran</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Mulai siklus akademik dengan membuat Tahun Ajaran pertama (misal: 2026/2027) untuk
            mengaktifkan pendaftaran dan observasi peserta didik.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buat Tahun Ajaran</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {academicYears.map((year) => {
            const isActive = year.status === 'ACTIVE';
            const isClosed = year.status === 'CLOSED';
            const enrolledCount = enrollmentCounts[year.id] || 0;

            return (
              <div
                key={year.id}
                className={`bg-white rounded-3xl border transition-all p-6 flex flex-col justify-between relative overflow-hidden ${
                  isActive
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : isClosed
                    ? 'border-slate-200 bg-slate-50/60 opacity-90'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Aktif Berjalan</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-lg ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : isClosed
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {year.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {year.startDate} s/d {year.endDate}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
                    {year.name}
                  </h3>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between text-xs bg-slate-100/70 p-2.5 rounded-xl">
                      <span className="text-slate-600 font-medium">Semester Berjalan:</span>
                      <span className="font-bold text-slate-900">
                        {formatSemesterLabel(year.activeSemester)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-100/70 p-2.5 rounded-xl">
                      <span className="text-slate-600 font-medium flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Total Siswa Terdaftar:
                      </span>
                      <span className="font-bold text-emerald-700">
                        {enrolledCount} Siswa
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {isActive && (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          if (year.activeSemester === 1) {
                            setConfirmAction({
                              type: 'SWITCH_SEMESTER',
                              year,
                              targetSemester: 2,
                            });
                          } else {
                            // Already semester 2 -> Give guidance
                            alert(
                              'Semester 2 adalah semester akhir pada Tahun Ajaran ini. Silakan lakukan Rekap Tahunan dan Tutup Tahun Ajaran jika periode telah selesai.'
                            );
                          }
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
                        <span>
                          {year.activeSemester === 1
                            ? 'Beralih ke Semester 2 (Genap)'
                            : 'Semester 2 Aktif (Akhir)'}
                        </span>
                      </button>

                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: 'CLOSE',
                            year,
                          })
                        }
                        className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 border border-slate-200 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Tutup Tahun Ajaran (Selesai)</span>
                      </button>
                    </div>
                  )}

                  {!isActive && !isClosed && (
                    <button
                      onClick={() =>
                        setConfirmAction({
                          type: 'ACTIVATE',
                          year,
                        })
                      }
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aktifkan Tahun Ajaran Ini</span>
                    </button>
                  )}

                  {isClosed && (
                    <div className="text-center py-2 text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-xl flex items-center justify-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Tahun Ajaran Ditutup (Arsip Permanen)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Tahun Ajaran */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg">Tambah Tahun Ajaran Baru</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Tahun Ajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 2026/2027"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Mulai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Selesai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Semester Awal
                </label>
                <select
                  value={formSemester}
                  onChange={(e) => setFormSemester(Number(e.target.value) as SemesterNumber)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold outline-hidden bg-white"
                >
                  <option value={1}>Semester 1 (Ganjil)</option>
                  <option value={2}>Semester 2 (Genap)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Tahun Ajaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">
                Konfirmasi Aksi Tahun Ajaran
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmAction.type === 'ACTIVATE' && (
                <>
                  Apakah Anda yakin ingin mengaktifkan Tahun Ajaran{' '}
                  <strong className="text-slate-900">{confirmAction.year.name}</strong>? Tahun ajaran
                  yang saat ini aktif akan otomatis dinonaktifkan/ditutup.
                </>
              )}
              {confirmAction.type === 'SWITCH_SEMESTER' && (
                <>
                  Apakah Anda yakin ingin mengganti semester aktif Tahun Ajaran{' '}
                  <strong className="text-slate-900">{confirmAction.year.name}</strong> menjadi{' '}
                  <strong className="text-slate-900">
                    {formatSemesterLabel(confirmAction.targetSemester || 2)}
                  </strong>
                  ? Observasi baru berikutnya akan tercatat pada semester ini.
                </>
              )}
              {confirmAction.type === 'CLOSE' && (
                <>
                  Peringatan: Menutup Tahun Ajaran{' '}
                  <strong className="text-slate-900">{confirmAction.year.name}</strong> akan
                  menguncinya menjadi arsip permanen. Observasi baru tidak akan dapat ditambahkan
                  lagi ke tahun ajaran yang sudah ditutup.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Memproses...' : 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
