import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  BookOpen,
  School,
  AlertTriangle,
  HeartHandshake,
  Sun,
  Filter,
  CheckCircle2,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD or display text
  dayNumber: number;
  monthText: string;
  category: 'PEMBELAJARAN' | 'SEKOLAH' | 'RAPOR' | 'PARENTING' | 'LIBUR';
  time: string;
  description: string;
}

const ACADEMIC_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-01',
    title: 'Tema Baru: Eksplorasi Alam & Tanaman Sekitar',
    date: '3 Agustus 2026',
    dayNumber: 3,
    monthText: 'Agustus',
    category: 'PEMBELAJARAN',
    time: '07:30 - 10:30 WIB',
    description: 'Anak mengamati daun, bunga, dan merawat tanaman di kebun sekolah.',
  },
  {
    id: 'evt-02',
    title: 'Kunjungan Edukatif Pemadam Kebakaran',
    date: '8 Agustus 2026',
    dayNumber: 8,
    monthText: 'Agustus',
    category: 'SEKOLAH',
    time: '08:30 - 11:00 WIB',
    description: 'Pengenalan profesi pemadam kebakaran dan simulasi keamanan sederhana untuk anak.',
  },
  {
    id: 'evt-03',
    title: 'Seminar Pertumbuhan & Stimulasi Anak Bersama Ayah Bunda',
    date: '14 Agustus 2026',
    dayNumber: 14,
    monthText: 'Agustus',
    category: 'PARENTING',
    time: '09:00 - 11:30 WIB',
    description: 'Kolaborasi sekolah dan keluarga dalam mendukung kemandirian anak usia dini.',
  },
  {
    id: 'evt-04',
    title: 'Hari Kemerdekaan Republik Indonesia Ke-81',
    date: '17 Agustus 2026',
    dayNumber: 17,
    monthText: 'Agustus',
    category: 'LIBUR',
    time: 'Sepanjang Hari',
    description: 'Hari Libur Nasional & Peringatan Hari Kemerdekaan Republik Indonesia.',
  },
  {
    id: 'evt-05',
    title: 'Batas Akhir Penyelesaian Observasi & Verifikasi Rapor Semester I',
    date: '28 Agustus 2026',
    dayNumber: 28,
    monthText: 'Agustus',
    category: 'RAPOR',
    time: '14:00 WIB',
    description: 'Seluruh wali kelas wajib melengkapi catatan observasi minimal 3 aspek/anak.',
  },
];

export const GuruCalendarWidget: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('SEMUA');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(ACADEMIC_EVENTS[0]);

  const filteredEvents =
    selectedCategory === 'SEMUA'
      ? ACADEMIC_EVENTS
      : ACADEMIC_EVENTS.filter((e) => e.category === selectedCategory);

  const getCategoryBadge = (category: CalendarEvent['category']) => {
    switch (category) {
      case 'PEMBELAJARAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <BookOpen className="w-3 h-3" />
            Pembelajaran
          </span>
        );
      case 'SEKOLAH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
            <School className="w-3 h-3" />
            Kegiatan Sekolah
          </span>
        );
      case 'RAPOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3" />
            Batas Rapor
          </span>
        );
      case 'PARENTING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
            <HeartHandshake className="w-3 h-3" />
            Parenting
          </span>
        );
      case 'LIBUR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            <Sun className="w-3 h-3" />
            Hari Libur
          </span>
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
      {/* Header Kalender */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-600" />
            <span>Kalender Akademik & Agenda PAUD — Agustus 2026</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau jadwal pembelajaran, kegiatan sekolah, batas rapor, parenting, dan hari libur
          </p>
        </div>

        {/* Filter Badge Categories */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'SEMUA', label: 'Semua Agenda' },
            { key: 'PEMBELAJARAN', label: 'Pembelajaran' },
            { key: 'SEKOLAH', label: 'Sekolah' },
            { key: 'RAPOR', label: 'Batas Rapor' },
            { key: 'PARENTING', label: 'Parenting' },
            { key: 'LIBUR', label: 'Libur' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setSelectedCategory(item.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                selectedCategory === item.key
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Agenda List & Selected Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Agenda Cards (Col-span-7) */}
        <div className="lg:col-span-7 space-y-2.5">
          {filteredEvents.map((event) => {
            const isSelected = selectedEvent?.id === event.id;
            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Calendar Date Square */}
                  <div className="w-12 h-14 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                    <span className="text-xs font-semibold text-emerald-400 uppercase">
                      {event.monthText.slice(0, 3)}
                    </span>
                    <span className="text-lg font-extrabold">{event.dayNumber}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(event.category)}
                      <span className="text-[11px] text-slate-500 font-medium">
                        • {event.time}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                      {event.title}
                    </h3>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold ${
                    isSelected ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {isSelected ? 'Terpilih' : 'Lihat →'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Selected Event Detail Box (Col-span-5) */}
        <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
          {selectedEvent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getCategoryBadge(selectedEvent.category)}
                <span className="text-xs font-semibold text-slate-500">
                  {selectedEvent.date}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedEvent.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Waktu: {selectedEvent.time}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                <strong>Rincian Kegiatan:</strong> {selectedEvent.description}
              </div>

              <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Jadwal resmi sekolah • Terintegrasi Kurikulum Merdeka
                </span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Pilih salah satu agenda di sebelah kiri untuk melihat rincian kegiatan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
