import React, { useState, useEffect, useMemo } from 'react';
import {
  Archive,
  Search,
  Filter,
  GraduationCap,
  LogOut,
  UserX,
  History,
  Calendar,
  Phone,
  User,
  ShieldCheck,
  ChevronRight,
  Clock,
  FileText,
  X,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import { enrollmentService } from '../../services/enrollmentService';
import { StudentProfile, Enrollment } from '../../types';

interface StudentArchiveViewProps {
  schoolId?: string;
}

type ArchiveFilterTab = 'ALL' | 'GRADUATED' | 'TRANSFERRED' | 'INACTIVE';

export const StudentArchiveView: React.FC<StudentArchiveViewProps> = ({
  schoolId = 'main-school',
}) => {
  const [archivedStudents, setArchivedStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ArchiveFilterTab>('ALL');

  // Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [studentHistory, setStudentHistory] = useState<Enrollment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const loadArchiveData = async () => {
    setLoading(true);
    try {
      const list = await studentService.getArchivedStudents(schoolId);
      setArchivedStudents(list);
    } catch (err) {
      console.error('Gagal mengambil arsip siswa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchiveData();
  }, [schoolId]);

  const viewStudentDetail = async (student: StudentProfile) => {
    setSelectedStudent(student);
    setLoadingHistory(true);
    try {
      const history = await enrollmentService.getStudentEnrollmentHistory(student.id);
      setStudentHistory(history);
    } catch (err) {
      console.error('Gagal mengambil riwayat enrollment arsip:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredList = useMemo(() => {
    return archivedStudents.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nickname && s.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.parentName && s.parentName.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchTab = true;
      if (activeTab === 'GRADUATED') matchTab = s.status === 'GRADUATED';
      else if (activeTab === 'TRANSFERRED') matchTab = s.status === 'TRANSFERRED';
      else if (activeTab === 'INACTIVE') matchTab = s.isActive === false && s.status !== 'GRADUATED' && s.status !== 'TRANSFERRED';

      return matchSearch && matchTab;
    });
  }, [archivedStudents, searchQuery, activeTab]);

  const counts = useMemo(() => {
    const graduated = archivedStudents.filter((s) => s.status === 'GRADUATED').length;
    const transferred = archivedStudents.filter((s) => s.status === 'TRANSFERRED').length;
    const inactive = archivedStudents.filter((s) => s.isActive === false && s.status !== 'GRADUATED' && s.status !== 'TRANSFERRED').length;
    return {
      all: archivedStudents.length,
      graduated,
      transferred,
      inactive,
    };
  }, [archivedStudents]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-purple-700 font-bold text-xs uppercase tracking-wider mb-1">
              <Archive className="w-4 h-4" />
              <span>Penyimpanan Arsip Permanen</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Arsip Siswa Tamat & Pindah
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Peserta didik yang telah menyelesaikan pendidikan (Tamat) atau berpindah sekolah
              diarsipkan secara permanen. Riwayat kelas, asesmen, dan dokumen laporan tetap dapat
              diakses kembali kapan saja.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-purple-50 border border-purple-200 text-purple-900 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-bold text-purple-700 block">Total Arsip</span>
              <span className="text-xl font-black">{counts.all} Siswa</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 pt-6 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Arsip ({counts.all})
          </button>
          <button
            onClick={() => setActiveTab('GRADUATED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'GRADUATED'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Siswa Tamat ({counts.graduated})</span>
          </button>
          <button
            onClick={() => setActiveTab('TRANSFERRED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'TRANSFERRED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Siswa Pindah ({counts.transferred})</span>
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari siswa dalam arsip (nama, orang tua, ID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-hidden bg-slate-50/50"
          />
        </div>
      </div>

      {/* Archive Cards or Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Memuat data arsip siswa...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Archive className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Belum Ada Siswa di Arsip</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Siswa yang ditandai Tamat atau Pindah melalui menu Kenaikan Siswa akan tersimpan di sini
            secara permanen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map((student) => {
            const isGraduated = student.status === 'GRADUATED';
            const isTransferred = student.status === 'TRANSFERRED';

            return (
              <div
                key={student.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                        isGraduated
                          ? 'bg-purple-100 text-purple-800'
                          : isTransferred
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isGraduated && <GraduationCap className="w-3 h-3" />}
                      {isTransferred && <LogOut className="w-3 h-3" />}
                      <span>{student.status || 'ARCHIVED'}</span>
                    </span>

                    {student.completionDate && (
                      <span className="text-[11px] font-semibold text-slate-400">
                        {student.completionDate}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
                      {student.avatar ? (
                        <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        student.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">{student.name}</h4>
                      <p className="text-xs text-slate-400">
                        ID: {student.id} {student.className ? `• Kelas Terakhir: ${student.className}` : ''}
                      </p>
                    </div>
                  </div>

                  {student.completionReason && (
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs text-slate-600 mb-4">
                      <p className="font-bold text-slate-800 mb-0.5">Keterangan / Tujuan:</p>
                      <p className="italic">{student.completionReason}</p>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                    {student.parentName && (
                      <p className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Orang Tua: <strong className="text-slate-700">{student.parentName}</strong></span>
                      </p>
                    )}
                    {student.parentContact && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Kontak: {student.parentContact}</span>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => viewStudentDetail(student)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-slate-600" />
                  <span>Lihat Riwayat Lengkap</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Student History Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Archive className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg">Detail Arsip Peserta Didik</h3>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="bg-purple-50/60 border border-purple-200/60 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-200 text-purple-900 font-black text-lg flex items-center justify-center shrink-0">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">{selectedStudent.name}</h4>
                  <p className="text-xs text-slate-500">
                    ID Master: {selectedStudent.id} • {selectedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl ${
                  selectedStudent.status === 'GRADUATED'
                    ? 'bg-purple-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {selectedStudent.status || 'ARCHIVED'}
              </span>
            </div>

            {/* Riwayat Tahun Ajaran (Timeline) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Tahun Ajaran & Kelas (Enrollments)</span>
              </div>

              {loadingHistory ? (
                <div className="p-8 text-center text-xs text-slate-400 font-semibold">
                  Memuat riwayat enrollment...
                </div>
              ) : studentHistory.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
                  Belum ada catatan riwayat enrollment untuk siswa ini (Data warisan/legacy).
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {studentHistory.map((hist, idx) => (
                    <div key={hist.id} className="relative pl-8 flex items-start justify-between gap-3">
                      <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-600 shadow-xs"></div>
                      <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-extrabold text-slate-900 text-sm">
                            {hist.academicYearName || 'Tahun Ajaran'}
                          </p>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                            {hist.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          Kelas: <strong className="text-slate-800">{hist.className || '-'}</strong> • Jalur:{' '}
                          <span className="font-semibold text-emerald-700">{hist.entryType}</span>
                        </p>
                        {hist.startDate && (
                          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Periode: {hist.startDate} {hist.endDate ? `s/d ${hist.endDate}` : '(Berjalan)'}
                          </p>
                        )}
                        {hist.completionReason && (
                          <p className="text-xs text-slate-600 italic bg-white p-2 rounded-xl border border-slate-100 mt-2">
                            Catatan: {hist.completionReason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm cursor-pointer"
              >
                Tutup Arsip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
