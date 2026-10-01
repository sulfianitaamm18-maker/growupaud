import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  GraduationCap,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  BookOpen,
  Award,
  Sparkles,
} from 'lucide-react';
import { enrollmentService } from '../../services/enrollmentService';
import { semesterReportService } from '../../services/semesterReportService';
import { annualReportService } from '../../services/annualReportService';
import {
  Enrollment,
  SemesterReport,
  AnnualReport,
  StudentProfile,
} from '../../types';
import { formatSemesterLabel } from '../../utils/semesterUtils';
import { useAuth } from '../../context/AuthContext';

interface StudentLifecycleHistoryModalProps {
  student: StudentProfile;
  onClose: () => void;
  onViewReportDetails?: (report: SemesterReport) => void;
}

export const StudentLifecycleHistoryModal: React.FC<StudentLifecycleHistoryModalProps> = ({
  student,
  onClose,
  onViewReportDetails,
}) => {
  const { userProfile } = useAuth();
  const isParent = userProfile?.role === 'PARENT' || userProfile?.role === 'ORANG_TUA';

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [semesterReports, setSemesterReports] = useState<SemesterReport[]>([]);
  const [annualReports, setAnnualReports] = useState<AnnualReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const [enrList, semList, annList] = await Promise.all([
          enrollmentService.getStudentEnrollmentHistory(student.id),
          semesterReportService.getReportsByStudent(student.id),
          annualReportService.getAnnualReportsByStudent(student.id),
        ]);

        setEnrollments(enrList);

        // For parents: only show reports that are FINAL
        const studentSemReports = semList.filter(
          (r) => !isParent || r.status === 'FINAL'
        );
        const studentAnnReports = annList.filter(
          (r) => !isParent || r.isFinal
        );

        setSemesterReports(studentSemReports);
        setAnnualReports(studentAnnReports);
      } catch (err) {
        console.error('Gagal mengambil riwayat siswa:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [student.id, student.schoolId, isParent]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 font-bold text-slate-900">
            <History className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg">Riwayat Perkembangan & Tahun Ajaran</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Badge */}
        <div className="bg-emerald-50/60 border border-emerald-200/60 p-5 rounded-3xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-200 text-emerald-900 font-black text-lg flex items-center justify-center shrink-0">
              {student.avatar ? (
                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                student.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 leading-tight">{student.name}</h4>
              <p className="text-xs text-slate-500">
                ID Siswa: {student.id} {student.className ? `• Kelas: ${student.className}` : ''}
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl ${
              student.status === 'GRADUATED'
                ? 'bg-purple-600 text-white'
                : student.status === 'TRANSFERRED'
                ? 'bg-amber-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {student.status || 'ACTIVE'}
          </span>
        </div>

        {/* Chronological Enrollment History */}
        <div className="space-y-4">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Riwayat Kelas & Tahun Ajaran (Enrollments)</span>
          </h4>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-semibold">
              Memuat data riwayat...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="p-5 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
              Belum ada riwayat pendaftaran tercatat (Data awal siswa).
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {enrollments.map((enr) => (
                <div key={enr.id} className="relative pl-8 flex items-start justify-between gap-3">
                  <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-600 shadow-xs"></div>
                  <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-extrabold text-slate-900 text-sm">
                        {enr.academicYearName || 'Tahun Ajaran'}
                      </p>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        {enr.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Kelas: <strong className="text-slate-800">{enr.className || '-'}</strong> • Jalur:{' '}
                      <span className="font-semibold text-emerald-700">{enr.entryType}</span>
                    </p>
                    {enr.startDate && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Periode: {enr.startDate} {enr.endDate ? `s/d ${enr.endDate}` : '(Sedang Berjalan)'}
                      </p>
                    )}
                    {enr.completionReason && (
                      <p className="text-xs text-slate-600 italic bg-white p-2 rounded-xl border border-slate-100 mt-2">
                        Keterangan: {enr.completionReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Laporan Semester Snapshot */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Dokumen Laporan Semester</span>
          </h4>

          {semesterReports.length === 0 ? (
            <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-2xl">
              {isParent
                ? 'Belum ada laporan semester yang telah difinalisasi oleh guru/sekolah.'
                : 'Belum ada dokumen rekap semester untuk siswa ini.'}
            </p>
          ) : (
            <div className="space-y-2">
              {semesterReports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Laporan {formatSemesterLabel(rep.semester)} - {rep.academicYearName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Status: <strong className={rep.status === 'FINAL' ? 'text-emerald-700' : 'text-amber-700'}>{rep.status}</strong> • Total Observasi: {rep.totalObservations}
                    </p>
                  </div>

                  {onViewReportDetails && (
                    <button
                      onClick={() => onViewReportDetails(rep)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Lihat Laporan
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Laporan Tahunan (Annual Report) */}
        {annualReports.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              <span>Rekapitulasi Laporan Tahunan</span>
            </h4>

            <div className="space-y-2">
              {annualReports.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-purple-50/50 border border-purple-200/60 p-3.5 rounded-2xl flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-purple-950">
                      Rekap Tahunan - TA {ann.academicYearName}
                    </p>
                    <p className="text-[11px] text-purple-800">
                      Keputusan Akhir: <strong>{ann.finalDecision}</strong> • {ann.isFinal ? 'Telah Difinalisasi' : 'Draft'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm cursor-pointer"
          >
            Tutup Riwayat
          </button>
        </div>
      </div>
    </div>
  );
};
