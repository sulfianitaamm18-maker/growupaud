import React, { useState } from 'react';
import {
  Layers,
  FileText,
  Mic,
  Camera,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  DevelopmentalAspect,
  AIInsightResult,
  IndicatorItem,
  EvidenceItem,
  DevelopmentInterpretation,
} from '../../types';
import { ASPECT_LABELS, ASPECT_COLORS } from '../../data/initialData';

interface TraceableEvidenceInspectorProps {
  aiInsight?: AIInsightResult | null;
  indicators: IndicatorItem[];
  teacherNote?: string;
  voiceNoteText?: string;
  evidences?: EvidenceItem[];
  activityTitle: string;
  studentName: string;
  observationDate: string;
}

export const TraceableEvidenceInspector: React.FC<TraceableEvidenceInspectorProps> = ({
  aiInsight,
  indicators,
  teacherNote,
  voiceNoteText,
  evidences = [],
  activityTitle,
  studentName,
  observationDate,
}) => {
  const interpretations = aiInsight?.interpretations || [];
  const [selectedAspect, setSelectedAspect] = useState<DevelopmentalAspect>(
    interpretations.length > 0 ? interpretations[0].aspect : 'KOGNITIF'
  );

  const activeInterpretation = interpretations.find((i) => i.aspect === selectedAspect);
  const relatedIndicators = indicators.filter((i) => i.aspect === selectedAspect);
  const ratedIndicators = relatedIndicators.filter((i) => i.rating && i.rating !== 'BELUM_DINILAI');

  const consistencyColors: Record<DevelopmentInterpretation['consistencyStatus'], { bg: string; text: string; border: string; label: string }> = {
    KONSISTEN: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      label: 'Kemampuan Konsisten & Mandiri',
    },
    MUNCUL_DENGAN_BANTUAN: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      label: 'Muncul dengan Pendampingan / Transisi',
    },
    PERLU_STIMULASI: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      label: 'Perlu Stimulasi Intensif',
    },
    BELUM_TERAMATI: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-300',
      label: 'Belum Teramati pada Sesi Ini',
    },
  };

  const statusInfo = activeInterpretation
    ? consistencyColors[activeInterpretation.consistencyStatus]
    : consistencyColors.BELUM_TERAMATI;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Traceability Inspector: Penelusuran Bukti Analisis Perkembangan</span>
          </h4>
          <p className="text-xs text-slate-500">
            Telusuri bagaimana kesimpulan analisis AI diturunkan dari bukti konkret nyata.
          </p>
        </div>
        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
          {studentName} • {observationDate}
        </span>
      </div>

      {/* Aspect Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {(Object.keys(ASPECT_LABELS) as DevelopmentalAspect[]).map((aspectKey) => {
          const isSelected = selectedAspect === aspectKey;
          const interp = interpretations.find((i) => i.aspect === aspectKey);
          const hasData = interp && interp.consistencyStatus !== 'BELUM_TERAMATI';

          return (
            <button
              key={aspectKey}
              type="button"
              onClick={() => setSelectedAspect(aspectKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : hasData
                  ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  : 'bg-white text-slate-400 border-slate-150 hover:bg-slate-50'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ASPECT_COLORS[aspectKey] }}
              />
              <span>{ASPECT_LABELS[aspectKey].split(' ')[0]}</span>
              {interp && interp.score !== null && (
                <span className="text-[10px] px-1 rounded bg-white/20 font-mono">
                  {interp.score}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Traceability Flow Tree */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
        {/* Step 1: Visual & Analytical Conclusion */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">
              1. Kesimpulan Analisis Aspek
            </span>
            <span
              className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
            >
              {statusInfo.label}
            </span>
          </div>

          <p className="text-xs font-bold text-slate-800">
            {activeInterpretation
              ? activeInterpretation.interpretasi
              : `Belum ada penilaian spesifik untuk aspek ${ASPECT_LABELS[selectedAspect]} pada kegiatan "${activityTitle}".`}
          </p>

          {activeInterpretation?.kebutuhanDukungan && (
            <p className="text-[11px] text-indigo-900 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
              <strong>Kebutuhan Dukungan Lanjutan:</strong> {activeInterpretation.kebutuhanDukungan}
            </p>
          )}
        </div>

        {/* Trace Arrow */}
        <div className="flex justify-center text-slate-400">
          <ChevronRight className="w-5 h-5 rotate-90" />
        </div>

        {/* Step 2: Concrete Observed Facts */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
            2. Fakta Perilaku Nyata Teramati
          </span>
          <p className="text-xs text-slate-700 font-medium">
            {activeInterpretation?.fakta ||
              'Tidak ada catatan perilaku eksplisit pada sesi observasi ini.'}
          </p>
        </div>

        {/* Trace Arrow */}
        <div className="flex justify-center text-slate-400">
          <ChevronRight className="w-5 h-5 rotate-90" />
        </div>

        {/* Step 3: Raw Multi-Source Evidence Links */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-100 text-purple-800 uppercase">
            3. Rujukan Bukti Sumber Autentik
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Rubric Source */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Rubrik Penilaian ({ratedIndicators.length} Dinilai)</span>
              </div>
              {ratedIndicators.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Belum ada indikator dinilai.</p>
              ) : (
                <ul className="space-y-1 text-[11px] text-slate-700">
                  {ratedIndicators.map((ind) => (
                    <li key={ind.id} className="flex items-start justify-between gap-1">
                      <span className="truncate pr-1">• {ind.text}</span>
                      <span className="px-1.5 py-0.2 rounded font-extrabold bg-slate-200 text-slate-800 text-[10px]">
                        {ind.rating}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Teacher Notes & Voice Source */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Catatan & Suara Guru</span>
              </div>
              {teacherNote ? (
                <p className="text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-150">
                  <strong className="text-slate-800">Teks:</strong> "{teacherNote}"
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 italic">Tidak ada catatan teks tertulis.</p>
              )}
              {voiceNoteText && (
                <p className="text-[11px] text-emerald-900 bg-emerald-50 p-2 rounded border border-emerald-150">
                  <strong className="text-emerald-950">Suara:</strong> "{voiceNoteText}"
                </p>
              )}
            </div>
          </div>

          {/* Visual Evidence Files */}
          {evidences.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-purple-600" />
                <span>Bukti Dokumentasi Terlampir ({evidences.length} File):</span>
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {evidences.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 text-center"
                  >
                    {ev.type === 'PHOTO' ? (
                      <img
                        src={ev.url}
                        alt={ev.title}
                        className="w-full h-12 object-cover rounded mb-1"
                      />
                    ) : (
                      <div className="w-full h-12 bg-purple-50 rounded flex items-center justify-center text-purple-600 mb-1">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <p className="text-[9px] font-bold text-slate-700 truncate">{ev.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
