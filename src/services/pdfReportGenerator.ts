import { jsPDF } from 'jspdf';
import { StudentProfile, SchoolProfile } from '../types';
import { ReportCalculatedData } from '../utils/reportCalculator';
import { CanonicalReportDocument } from './reportDocumentModel';
import { renderRadarChartToDataUrl } from '../utils/chartRenderer';
import { ReportLayoutEngine } from './reportLayoutEngine';

export interface GeneratePdfOptions {
  student: StudentProfile;
  reportData: ReportCalculatedData;
  schoolProfile: SchoolProfile;
  logoDataUrl?: string | null;
  canonicalDoc?: CanonicalReportDocument;
}

export interface GeneratedPdfResult {
  engine: ReportLayoutEngine;
  doc: jsPDF;
  blob: Blob;
  blobUrl: string;
  fileName: string;
}

/**
 * Builds the Master PDF Document from CanonicalReportDocument using the ReportLayoutEngine.
 * Guarantees zero text overlap, dynamic text wrapping, exact A4 margins, and crisp vector typography.
 */
export async function buildStudentReportPdfDocument(
  options: GeneratePdfOptions
): Promise<GeneratedPdfResult> {
  const { student, reportData, logoDataUrl } = options;
  const canonical = options.canonicalDoc || reportData.canonicalDoc;

  if (!canonical) {
    throw new Error('Canonical report document is missing.');
  }

  // 1. Render high-resolution Radar Chart to Data URL
  let radarChartDataUrl: string | null = null;
  try {
    radarChartDataUrl = await renderRadarChartToDataUrl(canonical.aspects, 720, 520);
  } catch (err) {
    console.warn('Radar chart render failed:', err);
  }

  // 2. Instantiate ReportLayoutEngine
  const engine = new ReportLayoutEngine({
    canonicalDoc: canonical,
    radarChartDataUrl,
    logoDataUrl,
  });

  // 3. Generate Full Multi-Page Document
  const doc = engine.generateFullReport();
  const blob = engine.getBlob();
  const blobUrl = URL.createObjectURL(blob);

  const fileName = canonical.metadata.fileBaseName
    ? `${canonical.metadata.fileBaseName}.pdf`
    : `Laporan_Perkembangan_${student.name.replace(/\s+/g, '_')}_A4.pdf`;

  return {
    engine,
    doc,
    blob,
    blobUrl,
    fileName,
  };
}

/**
 * Generates and triggers the direct browser download of the Master PDF Report.
 */
export async function generateStudentReportPdf(options: GeneratePdfOptions): Promise<void> {
  const result = await buildStudentReportPdfDocument(options);
  result.engine.save(result.fileName);
}
