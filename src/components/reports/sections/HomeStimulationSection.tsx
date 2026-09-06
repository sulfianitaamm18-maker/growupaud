import React from 'react';
import { CanonicalReportDocument } from '../../../services/reportDocumentModel';
import { sanitizeReportText } from '../../../utils/textSanitizer';
import { Sparkles, Target } from 'lucide-react';

interface HomeStimulationSectionProps {
  canonical: CanonicalReportDocument;
}

export const HomeStimulationSection: React.FC<HomeStimulationSectionProps> = ({ canonical }) => {
  const stimulations = canonical.homeStimulations || [];
  if (stimulations.length === 0) return null;

  return (
    <div className="space-y-1.5 shrink-0">
      <div className="bg-slate-100 rounded px-2.5 py-1 flex items-center gap-2 border-l-4 border-indigo-600">
        <Sparkles className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
        <h3 className="text-[8.5pt] font-black uppercase text-indigo-950 tracking-wider">
          VI. STIMULASI SEDERHANA DI RUMAH BERSAMA KELUARGA
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {stimulations.map((item, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-md bg-indigo-50/70 border border-indigo-200 text-[7pt] space-y-1.5 flex flex-col justify-between stimulation-card break-inside-avoid"
          >
            <div>
              <span className="font-bold text-indigo-950 block text-[7.5pt] break-words">
                {idx + 1}. {sanitizeReportText(item.title)}
              </span>
              <p className="text-slate-700 text-[6.8pt] leading-tight break-words mt-1">
                {sanitizeReportText(item.activity)}
              </p>
            </div>
            <div className="pt-1.5 border-t border-indigo-200/80 flex items-center gap-1 text-[6.2pt] text-indigo-800 font-semibold break-words mt-1">
              <Target className="w-3 h-3 text-indigo-600 shrink-0" />
              <span>{sanitizeReportText(item.skillTrained)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
