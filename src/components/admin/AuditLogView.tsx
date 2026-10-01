import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  CheckCircle2,
  Calendar,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { auditLogService } from '../../services/auditLogService';
import { AuditActionType, AuditLog } from '../../types';

interface AuditLogViewProps {
  schoolId?: string;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ schoolId = 'main-school' }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditLogService.getAuditLogs(schoolId, 100);
      setLogs(data);
    } catch (err) {
      console.error('Gagal mengambil audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [schoolId]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction = selectedAction === 'ALL' || log.action === selectedAction;
      const matchSearch =
        (log.actorName && log.actorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.targetName && log.targetName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase());
      return matchAction && matchSearch;
    });
  }, [logs, selectedAction, searchQuery]);

  const getActionBadgeColor = (action: AuditActionType) => {
    switch (action) {
      case 'RECORD_OBSERVATION':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'UPDATE_OBSERVATION':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE_OBSERVATION':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PROMOTE_STUDENT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REPEAT_STUDENT':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'GRADUATE_STUDENT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TRANSFER_STUDENT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ACTIVATE_ACADEMIC_YEAR':
      case 'CREATE_ACADEMIC_YEAR':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'CLOSE_ACADEMIC_YEAR':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      case 'FINALIZE_SEMESTER_REPORT':
      case 'FINALIZE_ANNUAL_REPORT':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-slate-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Audit Trail & Keamanan Sistem</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Log Aktivitas Siklus Akademik
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Catatan jejak perubahan penting: tahun ajaran, kenaikan kelas, kelulusan, dan finalisasi
            laporan secara transparan dan terverifikasi.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari aktivitas, nama pengguna, atau target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-hidden bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-hidden bg-white"
          >
            <option value="ALL">Semua Aksi</option>
            <option value="RECORD_OBSERVATION">Pencatatan Observasi</option>
            <option value="ENROLL_STUDENT">Pendaftaran (Enrollment)</option>
            <option value="PROMOTE_STUDENT">Kenaikan Kelas</option>
            <option value="REPEAT_STUDENT">Siswa Mengulang</option>
            <option value="GRADUATE_STUDENT">Siswa Tamat</option>
            <option value="TRANSFER_STUDENT">Siswa Pindah</option>
            <option value="ACTIVATE_ACADEMIC_YEAR">Aktivasi Tahun Ajaran</option>
            <option value="CLOSE_ACADEMIC_YEAR">Penutupan Tahun Ajaran</option>
            <option value="FINALIZE_SEMESTER_REPORT">Finalisasi Laporan Semester</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Memuat catatan aktivitas...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Belum Ada Catatan Log</h3>
          <p className="text-xs text-slate-500">
            Aktivitas seperti pembuatan tahun ajaran, kenaikan kelas, dan finalisasi akan tercatat di
            sini.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                  <th className="py-4 px-6">Waktu & Tanggal</th>
                  <th className="py-4 px-4">Pengguna (Aktor)</th>
                  <th className="py-4 px-4">Aksi Dilakukan</th>
                  <th className="py-4 px-6">Target & Detail Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLogs.map((log) => {
                  const dateFormatted = new Date(log.timestamp).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 text-xs text-slate-600 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dateFormatted}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                            {log.actorName ? log.actorName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs leading-tight">
                              {log.actorName || 'User'}
                            </p>
                            <span className="text-[10px] uppercase font-semibold text-slate-400">
                              {log.actorRole}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-xs">
                        <p className="font-bold text-slate-900">{log.targetName || log.targetId}</p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-1 font-mono bg-slate-50 p-1.5 rounded-lg border border-slate-100 inline-block">
                            {JSON.stringify(log.metadata).replace(/[{}"]/g, ' ')}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
