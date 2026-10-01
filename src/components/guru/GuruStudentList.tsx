import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  PlusCircle,
  FolderHeart,
  BarChart2,
  FileText,
  LayoutGrid,
  Table as TableIcon,
  History,
  MessageSquare,
} from 'lucide-react';
import { StudentProfile, ObservationRecord } from '../../types';
import { isObservationToday } from '../../utils/dateUtils';
import { formatStudentAge } from '../../utils/ageUtils';
import { StudentLifecycleHistoryModal } from '../student/StudentLifecycleHistoryModal';

interface GuruStudentListProps {
  students: StudentProfile[];
  observations: ObservationRecord[];
  onOpenNewObservation: (studentId?: string) => void;
  onOpenPortfolio: (student: StudentProfile) => void;
  onOpenGraph: (student: StudentProfile) => void;
  onOpenReportPreview: (student: StudentProfile) => void;
  onMessageParent?: (student: StudentProfile) => void;
}

export const GuruStudentList: React.FC<GuruStudentListProps> = ({
  students,
  observations,
  onOpenNewObservation,
  onOpenPortfolio,
  onOpenGraph,
  onOpenReportPreview,
  onMessageParent,
}) => {
  const [viewMode, setViewMode] = useState<'CARD' | 'TABLE'>('CARD');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterGroup, setFilterGroup] = useState<string>('SEMUA');
  const [filterAge, setFilterAge] = useState<string>('SEMUA');
  const [filterObsStatus, setFilterObsStatus] = useState<string>('SEMUA');
  const [filterSemester, setFilterSemester] = useState<string>('SEMESTER_1');
  const [historyStudent, setHistoryStudent] = useState<StudentProfile | null>(null);

  const isObservedToday = (studentId: string) => {
    return observations.some((o) => o.studentId === studentId && isObservationToday(o));
  };

  const handleReportClick = (student: StudentProfile) => {
    const studentObs = observations.filter((o) => o.studentId === student.id);
    console.log(
      `[REPORT BUTTON DEBUG]\nselectedStudent: true\nstudentId: ${student.id}\nstudentName: ${student.name}\nschoolId: ${student.schoolId || 'main-school'}\nclassId: ${student.classId || '-'}`
    );
    console.log(
      `[REPORT OBSERVATION DEBUG]\nstudentId = ${student.id}\nschoolId = ${student.schoolId || 'main-school'}\nclassId = ${student.classId || '-'}\nobservationCount = ${studentObs.length}\nREPORT_BUTTON = SHOULD_RENDER`
    );
    onOpenReportPreview(student);
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const studentAgeText = formatStudentAge(student);
      // Search by Name, Group, or Age
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        query === '' ||
        student.name.toLowerCase().includes(query) ||
        student.className.toLowerCase().includes(query) ||
        studentAgeText.toLowerCase().includes(query) ||
        (student.age || '').toLowerCase().includes(query);

      // Filter by Group
      const matchGroup =
        filterGroup === 'SEMUA' ||
        student.className.toLowerCase().includes(filterGroup.toLowerCase());

      // Filter by Age
      const matchAge =
        filterAge === 'SEMUA' ||
        (filterAge === '4-5' && (studentAgeText.startsWith('4') || (student.age || '').startsWith('4') || student.ageYears === 4)) ||
        (filterAge === '5-6' && (studentAgeText.startsWith('5') || (student.age || '').startsWith('5') || student.ageYears === 5));

      // Filter by Observation Status
      const matchObs =
        filterObsStatus === 'SEMUA' ||
        (filterObsStatus === 'SUDAH' && isObservedToday(student.id)) ||
        (filterObsStatus === 'BELUM' && !isObservedToday(student.id));

      return matchSearch && matchGroup && matchAge && matchObs;
    });
  }, [students, observations, searchQuery, filterGroup, filterAge, filterObsStatus]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
      {/* Top Title & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Daftar Anak Didik & Asesmen PAUD ({filteredStudents.length} Anak)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola observasi, portofolio autentik, grafik capaian, dan rapor anak didik
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Card vs Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('CARD')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'CARD'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Search & Dropdown Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama anak, kelompok, atau usia..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filter Kelompok */}
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500"
        >
          <option value="SEMUA">Semua Kelompok</option>
          <option value="Kelompok B">Kelompok B (Bintang)</option>
          <option value="Kelompok A">Kelompok A</option>
        </select>

        {/* Filter Usia */}
        <select
          value={filterAge}
          onChange={(e) => setFilterAge(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500"
        >
          <option value="SEMUA">Semua Usia</option>
          <option value="4-5">Usia 4 - 5 Tahun</option>
          <option value="5-6">Usia 5 - 6 Tahun</option>
        </select>

        {/* Filter Status Observasi */}
        <select
          value={filterObsStatus}
          onChange={(e) => setFilterObsStatus(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500"
        >
          <option value="SEMUA">Semua Status Observasi</option>
          <option value="SUDAH">✓ Sudah Diobservasi</option>
          <option value="BELUM">⏳ Belum Diobservasi</option>
        </select>
      </div>

      {/* Render Student Cards or Table */}
      {filteredStudents.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs font-medium">
          Tidak ada anak didik yang sesuai dengan filter pencarian Anda.
        </div>
      ) : viewMode === 'CARD' ? (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => {
            const observed = isObservedToday(student.id);
            return (
              <div
                key={student.id}
                className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                {/* Student Identity Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`}
                      alt={student.name || 'Anak'}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/20 border border-white shrink-0 shadow-2xs"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`;
                      }}
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Ananda {student.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Usia: {formatStudentAge(student)} • {student.className}
                      </p>
                    </div>
                  </div>

                  {/* Status Observasi Hari Ini Badge */}
                  {observed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Sudah
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      <Clock className="w-3 h-3" />
                      Belum
                    </span>
                  )}
                </div>

                {/* Capaian Perkembangan Score Bar */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Capaian Perkembangan</span>
                    <span className="text-emerald-700 font-extrabold">
                      {student.overallScore !== null ? `${student.overallScore}%` : 'Belum Ada Data'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${student.overallScore ?? 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* 6 Action Buttons: Observasi, Portofolio, Grafik, Laporan, Riwayat, Pesan Ortu */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/60">
                  <button
                    onClick={() => onOpenNewObservation(student.id)}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-2xs"
                    title="Buat Observasi Kegiatan"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Observasi</span>
                  </button>

                  <button
                    onClick={() => onOpenPortfolio(student)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-emerald-700 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    title="Lihat Portofolio & Bukti Autentik"
                  >
                    <FolderHeart className="w-3.5 h-3.5 text-sky-600" />
                    <span>Portofolio</span>
                  </button>

                  <button
                    onClick={() => onOpenGraph(student)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-emerald-700 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    title="Lihat Grafik Capaian 6 Aspek"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Grafik</span>
                  </button>

                  <button
                    onClick={() => handleReportClick(student)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-emerald-700 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    title="Pratinjau & Cetak Rapor"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Laporan</span>
                  </button>

                  <button
                    onClick={() => setHistoryStudent(student)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-emerald-700 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
                    title="Lihat Riwayat Tahun Ajaran"
                  >
                    <History className="w-3.5 h-3.5 text-purple-600" />
                    <span>Riwayat</span>
                  </button>

                  {onMessageParent && (
                    <button
                      onClick={() => onMessageParent(student)}
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
                      title="Kirim Pesan ke Orang Tua Murid"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pesan Ortu</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Nama Anak</th>
                <th className="py-3 px-4">Usia</th>
                <th className="py-3 px-4">Kelompok</th>
                <th className="py-3 px-4">Capaian Perkembangan</th>
                <th className="py-3 px-4">Status Observasi</th>
                <th className="py-3 px-4 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => {
                const observed = isObservedToday(student.id);
                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-3">
                      <img
                        src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`}
                        alt={student.name || 'Anak'}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name || 'anak')}`;
                        }}
                      />
                      <span>Ananda {student.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{formatStudentAge(student)}</td>
                    <td className="py-3 px-4 text-slate-600">{student.className}</td>
                    <td className="py-3 px-4">
                      {student.overallScore !== null ? (
                        <>
                          <span className="font-extrabold text-emerald-700">
                            {student.overallScore}%
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-semibold text-[11px]">Belum Ada Data</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {observed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ Sudah
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          ⏳ Belum
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenNewObservation(student.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all"
                        >
                          Observasi
                        </button>
                        <button
                          onClick={() => onOpenPortfolio(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                        >
                          Portofolio
                        </button>
                        <button
                          onClick={() => onOpenGraph(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                        >
                          Grafik
                        </button>
                        <button
                          onClick={() => handleReportClick(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                        >
                          Laporan
                        </button>
                        <button
                          onClick={() => setHistoryStudent(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-purple-700 font-bold transition-all"
                          title="Riwayat Tahun Ajaran"
                        >
                          Riwayat
                        </button>
                        {onMessageParent && (
                          <button
                            onClick={() => onMessageParent(student)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold transition-all flex items-center gap-1"
                            title="Kirim Pesan ke Orang Tua"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>Pesan</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Student Lifecycle History Modal */}
      {historyStudent && (
        <StudentLifecycleHistoryModal
          student={historyStudent}
          onClose={() => setHistoryStudent(null)}
        />
      )}
    </div>
  );
};
