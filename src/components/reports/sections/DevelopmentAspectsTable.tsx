import React from 'react';
import { CanonicalReportDocument } from '../../../services/reportDocumentModel';
import { sanitizeReportText } from '../../../utils/textSanitizer';

interface DevelopmentAspectsTableProps {
  canonical: CanonicalReportDocument;
}

export const DevelopmentAspectsTable: React.FC<DevelopmentAspectsTableProps> = ({ canonical }) => {
  const aspects = canonical.aspects || [];

  return (
    <div className="space-y-1.5 shrink-0">
      <div className="bg-slate-100 rounded px-2.5 py-1 flex items-center gap-2 border-l-4 border-teal-600">
        <h3 className="text-[8.5pt] font-black uppercase text-slate-900 tracking-wider">
          V. PERKEMBANGAN SPESIFIK 6 ASPEK (KURIKULUM MERDEKA)
        </h3>
      </div>

      <div className="border border-slate-200 rounded-md overflow-hidden text-[7pt] bg-white shadow-xs">
        {/* Table Header */}
        <div className="bg-teal-700 text-white px-2 py-1.5 font-bold flex items-center justify-between text-[7.2pt] table-row break-inside-avoid">
          <span className="w-1/4">Aspek Perkembangan</span>
          <span className="w-1/6 text-center">Status Capaian</span>
          <span className="w-1/3">Yang Terlihat (Kemampuan Nyata)</span>
          <span className="w-1/4">Yang Perlu Dikuatkan</span>
        </div>

        {/* Table Rows (Break-inside avoid only on individual rows) */}
        {aspects.map((asp, idx) => (
          <div
            key={asp.aspectKey}
            className={`px-2 py-1.5 flex items-center justify-between border-b border-slate-200 last:border-0 table-row aspect-table-row break-inside-avoid ${
              idx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'
            }`}
          >
            <div className="w-1/4 pr-1">
              <span className="font-bold text-slate-900 block">{sanitizeReportText(asp.aspectTitle)}</span>
            </div>
            <div className="w-1/6 text-center">
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[6.2pt] font-extrabold ${
                  asp.ratingLevel === 'BSB'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : asp.ratingLevel === 'BSH'
                    ? 'bg-teal-100 text-teal-800 border border-teal-300'
                    : asp.ratingLevel === 'MB'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {sanitizeReportText(asp.ratingLabel)}
              </span>
            </div>
            <div className="w-1/3 pr-1 text-slate-800 leading-snug">
              {sanitizeReportText(asp.whatIsObserved)}
            </div>
            <div className="w-1/4 text-slate-600 leading-snug">
              {sanitizeReportText(asp.whatNeedsStrengthening)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
