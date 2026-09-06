import React, { useState, useMemo } from 'react';
import {
  School,
  Users,
  Award,
  FileText,
  Download,
  Filter,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  StudentProfile,
  ObservationRecord,
  DevelopmentalAspect,
} from '../../types';
import { calculateStudentAspectScores } from '../../utils/studentMetrics';
import { RadarChartCard } from '../common/RadarChartCard';
import { AspectScoreBars } from '../common/AspectScoreBars';
import { schoolStore } from '../../services/schoolStore';
import { isObservationToday } from '../../utils/dateUtils';

interface KepalaSekolahDashboardProps {
  students: StudentProfile[];
  observations: ObservationRecord[];
  onOpenReportPreview: (student: StudentProfile) => void;
}

export const KepalaSekolahDashboard: React.FC<KepalaSekolahDashboardProps> = ({
  students = [],
  observations = [],
  onOpenReportPreview,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('SEMUA');

  // Real School Profile from schoolStore
  const schoolProfile = useMemo(() => schoolStore.getSchoolProfile(), []);

  // Class List dynamically extracted from students & schoolStore
  const availableClasses = useMemo(() => {
    const setOfClasses = new Set<string>();
    schoolStore.getClasses().forEach((c) => {
      if (c.name) setOfClasses.add(c.name);
    });
    students.forEach((s) => {
      const clsName = s.className || s.classGroup;
      if (clsName) setOfClasses.add(clsName);
    });
    return Array.from(setOfClasses);
  }, [students]);

  // Filtered Students based on selected class
  const activeStudents = useMemo(() => {
    if (selectedClass === 'SEMUA') return students;
    return students.filter(
      (s) => (s.className || s.classGroup) === selectedClass
    );
  }, [students, selectedClass]);

  const activeStudentIds = useMemo(
    () => new Set(activeStudents.map((s) => s.id)),
    [activeStudents]
  );

  // Filtered Observations based on selected class
  const activeObservations = useMemo(() => {
    if (selectedClass === 'SEMUA') return observations;
    return observations.filter((o) => activeStudentIds.has(o.studentId));
  }, [observations, activeStudentIds, selectedClass]);

  // 1. Metrics Calculations (Real Data Only)
  const totalStudents = activeStudents.length;
  const totalClasses = availableClasses.length;

  const realTeachers = useMemo(() => schoolStore.getTeachers(), []);
  const totalTeachers = realTeachers.length;

  const todayObservations = useMemo(
    () => activeObservations.filter(isObservationToday),
    [activeObservations]
  );
  const activeObservationsToday = todayObservations.length;
  const totalObservationsCount = activeObservations.length;

  // Real Completed Reports
  const completedReportsCount = useMemo(() => {
    return activeStudents.filter((s) => {
      if (s.reportStatus === 'SELESAI') return true;
      return activeObservations.some(
        (o) => o.studentId === s.id && (o.status === 'REPORT_READY' || o.status === 'VERIFIED')
      );
    }).length;
  }, [activeStudents, activeObservations]);

  const reportPercentage =
    totalStudents > 0
      ? Math.round((completedReportsCount / totalStudents) * 100)
      : 0;

  // 2. Aspect Average Scores (Calculated dynamically from real observations using Single Source of Truth)
  const aspectScores = useMemo(() => {
    return calculateStudentAspectScores(activeObservations);
  }, [activeObservations]);

  // 3. Rated Indicators and BSH+BSB Percentage
  const { totalRatedIndicators, bshBsbPercentage } = useMemo(() => {
    let ratedCount = 0;
    let bshBsbCount = 0;

    activeObservations.forEach((obs) => {
      (obs.indicators || []).forEach((ind) => {
        if (!ind.rating || ind.rating === 'BELUM_DINILAI') return;
        ratedCount += 1;
        if (ind.rating === 'BSH' || ind.rating === 'BSB') {
          bshBsbCount += 1;
        }
      });
    });

    const pct = ratedCount > 0 ? Math.round((bshBsbCount / ratedCount) * 100) : 0;
    return { totalRatedIndicators: ratedCount, bshBsbPercentage: pct };
  }, [activeObservations]);

  // 4. Real Teacher Statistics
  const teacherStats = useMemo(() => {
    const classes = schoolStore.getClasses();

    return realTeachers.map((tch) => {
      const teacherClass = classes.find(
        (c) => c.teacherId === tch.id || c.name === tch.className
      );
      const targetClassName = teacherClass ? teacherClass.name : tch.className;

      const classStudents = students.filter(
        (s) => s.className === targetClassName || s.classGroup === targetClassName
      );
      const classStudentIds = new Set(classStudents.map((s) => s.id));

      const obsCount = observations.filter((o) => {
        if (o.teacherId) {
          return o.teacherId === tch.id;
        }
        return classStudentIds.has(o.studentId);
      }).length;

      const reportsCount = classStudents.filter(
        (s) =>
          s.reportStatus === 'SELESAI' ||
          observations.some(
            (o) => o.studentId === s.id && (o.status === 'REPORT_READY' || o.status === 'VERIFIED')
          )
      ).length;

      return {
        ...tch,
        classNameFormatted: targetClassName || 'Tanpa Kelas',
        totalObs: obsCount,
        reportsCompleted: reportsCount,
      };
    }).sort((a, b) => b.totalObs - a.totalObs);
  }, [realTeachers, students, observations]);

  const activeTeachersWithObsCount = useMemo(() => {
    return teacherStats.filter((t) => t.totalObs > 0).length;
  }, [teacherStats]);

  // Helper for Student Teacher Name
  const getTeacherForStudentClass = (className?: string) => {
    if (!className) return 'Guru Kelas';
    const found = realTeachers.find(
      (t) => t.className === className || className.includes(t.className)
    );
    return found ? found.name : 'Guru Kelas';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Sleek Hero Header for Principal */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-32 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              <School className="w-3.5 h-3.5" />
              <span>Monitoring Kepala Sekolah — Data Real-Time</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Dashboard {schoolProfile.schoolName || 'Sekolah'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Kepala Sekolah:{' '}
              <strong className="text-amber-400">
                {schoolProfile.principalName || 'Belum diisi'}
              </strong>{' '}
              | Memantau seluruh aktivitas asesmen, perkembangan aspek {totalStudents} anak, dan kinerja {totalTeachers} guru secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Kelas */}
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/20">
              <Filter className="w-4 h-4 text-amber-300 ml-1.5" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-transparent text-white font-bold text-xs border-none focus:outline-none focus:ring-0 cursor-pointer pr-3"
              >
                <option value="SEMUA" className="bg-slate-900 text-white">
                  Semua Kelas ({students.length} Anak)
                </option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls} className="bg-slate-900 text-white">
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() =>
                alert('Mengunduh Rekap Laporan Perkembangan Sekolah PDF...')
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Rekap PDF</span>
            </button>
            <button
              onClick={() =>
                alert('Mengunduh Data Statistik Asesmen format Excel (XLSX)...')
              }
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all"
            >
              <FileText className="w-4 h-4 text-amber-300" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State Alert if No Observations */}
      {totalObservationsCount === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Belum ada observasi sekolah.</p>
            <p className="text-amber-700 mt-0.5">
              Catatan observasi harian yang dibuat guru akan otomatis teragregasi secara real-time di dashboard ini.
            </p>
          </div>
        </div>
      )}

      {/* School Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Anak Didik
            </p>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-800">
            {totalStudents} Anak
          </h3>
          <p className="text-indigo-600 text-xs font-semibold mt-2">
            {totalClasses > 0 ? `Tersebar di ${totalClasses} kelas PAUD` : 'Belum ada data kelas'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Guru Aktif
            </p>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="w-5 h-5" />
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-800">
            {totalTeachers} Guru
          </h3>
          <p className="text-emerald-600 text-xs font-semibold mt-2">
            {activeTeachersWithObsCount > 0
              ? `${activeTeachersWithObsCount} guru telah mencatat observasi`
              : '0 guru mencatat observasi'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Observasi Hari Ini
            </p>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-800">
            {activeObservationsToday} Observasi
          </h3>
          <p className="text-purple-600 text-xs font-semibold mt-2">
            Dari total {totalObservationsCount} observasi tersimpan
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Laporan Selesai
            </p>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <FileText className="w-5 h-5" />
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-800">
            {completedReportsCount > 0 ? `${completedReportsCount} Rapor` : 'Belum ada laporan'}
          </h3>
          <p className="text-amber-600 text-xs font-semibold mt-2">
            {totalStudents > 0
              ? `${reportPercentage}% dari total target ${totalStudents} anak`
              : 'Belum ada target'}
          </p>
        </div>
      </div>

      {/* School-Wide Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RadarChartCard
          aspectScores={aspectScores}
          title="Grafik Perkembangan Sekolah"
          subtitle={`Rata-rata capaian 6 aspek Kurikulum Merdeka (${totalStudents} anak, ${totalObservationsCount} observasi)`}
          height={280}
        />
        <AspectScoreBars
          aspectScores={aspectScores}
          title="Persentase Ketercapaian Sekolah"
          subtitle={`Capaian BSH & BSB: ${bshBsbPercentage}% dari ${totalRatedIndicators} indikator dinilai`}
        />
      </div>

      {/* 2-Column Section: Guru Paling Aktif & Daftar Laporan Anak */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Guru Paling Aktif */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Aktivitas Asesmen Guru
              </h3>
              <p className="text-xs text-slate-500">
                Monitoring produktivitas pencatatan harian guru
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
              Data Nyata
            </span>
          </div>

          <div className="space-y-3">
            {teacherStats.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                Belum ada data guru.
              </div>
            ) : (
              teacherStats.map((t, index) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{t.name}</h4>
                      <p className="text-[11px] text-slate-500">{t.classNameFormatted}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-emerald-600 block">
                      {t.totalObs} Observasi
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {t.reportsCompleted > 0 ? `${t.reportsCompleted} Rapor Selesai` : 'Belum Ada Rapor'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Daftar Anak & Status Rapor Sekolah */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Status Rapor Perkembangan Peserta Didik
              </h3>
              <p className="text-xs text-slate-500">
                Pantau proses verifikasi rapor tiap anak di kelas
              </p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
              {completedReportsCount > 0
                ? `${completedReportsCount} Selesai • ${totalStudents - completedReportsCount} Dalam Proses`
                : 'Belum Ada Laporan Selesai'}
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {activeStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                Belum ada data siswa.
              </div>
            ) : (
              activeStudents.map((std) => {
                const isReportCompleted =
                  std.reportStatus === 'SELESAI' ||
                  activeObservations.some(
                    (o) => o.studentId === std.id && (o.status === 'REPORT_READY' || o.status === 'VERIFIED')
                  );

                const teacherName = getTeacherForStudentClass(std.className || std.classGroup);

                return (
                  <div
                    key={std.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={std.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(std.name || 'anak')}`}
                        alt={std.name || 'Anak'}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(std.name || 'anak')}`;
                        }}
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          {std.name} ({std.nickname})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {std.className || std.classGroup || 'Kelas'} • Wali Kelas: {teacherName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isReportCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isReportCompleted ? 'Rapor Selesai' : 'Verifikasi'}
                      </span>

                      <button
                        onClick={() => onOpenReportPreview(std)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                      >
                        Lihat Rapor
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
