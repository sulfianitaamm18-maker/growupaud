import React from 'react';
import { ASPECT_LABELS, ASPECT_COLORS } from '../../data/initialData';
import { DevelopmentalAspect } from '../../types';

interface AspectScoreBarsProps {
  aspectScores?: Record<DevelopmentalAspect, number | null>;
  scores?: Record<DevelopmentalAspect, number | null>;
  title?: string;
  subtitle?: string;
}

export const AspectScoreBars: React.FC<AspectScoreBarsProps> = ({
  aspectScores,
  scores,
  title = 'Persentase Ketercapaian Aspek',
  subtitle = 'Ketercapaian indikator observasi harian',
}) => {
  const effectiveScores: Record<string, number | null | undefined> =
    aspectScores || scores || {};
  const aspects = Object.keys(ASPECT_LABELS) as DevelopmentalAspect[];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          Kurikulum Merdeka
        </span>
      </div>

      <div className="space-y-3.5">
        {aspects.map((key) => {
          const rawVal = effectiveScores[key];
          const isMeasured =
            rawVal !== null &&
            rawVal !== undefined &&
            typeof rawVal === 'number' &&
            !isNaN(rawVal);
          const score = isMeasured ? rawVal : 0;
          const color = ASPECT_COLORS[key];
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">{ASPECT_LABELS[key]}</span>
                <span className="text-slate-800 font-bold" style={{ color: isMeasured ? color : '#94A3B8' }}>
                  {isMeasured ? `${score}%` : 'Belum Ada Data'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${score}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/60 p-2.5 rounded-xl text-[11px] text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">💡 Panduan Membaca Persentase bagi Orang Tua:</p>
        <p>
          Persentase capaian di atas adalah representasi komputasi data pengamatan guru di kelas, bukan merupakan nilai angka atau peringkat anak. Setiap anak memiliki kecepatan tumbuh kembang yang unik dan bertahap.
        </p>
      </div>
    </div>
  );
};
