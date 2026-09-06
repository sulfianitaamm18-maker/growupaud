import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { CanonicalReportDocument } from '../services/reportDocumentModel';
import { buildStudentReportPdfDocument, GeneratePdfOptions } from '../services/pdfReportGenerator';
import { sanitizePdfDocumentStyles } from './colorSanitizer';

export interface ExportPdfFromHtmlOptions {
  containerElementId?: string;
  pageElementIds?: string[];
  fileName?: string;
  canonicalDoc?: CanonicalReportDocument;
}

export function sanitizeOklchInClonedDoc(clonedDoc: Document): void {
  sanitizePdfDocumentStyles(clonedDoc);
}

/**
 * High-Resolution HTML-to-PDF export using html2canvas with full CORS and Retina scaling (2x),
 * accurately mapping the continuous container or page containers to exact A4 pages without clipping.
 */
export async function exportReportToPdfFromHtml(options: ExportPdfFromHtmlOptions): Promise<void> {
  const {
    containerElementId = 'report-content',
    pageElementIds,
    fileName = 'Laporan_Perkembangan_Ananda_A4.pdf',
    canonicalDoc,
  } = options;

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const a4WidthMm = 210;
    const a4HeightMm = 297;

    // 1. If explicit pageElementIds exist and match in DOM, render each page
    if (pageElementIds && pageElementIds.length > 0 && document.getElementById(pageElementIds[0])) {
      let pageIndex = 0;
      for (const pageId of pageElementIds) {
        const el = document.getElementById(pageId);
        if (!el) continue;

        if (pageIndex > 0) {
          doc.addPage('a4', 'portrait');
        }

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1200,
          onclone: (clonedDoc) => {
            sanitizePdfDocumentStyles(clonedDoc);
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(imgData, 'JPEG', 0, 0, a4WidthMm, a4HeightMm, undefined, 'FAST');
        pageIndex++;
      }
    } else {
      // 2. Single Continuous Canvas Flow
      const el =
        document.getElementById(containerElementId) ||
        document.getElementById('report-content') ||
        document.getElementById('student-report-card-root') ||
        document.getElementById('report-page-1');
      if (!el) {
        throw new Error(`Target container #${containerElementId} not found in DOM`);
      }

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          sanitizePdfDocumentStyles(clonedDoc);
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = a4WidthMm;
      const pageHeight = a4HeightMm;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position -= pageHeight;
        doc.addPage('a4', 'portrait');
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
    }

    doc.save(fileName);
  } catch (err: any) {
    console.warn('html2canvas export encountered an issue, falling back to direct vector engine:', err);
    // If canonicalDoc was provided, fallback to the direct vector engine seamlessly
    if (canonicalDoc) {
      const vectorResult = await buildStudentReportPdfDocument({
        student: canonicalDoc.student as any,
        reportData: {} as any,
        schoolProfile: canonicalDoc.school as any,
        canonicalDoc,
      });
      vectorResult.engine.save(fileName);
      return;
    }
    throw err;
  }
}

/**
 * Master Direct Vector jsPDF export with exact typography and zero image distortion.
 */
export async function exportReportToPdfDirect(options: GeneratePdfOptions): Promise<void> {
  const result = await buildStudentReportPdfDocument(options);
  result.engine.save(result.fileName);
}

/**
 * Standard Unified Export Function:
 * Automatically uses high-resolution canvas if DOM elements exist, or fallback to direct vector engine.
 */
export async function exportStudentReportPdf(
  canonical: CanonicalReportDocument,
  options?: {
    containerId?: string;
    pdfOptions?: GeneratePdfOptions;
  }
): Promise<void> {
  const fileName = canonical.metadata.fileBaseName
    ? `${canonical.metadata.fileBaseName}.pdf`
    : `Laporan_Perkembangan_${canonical.student.fullName.replace(/\s+/g, '_')}_A4.pdf`;

  const containerEl =
    document.getElementById('report-content') ||
    document.getElementById('student-report-card-root') ||
    document.getElementById('report-page-1');

  if (containerEl) {
    await exportReportToPdfFromHtml({
      containerElementId: containerEl.id || 'report-content',
      fileName,
      canonicalDoc: canonical,
    });
  } else if (options?.pdfOptions) {
    await exportReportToPdfDirect(options.pdfOptions);
  } else {
    const vectorResult = await buildStudentReportPdfDocument({
      student: canonical.student as any,
      reportData: {} as any,
      schoolProfile: canonical.school as any,
      canonicalDoc: canonical,
    });
    vectorResult.engine.save(fileName);
  }
}



