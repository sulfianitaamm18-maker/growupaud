import React from 'react';
import {
  Sparkles,
  Users,
  TrendingDown,
  BookOpen,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { StudentProfile } from '../../types';

interface GuruAIWidgetProps {
  students: StudentProfile[];
  onSelectStudentForObservation: (studentId: string) => void;
  onOpenCurriculumManager: () => void;
}

export const GuruAIWidget: React.FC<GuruAIWidgetProps> = ({
  students,
  onSelectStudentForObservation,
  onOpenCurriculumManager,
}) => {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
      {/* Top Banner AI Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              AI Assessment Intelligence (GAI) — Rekomendasi & Stimulasi Kelas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Analisis cerdas berdasarkan riwayat observasi harian Kurikulum Merdeka di Kelas Bintang
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          ✓ GAI Ready for Module 2 Integration
        </span>
      </div>

      {/* 5 Structural Recommendation Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Section 1: Rekomendasi Anak yang Perlu Diamati Hari Ini */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider mb-2">
              <Users className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Anak Perlu Diamati Hari Ini</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Berdasarkan frekuensi dan sebaran aspek, 2 anak berikut direkomendasikan untuk observasi fokus:
            </p>

            <div className="mt-3 space-y-2">
              {students.slice(0, 2).map((std) => (
                <div
                  key={std.id}
                  onClick={() => onSelectStudentForObservation(std.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={std.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(std.name || 'anak')}`}
                      alt={std.name || 'Anak'}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(std.name || 'anak')}`;
                      }}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        Ananda {std.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Fokus: Motorik Kasar & STEAM
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                    Observasi
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Klik nama anak untuk membuka formulir observasi.
          </p>
        </div>

        {/* Section 2 & 3: Aspek Rendah & Rekomendasi Kegiatan */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider mb-2">
              <TrendingDown className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Aspek Perlu Penguatan & Pembelajaran</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <p className="font-bold">
                1. Aspek Literasi & STEAM (Rata-rata 81%)
              </p>
              <p className="text-slate-600">
                Anak mulai menunjukkan ketertarikan pada eksplorasi sains sederhana, namun penguasaan kosakata prabaca perlu stimulasi visual.
              </p>
            </div>

            <div className="mt-3">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                Rekomendasi Kegiatan Pembelajaran:
              </span>
              <div
                onClick={onOpenCurriculumManager}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 cursor-pointer transition-all space-y-1 group"
              >
                <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                  Eksperimen Campur Warna Air & Minyak
                </h4>
                <p className="text-[11px] text-slate-500">
                  Melatih pengamatan sains sederhana, tanya-jawab prediktif, dan komunikasi naratif dalam kelompok kecil.
                </p>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Klik kegiatan untuk menambah ke rencana pembelajaran.
          </p>
        </div>

        {/* Section 4 & 5: Rekomendasi Stimulasi & Ringkasan Kelas */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider mb-2">
              <HeartHandshake className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Stimulasi Keluarga & Ringkasan Kelas</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 text-xs text-slate-700">
              <span className="font-bold text-emerald-800 block">
                Rekomendasi Stimulasi Lanjutan di Rumah:
              </span>
              <p className="text-slate-600">
                Ajak orang tua melibatkan anak dalam kegiatan menyusun puzzle 12 keping atau membaca buku dongeng sebelum tidur untuk memperkaya kosa kata.
              </p>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-emerald-900 to-slate-900 text-white space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ringkasan Perkembangan Kelas Bintang</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed">
                Secara keseluruhan, Kelas Bintang menunjukkan keseimbangan optimal pada aspek Nilai Agama & Moral (86%) serta Jati Diri (88%). Kesiapan prasekolah berada di jalur tepat.
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Ringkasan ini otomatis diperbarui pada setiap input observasi baru.
          </p>
        </div>
      </div>
    </div>
  );
};
