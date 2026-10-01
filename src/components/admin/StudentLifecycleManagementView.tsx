import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  ArrowUpRight,
  RotateCcw,
  LogOut,
  Send,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  User,
  Calendar,
  X,
  ShieldCheck,
  ChevronRight,
  Clock,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import { academicYearService } from '../../services/academicYearService';
import { enrollmentService } from '../../services/enrollmentService';
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';
import {
  AcademicYear,
  ClassRoom,
  Enrollment,
  StudentProfile,
} from '../../types';
import { useAuth } from '../../context/AuthContext';

interface StudentLifecycleManagementViewProps {
  schoolId?: string;
}

type LifecycleActionType = 'PROMOTE' | 'REPEAT' | 'GRADUATE' | 'TRANSFER';

export const StudentLifecycleManagementView: React.FC<StudentLifecycleManagementViewProps> = ({
  schoolId = 'main-school',
}) => {
  const { userProfile } = useAuth();

  // Data states
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [allYears, setAllYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  // Modal Action State
  const [activeModal, setActiveModal] = useState<{
    action: LifecycleActionType;
    student: StudentProfile;
    currentEnrollment: Enrollment;
  } | null>(null);

  // Form States inside modal
  const [targetAcademicYearId, setTargetAcademicYearId] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [actionReason, setActionReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [currActiveYear, yearList, classList, studentList] = await Promise.all([
        academicYearService.getActiveAcademicYear(schoolId),
        academicYearService.getAcademicYears(schoolId),
        classService.getClasses(schoolId),
        studentService.getStudents(schoolId),
      ]);

      setActiveYear(currActiveYear);
      setAllYears(yearList);
      setClasses(classList);

      // Fetch active enrollments for students
      const enrMap: Record<string, Enrollment> = {};
      if (currActiveYear) {
        const enrList = await enrollmentService.getEnrollments(schoolId, {
          academicYearId: currActiveYear.id,
          status: 'ACTIVE',
        });
        enrList.forEach((enr) => {
          enrMap[enr.studentId] = enr;
        });
      }

      setEnrollments(enrMap);
      // Filter students who are not yet archived
      setStudents(studentList.filter((s) => s.status !== 'GRADUATED' && s.status !== 'TRANSFERRED'));
    } catch (err) {
      console.error('Gagal memuat data siklus siswa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const handleQuickEnroll = async (student: StudentProfile) => {
    if (!activeYear) {
      alert('Tidak ada tahun ajaran yang sedang aktif.');
      return;
    }
    setSubmitting(true);
    try {
      await enrollmentService.ensureStudentEnrollment(
        student,
        activeYear.id,
        activeYear.name,
        userProfile?.role || 'ADMIN',
        userProfile?.name || 'Administrator'
      );
      showToast(`Enrollment untuk ${student.name} berhasil diaktifkan pada Tahun Ajaran ${activeYear.name}.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mendaftarkan siswa.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open modal with preselected defaults
  const openActionModal = async (action: LifecycleActionType, student: StudentProfile) => {
    let currentEnr = enrollments[student.id];
    if (!currentEnr) {
      if (!activeYear) {
        alert('Tidak ada tahun ajaran yang sedang aktif untuk mendaftarkan siswa ini.');
        return;
      }
      const confirmEnroll = window.confirm(
        `Siswa ini (${student.name}) belum memiliki data Enrollment aktif di Tahun Ajaran ${activeYear.name}.\n\nApakah Anda ingin mendaftarkan enrollment aktif ke kelas "${student.className || 'yang tertera'}" terlebih dahulu sebelum memproses siklus ini?`
      );
      if (!confirmEnroll) return;

      setSubmitting(true);
      try {
        currentEnr = await enrollmentService.ensureStudentEnrollment(
          student,
          activeYear.id,
          activeYear.name,
          userProfile?.role || 'ADMIN',
          userProfile?.name || 'Administrator'
        );
        showToast(`Enrollment aktif untuk ${student.name} berhasil dibuat.`);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Gagal mengaktifkan enrollment siswa.');
        setSubmitting(false);
        return;
      } finally {
        setSubmitting(false);
      }
    }

    // Default target academic year to next available or active
    const nextYears = allYears.filter((y) => y.id !== activeYear?.id && y.status !== 'CLOSED');
    const defaultNextYear = nextYears.length > 0 ? nextYears[0].id : (activeYear?.id || '');
    setTargetAcademicYearId(defaultNextYear);

    // Default target class to same or next
    setTargetClassId(student.classId || (classes[0]?.id || ''));
    setActionReason(
      action === 'GRADUATE'
        ? 'Tamat PAUD dan siap melanjutkan ke jenjang Sekolah Dasar (SD)'
        : action === 'REPEAT'
        ? 'Mengulang untuk pematangan kesiapan belajar'
        : ''
    );

    setActiveModal({
      action,
      student,
      currentEnrollment: currentEnr,
    });
  };

  const handleExecuteLifecycleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal) return;

    const { action, student, currentEnrollment } = activeModal;
    setSubmitting(true);

    try {
      const selectedYearObj = allYears.find((y) => y.id === targetAcademicYearId);
      const selectedClassObj = classes.find((c) => c.id === targetClassId);

      if (action === 'PROMOTE') {
        if (!selectedYearObj) throw new Error('Pilih Tahun Ajaran berikutnya.');
        if (!selectedClassObj) throw new Error('Pilih Kelas tujuan kenaikan.');

        await enrollmentService.promoteStudent(
          currentEnrollment.id,
          {
            id: selectedYearObj.id,
            name: selectedYearObj.name,
            startDate: selectedYearObj.startDate,
          },
          {
            id: selectedClassObj.id,
            name: selectedClassObj.name,
            teacherIds: selectedClassObj.teacherId ? [selectedClassObj.teacherId] : [],
          },
          userProfile?.role || 'ADMIN',
          userProfile?.name || 'Admin'
        );
        showToast(`Kenaikan kelas untuk ${student.name} berhasil diproses.`);
      } else if (action === 'REPEAT') {
        if (!selectedYearObj) throw new Error('Pilih Tahun Ajaran berikutnya.');
        if (!selectedClassObj) throw new Error('Pilih Kelas untuk mengulang.');

        await enrollmentService.repeatStudent(
          currentEnrollment.id,
          {
            id: selectedYearObj.id,
            name: selectedYearObj.name,
            startDate: selectedYearObj.startDate,
          },
          {
            id: selectedClassObj.id,
            name: selectedClassObj.name,
            teacherIds: selectedClassObj.teacherId ? [selectedClassObj.teacherId] : [],
          },
          actionReason || 'Mengulang kesiapan belajar',
          userProfile?.role || 'ADMIN',
          userProfile?.name || 'Admin'
        );
        showToast(`Status mengulang untuk ${student.name} berhasil diproses.`);
      } else if (action === 'GRADUATE') {
        await enrollmentService.graduateStudent(
          currentEnrollment.id,
          actionReason || 'Tamat / Lulus PAUD',
          userProfile?.role || 'ADMIN',
          userProfile?.name || 'Admin'
        );
        showToast(`${student.name} berhasil ditandai Tamat / Lulus dan disimpan ke Arsip.`);
      } else if (action === 'TRANSFER') {
        if (!actionReason.trim()) throw new Error('Isi nama sekolah tujuan atau alasan pindah.');
        await enrollmentService.transferStudent(
          currentEnrollment.id,
          actionReason.trim(),
          userProfile?.role || 'ADMIN',
          userProfile?.name || 'Admin'
        );
        showToast(`${student.name} berhasil ditandai Pindah dan disimpan ke Arsip.`);
      }

      setActiveModal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses aksi siklus peserta didik.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nickname && s.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchClass = selectedClassId === 'ALL' || s.classId === selectedClassId;
      return matchSearch && matchClass;
    });
  }, [students, searchQuery, selectedClassId]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
              <GraduationCap className="w-4 h-4" />
              <span>Kelola Siklus Siswa</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Kenaikan, Mengulang, Tamat & Pindah
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Proses transisi akademik peserta didik. Dokumen master siswa dipertahankan secara utuh,
              sedangkan riwayat kelas dan status baru dicatat melalui riwayat Enrollment.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl">
            <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-800">Tahun Ajaran Aktif</p>
              <p className="text-sm font-black text-emerald-950">
                {activeYear ? activeYear.name : 'Belum Ada TA Aktif'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama peserta didik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-hidden bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-hidden bg-white"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Student List with Action Buttons */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Memuat data peserta didik...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <User className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Tidak Ada Data Siswa</h3>
          <p className="text-xs text-slate-500">Tidak ada siswa aktif yang sesuai dengan kriteria filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                  <th className="py-4 px-6">Peserta Didik</th>
                  <th className="py-4 px-4">Kelas Saat Ini</th>
                  <th className="py-4 px-4">Status Enrollment</th>
                  <th className="py-4 px-6 text-right">Aksi Siklus Siswa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.map((student) => {
                  const enr = enrollments[student.id];

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                            {student.avatar ? (
                              <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              student.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{student.name}</p>
                            <p className="text-xs text-slate-400">
                              ID: {student.id} {student.ageLabel ? `• ${student.ageLabel}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                          {student.className || 'Belum ada kelas'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {enr ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Terdaftar Aktif</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                              Belum Terdaftar
                            </span>
                            <button
                              onClick={() => handleQuickEnroll(student)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-lg border border-amber-300/80 transition-all cursor-pointer"
                              title="Daftarkan ke Tahun Ajaran Aktif"
                            >
                              <PlusCircle className="w-2.5 h-2.5" />
                              <span>Daftarkan</span>
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => openActionModal('PROMOTE', student)}
                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="Naik Kelas"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Naik Kelas</span>
                          </button>

                          <button
                            onClick={() => openActionModal('REPEAT', student)}
                            className="inline-flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="Mengulang Kelas"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
                            <span>Mengulang</span>
                          </button>

                          <button
                            onClick={() => openActionModal('GRADUATE', student)}
                            className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="Lulus / Tamat PAUD"
                          >
                            <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                            <span>Tamat</span>
                          </button>

                          <button
                            onClick={() => openActionModal('TRANSFER', student)}
                            className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="Pindah Sekolah"
                          >
                            <LogOut className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pindah</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Execution Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                {activeModal.action === 'PROMOTE' && <ArrowUpRight className="w-5 h-5 text-emerald-600" />}
                {activeModal.action === 'REPEAT' && <RotateCcw className="w-5 h-5 text-sky-600" />}
                {activeModal.action === 'GRADUATE' && <GraduationCap className="w-5 h-5 text-purple-600" />}
                {activeModal.action === 'TRANSFER' && <LogOut className="w-5 h-5 text-amber-600" />}
                <h3 className="text-lg">
                  {activeModal.action === 'PROMOTE' && 'Proses Kenaikan Kelas'}
                  {activeModal.action === 'REPEAT' && 'Proses Siswa Mengulang'}
                  {activeModal.action === 'GRADUATE' && 'Proses Siswa Tamat / Lulus'}
                  {activeModal.action === 'TRANSFER' && 'Proses Siswa Pindah'}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Student Identity */}
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-200/60">
              <div>
                <p className="text-xs text-slate-500 font-medium">Peserta Didik:</p>
                <p className="text-sm font-black text-slate-900">{activeModal.student.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Kelas Saat Ini:</p>
                <p className="text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {activeModal.student.className || '-'}
                </p>
              </div>
            </div>

            <form onSubmit={handleExecuteLifecycleAction} className="space-y-4">
              {(activeModal.action === 'PROMOTE' || activeModal.action === 'REPEAT') && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tahun Ajaran Tujuan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={targetAcademicYearId}
                      onChange={(e) => setTargetAcademicYearId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold outline-hidden bg-white"
                      required
                    >
                      <option value="">Pilih Tahun Ajaran...</option>
                      {allYears
                        .filter((y) => y.status !== 'CLOSED')
                        .map((y) => (
                          <option key={y.id} value={y.id}>
                            {y.name} ({y.status})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {activeModal.action === 'PROMOTE' ? 'Kelas Tujuan Kenaikan' : 'Kelas Mengulang'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold outline-hidden bg-white"
                      required
                    >
                      <option value="">Pilih Kelas...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeModal.action === 'TRANSFER'
                    ? 'Sekolah Tujuan / Alasan Kepindahan'
                    : 'Catatan / Alasan'}
                  {(activeModal.action === 'TRANSFER' || activeModal.action === 'REPEAT') && (
                    <span className="text-rose-500"> *</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    activeModal.action === 'TRANSFER'
                      ? 'Contoh: Pindah mengikuti domisili orang tua ke TK Harapan Bangsa'
                      : 'Keterangan tambahan...'
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-hidden"
                  required={activeModal.action === 'TRANSFER' || activeModal.action === 'REPEAT'}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {activeModal.action === 'PROMOTE' &&
                    'Enrollment lama akan berstatus PROMOTED, enrollment baru dibuat untuk tahun ajaran berikutnya. Identitas master siswa tetap utuh.'}
                  {activeModal.action === 'REPEAT' &&
                    'Siswa akan didaftarkan kembali dengan tipe REPEAT pada tahun ajaran berikutnya.'}
                  {activeModal.action === 'GRADUATE' &&
                    'Dokumen siswa TIDAK dihapus. Status berubah menjadi TAMAT dan tersimpan permanen di menu Arsip Siswa.'}
                  {activeModal.action === 'TRANSFER' &&
                    'Dokumen siswa TIDAK dihapus. Status berubah menjadi PINDAH dan tersimpan permanen di menu Arsip Siswa.'}
                </span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Memproses...' : 'Konfirmasi & Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
