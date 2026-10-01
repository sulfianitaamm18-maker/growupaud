import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  Camera,
  CheckCircle2,
  Heart,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  FileText,
  Lightbulb,
  Award,
  BookOpen,
  Share2,
  Mic,
  Image as ImageIcon,
} from 'lucide-react';
import { ObservationRecord, StudentProfile, DevelopmentalAspect } from '../../types';
import { ASPECT_LABELS } from '../../data/initialData';

interface ParentDailyReportCardProps {
  observations: ObservationRecord[];
  student: StudentProfile;
  onOpenReportPreview?: () => void;
}

export const ParentDailyReportCard: React.FC<ParentDailyReportCardProps> = ({
  observations = [],
  student,
  onOpenReportPreview,
}) => {
  // Available dates from observations
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    observations.forEach((o) => {
      const d = o.observationDateISO ? o.observationDateISO.slice(0, 10) : o.date;
      if (d) dates.add(d);
    });
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [observations]);

  // Default to the most recent observation date or today
  const todayISO = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return availableDates.length > 0 ? availableDates[0] : todayISO;
  });

  const [parentFeedback, setParentFeedback] = useState<string>('');
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Observations for the selected date
  const dayObservations = useMemo(() => {
    return observations.filter((o) => {
      const d = o.observationDateISO ? o.observationDateISO.slice(0, 10) : o.date;
      return d === selectedDate;
    });
  }, [observations, selectedDate]);

  // Format date display
  const formattedDate = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      if (isNaN(d.getTime())) return selectedDate;
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Collect all evidences for this day
  const dayEvidences = useMemo(() => {
    return dayObservations.flatMap((o) => o.evidences || []);
  }, [dayObservations]);

  // Collect all assessed indicators for this day
  const dayIndicators = useMemo(() => {
    return dayObservations.flatMap((o) => o.indicators || []);
  }, [dayObservations]);

  const handleSendFeedback = () => {
    if (!parentFeedback.trim()) return;
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setParentFeedback('');
    }, 4000);
  };

  // Helper for navigation
  const currentIndex = availableDates.indexOf(selectedDate);
  const hasPrevious = currentIndex < availableDates.length - 1;
  const hasNext = currentIndex > 0;

  const goToPrevDate = () => {
    if (hasPrevious) {
      setSelectedDate(availableDates[currentIndex + 1]);
    }
  };

  const goToNextDate = () => {
    if (hasNext) {
      setSelectedDate(availableDates[currentIndex - 1]);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-6" id="parent-daily-report-card">
      {/* Header with Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Laporan & Jurnal Perkembangan Harian
              </h3>
              <p className="text-xs text-slate-500">
                Catatan autentik aktivitas, capaian, dan karya ananda hari demi hari
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Day Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevDate}
            disabled={!hasPrevious}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Hari Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={goToNextDate}
            disabled={!hasNext}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            title="Hari Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {availableDates.length > 0 && availableDates[0] !== selectedDate && (
            <button
              onClick={() => setSelectedDate(availableDates[0])}
              className="px-2.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
            >
              Terbaru
            </button>
          )}
        </div>
      </div>

      {/* Date Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-100/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {new Date(selectedDate).getDate() || '•'}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{formattedDate}</h4>
            <p className="text-xs text-slate-600">
              Ananda <strong>{student.name}</strong> • {student.className || 'Kelompok Bermain'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 shadow-2xs">
            {dayObservations.length} Kegiatan Terlaksana
          </span>
          <span className="px-3 py-1 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs">
            {dayEvidences.length} Foto/Karya
          </span>
        </div>
      </div>

      {/* Content when NO observations for this day */}
      {dayObservations.length === 0 ? (
        <div className="py-12 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-700">
              Belum Ada Catatan Kegiatan pada {formattedDate}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Kegiatan sekolah pada hari ini sedang berlangsung atau belum diinput oleh guru. Ayah/Bunda dapat melihat catatan kegiatan pada hari-hari lain melalui pemilih tanggal di atas.
            </p>
          </div>
          {availableDates.length > 0 && (
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <span className="text-xs text-slate-400 self-center">Pilih hari dengan catatan:</span>
              {availableDates.slice(0, 4).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className="px-3 py-1 bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-700 text-xs font-semibold rounded-lg transition"
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Content when observations exist for this day */
        <div className="space-y-6">
          {/* Day Activities List */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Aktivitas Bermain & Belajar Hari Ini
            </h4>

            <div className="grid grid-cols-1 gap-4">
              {dayObservations.map((obs, idx) => (
                <div
                  key={obs.id || idx}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-200 transition space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h5 className="font-bold text-sm text-slate-900">{obs.activityTitle}</h5>
                    </div>
                    {obs.teacherName && (
                      <span className="text-xs text-slate-500">
                        Guru Pendamping: <strong className="text-slate-700">{obs.teacherName}</strong>
                      </span>
                    )}
                  </div>

                  {/* Teacher's note & voice transcription */}
                  {obs.teacherNote && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Catatan Guru untuk Orang Tua:
                      </p>
                      <p className="italic leading-relaxed">"{obs.teacherNote}"</p>
                    </div>
                  )}

                  {obs.voiceNoteText && (
                    <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
                      <Mic className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Catatan Suara Guru:</span>
                        <p className="text-slate-600 italic mt-0.5">"{obs.voiceNoteText}"</p>
                      </div>
                    </div>
                  )}

                  {/* Indicators achieved today */}
                  {obs.indicators && obs.indicators.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Kemampuan yang Muncul & Diamati:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {obs.indicators.map((ind, iIdx) => {
                          const rating = ind.rating || (ind as any).score;
                          const isGreat = rating === 'BSB' || rating === 'BSH';
                          return (
                            <div
                              key={ind.id || iIdx}
                              className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                                isGreat
                                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase text-slate-400">
                                  {ind.aspect || ind.aspectId || 'Capaian'}
                                </span>
                                <p className="font-semibold leading-snug">{ind.text || (ind as any).name}</p>
                              </div>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${
                                  rating === 'BSB'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : rating === 'BSH'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : rating === 'MB'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {rating || 'Teramati'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evidences for this activity */}
                  {obs.evidences && obs.evidences.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        Dokumentasi Karya & Kegiatan:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {obs.evidences.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => ev.url && setSelectedImage(ev.url)}
                            className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer aspect-square hover:shadow-md transition"
                          >
                            {ev.url ? (
                              <img
                                src={ev.url}
                                alt={ev.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                              <p className="text-[10px] font-bold truncate">{ev.title}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Positive Feedback for Parents */}
                  {obs.aiAnalysis?.homeStimulationAdvice && obs.aiAnalysis.homeStimulationAdvice.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 space-y-1.5">
                      <p className="font-bold flex items-center gap-1.5 text-amber-800">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        Ide Stimulasi Seru di Rumah Hari Ini:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        {obs.aiAnalysis.homeStimulationAdvice.slice(0, 2).map((tip, tIdx) => (
                          <li key={tIdx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Parent Response Box */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              Tanggapan & Apresiasi Ayah / Bunda untuk Hari Ini
            </h4>
            <p className="text-xs text-slate-500">
              Tinggalkan pesan, ucapan terima kasih untuk bu guru, atau ceritakan hal menarik yang ananda ceritakan saat pulang sekolah.
            </p>

            <div className="space-y-2">
              <textarea
                value={parentFeedback}
                onChange={(e) => setParentFeedback(e.target.value)}
                placeholder="Tulis respon atau cerita ananda di rumah hari ini..."
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex justify-between items-center">
                {feedbackSent ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Terima kasih, respon Ayah/Bunda tersimpan!
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">Guru kelas dapat membaca tanggapan ini.</span>
                )}
                <button
                  onClick={handleSendFeedback}
                  disabled={!parentFeedback.trim()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Kirim Tanggapan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-2xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl">
            <img
              src={selectedImage}
              alt="Dokumentasi Karya"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-xl"
            />
            <p className="text-center text-xs text-slate-500 py-2 font-semibold">
              Klik di mana saja untuk menutup
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
