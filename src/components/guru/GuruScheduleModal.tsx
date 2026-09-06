import React from 'react';
import {
  Clock,
  X,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';

interface ScheduleItem {
  id: string;
  time: string;
  activity: string;
  location: string;
  category: 'PEMBELAJARAN' | 'ISTIRAHAT' | 'EVALUASI' | 'PENJEMPUTAN';
  status: 'DONE' | 'NOW' | 'UPCOMING';
  notes: string;
}

const TODAY_SCHEDULES: ScheduleItem[] = [
  {
    id: 'sch-1',
    time: '07:30 - 08:00 WIB',
    activity: 'Penyambutan Anak & Morning Circle (Doa Pagi)',
    location: 'Halaman & Ruang Kelas Bintang',
    category: 'PEMBELAJARAN',
    status: 'DONE',
    notes: 'Seluruh 6 anak hadir tepat waktu. Ananda Fatih memimpin doa.',
  },
  {
    id: 'sch-2',
    time: '08:00 - 09:15 WIB',
    activity: 'Kegiatan Inti: Eksplorasi Alam & Tanaman Sekitar',
    location: 'Kebun Tanaman Obat Sekolah',
    category: 'PEMBELAJARAN',
    status: 'NOW',
    notes: 'Observasi fokus pada aspek Motorik Kasar & Literasi STEAM.',
  },
  {
    id: 'sch-3',
    time: '09:15 - 09:45 WIB',
    activity: 'Istirahat, Cuci Tangan & Makan Bersama (Gizi Seimbang)',
    location: 'Area Makan Anak',
    category: 'ISTIRAHAT',
    status: 'UPCOMING',
    notes: 'Edukasi kebersihan & kemandirian membereskan alat makan.',
  },
  {
    id: 'sch-4',
    time: '09:45 - 10:30 WIB',
    activity: 'Kegiatan Penutup: Refleksi Kegiatan & Dongeng Harapan',
    location: 'Ruang Kelas Bintang',
    category: 'PEMBELAJARAN',
    status: 'UPCOMING',
    notes: 'Penguatan aspek Jati Diri dan apresiasi hasil karya anak.',
  },
  {
    id: 'sch-5',
    time: '10:30 - 11:00 WIB',
    activity: 'Penjemputan Anak & Koordinasi Singkat Orang Tua',
    location: 'Gerbang Utama TK Pembina',
    category: 'PENJEMPUTAN',
    status: 'UPCOMING',
    notes: 'Menyerahkan catatan harian kepada wali murid yang menjemput.',
  },
  {
    id: 'sch-6',
    time: '11:00 - 12:30 WIB',
    activity: 'Input Dokumentasi Observasi & Verifikasi AI Rapor',
    location: 'Ruang Guru PAUD',
    category: 'EVALUASI',
    status: 'UPCOMING',
    notes: 'Memverifikasi hasil draft narasi rapor dari AI GrowUPAUD.',
  },
];

interface GuruScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuruScheduleModal: React.FC<GuruScheduleModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">
              Jadwal Mengajar & Aktivitas Guru Hari Ini
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule Timeline Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="space-y-3">
            {TODAY_SCHEDULES.map((sch) => (
              <div
                key={sch.id}
                className={`p-4 rounded-2xl border transition-all space-y-2 ${
                  sch.status === 'NOW'
                    ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500/20'
                    : sch.status === 'DONE'
                    ? 'bg-slate-50/80 border-slate-200 opacity-80'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">
                    {sch.time}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      sch.status === 'NOW'
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : sch.status === 'DONE'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {sch.status === 'NOW'
                      ? 'Sedang Berlangsung'
                      : sch.status === 'DONE'
                      ? '✓ Selesai'
                      : 'Terjadwal'}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900">
                  {sch.activity}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  📍 {sch.location}
                </p>
                <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80 text-xs text-slate-700">
                  <strong>Catatan Guru:</strong> {sch.notes}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Jadwal Sekolah • Kurikulum Merdeka PAUD
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
