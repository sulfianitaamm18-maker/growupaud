import { CanonicalReportDocument } from '../services/reportDocumentModel';
import { generateStudentReportDocx } from '../services/docxReportGenerator';

export interface ExportDocxOptions {
  canonicalDoc: CanonicalReportDocument;
  logoUrl?: string | null;
}

export async function exportStudentReportDocx(options: ExportDocxOptions): Promise<void> {
  await generateStudentReportDocx(options);
}
