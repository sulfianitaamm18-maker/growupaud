import React from 'react';
import { CanonicalReportDocument } from '../../../services/reportDocumentModel';
import { sanitizeReportText } from '../../../utils/textSanitizer';

interface ReportFooterProps {
  canonical: CanonicalReportDocument;
  pageNumber: number;
  totalPages?: number;
}

export const ReportFooter: React.FC<ReportFooterProps> = ({
  canonical,
  pageNumber,
  totalPages = 3,
}) => {
  return (
    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[6.8pt] text-slate-400 mt-auto shrink-0 avoid-break-inside">
      <span>
        GrowUPAUD Assessment Intelligence • Dicetak pada {sanitizeReportText(canonical.metadata.generatedDate)}
      </span>
      <span className="font-semibold text-slate-600">
        Halaman {pageNumber} dari {totalPages}
      </span>
      <span>Dokumen Resmi Portofolio Asesmen Autentik PAUD</span>
    </div>
  );
};
