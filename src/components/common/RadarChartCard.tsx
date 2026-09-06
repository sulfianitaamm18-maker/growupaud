import React, { useRef, useState, useEffect } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ASPECT_LABELS, ASPECT_COLORS } from '../../data/initialData';
import { DevelopmentalAspect, DevelopmentInterpretation } from '../../types';

interface RadarChartCardProps {
  aspectScores?: Record<DevelopmentalAspect, number | null>;
  scores?: Record<DevelopmentalAspect, number | null>;
  interpretations?: DevelopmentInterpretation[];
  title?: string;
  subtitle?: string;
  height?: number;
}

export const RadarChartCard: React.FC<RadarChartCardProps> = ({
  aspectScores,
  scores,
  interpretations,
  title = 'Radar Chart Capaian Perkembangan',
  subtitle = 'Skor aspek berbasis Kurikulum Merdeka PAUD (0 - 100%)',
  height = 280,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const checkSize = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setIsReady(true);
      }
    };

    checkSize();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            setIsReady(true);
          }
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      const timer = setTimeout(checkSize, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Normalize scores from either aspectScores or scores prop
  const effectiveScores: Record<string, number | null | undefined> =
    aspectScores || scores || {};

  const chartData = (Object.keys(ASPECT_LABELS) as DevelopmentalAspect[]).map((key) => {
    const rawVal = effectiveScores[key];
    const isMeasured =
      rawVal !== null &&
      rawVal !== undefined &&
      typeof rawVal === 'number' &&
      !isNaN(rawVal);
    return {
      subject: ASPECT_LABELS[key],
      score: isMeasured ? rawVal : 0,
      fullMark: 100,
      isMeasured,
    };
  });

  const hasAnyMeasured = chartData.some((d) => d.isMeasured);

  const getConsistencyBadge = (key: DevelopmentalAspect) => {
    if (!interpretations) return null;
    const interp = interpretations.find((i) => i.aspect === key);
    if (!interp || interp.consistencyStatus === 'BELUM_TERAMATI') return null;

    if (interp.consistencyStatus === 'KONSISTEN') {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
          Konsisten
        </span>
      );
    }
    if (interp.consistencyStatus === 'MUNCUL_DENGAN_BANTUAN') {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
          Dengan Bantuan
        </span>
      );
    }
    if (interp.consistencyStatus === 'PERLU_STIMULASI') {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
          Perlu Stimulasi
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          6 Aspek PAUD
        </span>
      </div>

      <div
        ref={containerRef}
        style={{ width: '100%', minWidth: 0, height: height, minHeight: height }}
        className="py-2 relative flex items-center justify-center"
      >
        {isReady ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={height}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip
                formatter={(value: number, name: string, item: any) => [
                  item.payload.isMeasured ? `${value}%` : 'Belum Ada Data Observasi',
                  'Capaian Aspek',
                ]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                }}
              />
              <Radar
                name="Skor Aspek"
                dataKey="score"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.35}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-xs text-slate-400 p-4">
            Grafik belum dapat ditampilkan karena ukuran area belum tersedia.
          </div>
        )}
      </div>

      {!hasAnyMeasured && (
        <div className="mx-2 mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
          <span>ℹ️</span>
          <span>Data visualisasi perkembangan belum tersedia. Silakan lengkapi lembar observasi siswa.</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-100">
        {(Object.keys(ASPECT_LABELS) as DevelopmentalAspect[]).map((key) => {
          const rawScore = effectiveScores[key];
          const isMeasured =
            rawScore !== null &&
            rawScore !== undefined &&
            typeof rawScore === 'number' &&
            !isNaN(rawScore);
          const scoreVal = isMeasured ? rawScore : null;
          const badge = getConsistencyBadge(key);
          return (
            <div
              key={key}
              className="flex flex-col gap-1 text-xs bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-200"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-slate-600 font-medium truncate pr-1 text-[11px]"
                  title={ASPECT_LABELS[key]}
                >
                  {ASPECT_LABELS[key].split(' ')[0]}
                </span>
                <span
                  className="font-bold text-xs"
                  style={{
                    color: scoreVal !== null ? ASPECT_COLORS[key] : '#94A3B8',
                  }}
                >
                  {scoreVal !== null ? `${scoreVal}%` : 'Belum Ada Data'}
                </span>
              </div>
              {badge && <div className="self-start">{badge}</div>}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 bg-emerald-50/40 p-2.5 rounded-xl text-[11px] text-slate-600">
        <p className="font-semibold text-emerald-950">💡 Panduan Diagram Radar:</p>
        <p className="text-slate-600 mt-0.5">
          Grafik radar menggambarkan keutuhan 6 aspek perkembangan anak. Luasan area mencerminkan keterlibatan anak dalam ragam aktivitas, di mana capaian berkembang secara bertahap melalui stimulasi yang menyenangkan.
        </p>
      </div>
    </div>
  );
};

