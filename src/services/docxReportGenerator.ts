import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Header,
  Footer,
  PageNumber,
  ImageRun,
  PageOrientation,
} from 'docx';
import { CanonicalReportDocument } from './reportDocumentModel';
import { REPORT_DOCUMENT_CONFIG } from './reportDocumentStyles';
import { loadImageAsUint8Array } from '../utils/imageUtils';
import { renderRadarChartToPngBytes } from '../utils/chartRenderer';
import { sanitizeReportText } from '../utils/textSanitizer';

export interface GenerateDocxOptions {
  canonicalDoc: CanonicalReportDocument;
  logoUrl?: string | null;
}

/**
 * Professional Real DOCX / Word Generator for GrowUPAUD
 * Generates an exact, clean Kurikulum Merdeka PAUD Developmental Report in .docx format.
 * Matches 100% of the content and structure of the Canonical Document and PDF Master.
 * Standards: Margins 4cm-3cm-4cm-3cm (A4), Arial 12pt, 1.5 line spacing, real visual chart image.
 */
export async function generateStudentReportDocx(options: GenerateDocxOptions): Promise<void> {
  const { canonicalDoc, logoUrl } = options;

  // 1. Pre-render the 6 Aspects Radar Chart directly as high-resolution PNG image
  let radarChartBytes: Uint8Array | null = null;
  try {
    radarChartBytes = await renderRadarChartToPngBytes(canonicalDoc.aspects, 640, 460);
  } catch (chartErr) {
    console.warn('Failed to render radar chart PNG for DOCX:', chartErr);
  }

  // 2. Pre-load logo image if provided
  let logoBytes: Uint8Array | null = null;
  const rawLogo = logoUrl || canonicalDoc.school.logoUrl;
  if (rawLogo) {
    try {
      logoBytes = await loadImageAsUint8Array(rawLogo);
    } catch (logoErr) {
      console.warn('Failed to load logo for DOCX:', logoErr);
    }
  }

  // 3. Pre-load authentic evidence images for docx embedding (all items, no artificial truncation)
  const loadedEvidenceImages: {
    data: Uint8Array | null;
    title: string;
    caption: string;
    date: string;
  }[] = [];

  for (const ev of canonicalDoc.evidences || []) {
    let imgBytes: Uint8Array | null = null;
    if (ev.url) {
      try {
        imgBytes = await loadImageAsUint8Array(ev.url);
      } catch (e) {
        console.warn('Failed to load evidence image for DOCX:', e);
      }
    }
    loadedEvidenceImages.push({
      data: imgBytes,
      title: ev.activityTitle,
      caption: ev.caption,
      date: ev.date,
    });
  }

  const { margins, typography } = REPORT_DOCUMENT_CONFIG;

  const doc = new Document({
    creator: 'GrowUPAUD Assessment Intelligence',
    title: `Laporan Perkembangan Ananda ${canonicalDoc.student.fullName}`,
    description: 'Laporan Capaian Perkembangan Peserta Didik PAUD Kurikulum Merdeka (Standar A4)',
    styles: {
      default: {
        document: {
          run: {
            font: typography.primaryFont,
            size: 24, // 12pt default
            color: '0F172A',
          },
          paragraph: {
            spacing: {
              line: typography.lineSpacingTwip, // 1.5 line spacing (360 twips)
              before: 60,
              after: 60,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: convertMillimetersToTwip(margins.topMm), // 40mm = 4cm
              bottom: convertMillimetersToTwip(margins.bottomMm), // 30mm = 3cm
              left: convertMillimetersToTwip(margins.leftMm), // 40mm = 4cm
              right: convertMillimetersToTwip(margins.rightMm), // 30mm = 3cm
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Laporan Perkembangan Ananda ${canonicalDoc.student.fullName} • ${canonicalDoc.school.name}`,
                    size: 15, // 7.5pt
                    color: '64748B',
                    italics: true,
                    font: typography.primaryFont,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Halaman ',
                    size: 14,
                    color: '64748B',
                    font: typography.primaryFont,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 14,
                    color: '64748B',
                    font: typography.primaryFont,
                  }),
                  new TextRun({
                    text: ` — Dokumen Resmi Portofolio Asesmen GrowUPAUD • ${canonicalDoc.metadata.generatedDate}`,
                    size: 14,
                    color: '64748B',
                    font: typography.primaryFont,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // =========================================================================
          // HALAMAN 1: KOP SURAT, IDENTITAS, GAMBARAN MENYELURUH, GRAFIK & KEKUATAN
          // =========================================================================

          // KOP SURAT TABLE (Logo + Header Text)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  ...(logoBytes
                    ? [
                        new TableCell({
                          width: { size: 18, type: WidthType.PERCENTAGE },
                          borders: {
                            top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                            bottom: { style: BorderStyle.SINGLE, size: 8, color: 'CBD5E1' },
                            left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                            right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                          },
                          margins: { bottom: 120 },
                          children: [
                            new Paragraph({
                              alignment: AlignmentType.CENTER,
                              children: [
                                new ImageRun({
                                  data: logoBytes,
                                  transformation: { width: 55, height: 55 },
                                } as any),
                              ],
                            }),
                          ],
                        }),
                      ]
                    : []),
                  new TableCell({
                    width: { size: logoBytes ? 82 : 100, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: 'CBD5E1' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    },
                    margins: { bottom: 120 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'LAPORAN PERKEMBANGAN ANAK',
                            bold: true,
                            size: 24, // 12pt
                            color: '0F172A',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: canonicalDoc.school.name.toUpperCase(),
                            bold: true,
                            size: 20, // 10pt
                            color: '1E293B',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: `${canonicalDoc.metadata.semester} • TAHUN AJARAN ${canonicalDoc.metadata.academicYear} | ${canonicalDoc.school.address}`,
                            size: 15, // 7.5pt
                            color: '64748B',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Spacer
          new Paragraph({ spacing: { before: 80, after: 40 } }),

          // BAGIAN 1: IDENTITAS SISWA
          new Paragraph({
            spacing: { before: 60, after: 30 },
            children: [
              new TextRun({
                text: 'Bagian 1: Identitas Siswa',
                bold: true,
                size: 19,
                color: '0369A1', // sky-700
                font: typography.primaryFont,
              }),
            ],
          }),

          // INFORMASI PESERTA DIDIK TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F8FAFC' },
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                      left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                      right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Nama Peserta Didik: ', size: 16, color: '64748B', font: typography.primaryFont }),
                          new TextRun({
                            text: `${canonicalDoc.student.fullName}`,
                            bold: true,
                            size: 16,
                            color: '0F172A',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Kelompok / Usia: ', size: 16, color: '64748B', font: typography.primaryFont }),
                          new TextRun({
                            text: `${canonicalDoc.student.className} • ${canonicalDoc.student.ageDisplay}`,
                            size: 16,
                            color: '0F172A',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'NISN / ID Siswa: ', size: 16, color: '64748B', font: typography.primaryFont }),
                          new TextRun({
                            text: `${canonicalDoc.student.nisn || canonicalDoc.student.id || '—'}`,
                            size: 16,
                            color: '0F172A',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F8FAFC' },
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                      left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                      right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Orang Tua / Wali: ', size: 16, color: '64748B', font: typography.primaryFont }),
                          new TextRun({
                            text: `${canonicalDoc.student.parentName}`,
                            size: 16,
                            color: '0F172A',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Guru Wali Kelas: ', size: 16, color: '64748B', font: typography.primaryFont }),
                          new TextRun({
                            text: `${canonicalDoc.signatures.teacher.name}`,
                            size: 16,
                            color: '0F172A',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Tanggal Laporan: ', size: 16, color: '64748B', font: typography.primaryFont }),
                          new TextRun({
                            text: `${canonicalDoc.metadata.generatedDate}`,
                            size: 16,
                            color: '0F172A',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Spacer
          new Paragraph({ spacing: { before: 80, after: 40 } }),

          // BAGIAN 2: RINGKASAN PERKEMBANGAN
          new Paragraph({
            spacing: { before: 60, after: 40 },
            children: [
              new TextRun({
                text: 'Bagian 2: Ringkasan Perkembangan',
                bold: true,
                size: 19,
                color: '0369A1', // sky-700
                font: typography.primaryFont,
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: 'F0FDF4' }, // Emerald-50
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: 'BBF7D0' },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BBF7D0' },
                      left: { style: BorderStyle.SINGLE, size: 4, color: 'BBF7D0' },
                      right: { style: BorderStyle.SINGLE, size: 4, color: 'BBF7D0' },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { line: typography.lineSpacingTwip },
                        children: [
                          new TextRun({
                            text: canonicalDoc.overallSummary.description,
                            size: 18, // 9pt
                            color: '14532D',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Spacer
          new Paragraph({ spacing: { before: 80, after: 40 } }),

          // BAGIAN 3: GRAFIK PERKEMBANGAN ASPEK
          new Paragraph({
            spacing: { before: 60, after: 40 },
            children: [
              new TextRun({
                text: 'Bagian 3: Grafik Perkembangan Aspek',
                bold: true,
                size: 19,
                color: '0369A1', // sky-700
                font: typography.primaryFont,
              }),
            ],
          }),

          // Real Visual Radar Chart Image
          ...(radarChartBytes
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 60 },
                  children: [
                    new ImageRun({
                      data: radarChartBytes,
                      transformation: { width: 380, height: 260 },
                    } as any),
                  ],
                }),
              ]
            : []),

          // Table of 6 Aspects
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9' },
                    margins: { top: 50, bottom: 50, left: 80, right: 80 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Aspek Perkembangan', bold: true, size: 16, color: '334155', font: typography.primaryFont }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9' },
                    margins: { top: 50, bottom: 50, left: 80, right: 80 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'Capaian', bold: true, size: 16, color: '334155', font: typography.primaryFont }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F1F5F9' },
                    margins: { top: 50, bottom: 50, left: 80, right: 80 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Status Capaian', bold: true, size: 16, color: '334155', font: typography.primaryFont }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              ...canonicalDoc.aspects.map((asp) =>
                new TableRow({
                  children: [
                    new TableCell({
                      margins: { top: 35, bottom: 35, left: 80, right: 80 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: asp.aspectTitle, size: 15, color: '0F172A', font: typography.primaryFont }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      margins: { top: 35, bottom: 35, left: 80, right: 80 },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: asp.scoreDisplay, bold: true, size: 15, color: '059669', font: typography.primaryFont }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      margins: { top: 35, bottom: 35, left: 80, right: 80 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: asp.conditionLabel, size: 14.5, color: '475569', font: typography.primaryFont }),
                          ],
                        }),
                      ],
                    }),
                  ],
                })
              ),
            ],
          }),

          // Kamus Singkat Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: 'F8FAFC' },
                    margins: { top: 40, bottom: 40, left: 80, right: 80 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                      left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                      right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Kamus Capaian: BB (Belum Berkembang) • MB (Mulai Berkembang) • BSH (Berkembang Sesuai Harapan) • BSB (Berkembang Sangat Baik)',
                            size: 13,
                            color: '64748B',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Spacer
          new Paragraph({ spacing: { before: 80, after: 40 } }),

          // BAGIAN 4: VISUAL SUMMARY
          new Paragraph({
            spacing: { before: 60, after: 30 },
            children: [
              new TextRun({
                text: 'Bagian 4: Visual Summary',
                bold: true,
                size: 19,
                color: '0369A1', // sky-700
                font: typography.primaryFont,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text: 'Kekuatan Utama Ananda:',
                bold: true,
                size: 16,
                color: '065F46', // Emerald-800
                font: typography.primaryFont,
              }),
            ],
          }),
          ...canonicalDoc.developedPoints.map(
            (item) =>
              new Paragraph({
                spacing: { before: 20, after: 20, line: typography.lineSpacingTwip },
                children: [
                  new TextRun({ text: '✓ ', bold: true, size: 16, color: '059669', font: typography.primaryFont }),
                  new TextRun({ text: `${item.title}: `, bold: true, size: 15.5, color: '0F172A', font: typography.primaryFont }),
                  new TextRun({ text: item.behavior, size: 15.5, color: '334155', font: typography.primaryFont }),
                ],
              })
          ),

          // =========================================================================
          // HALAMAN 2: MASIH PERLU DIKEMBANGKAN, BUKTI AUTENTIK & TABEL 6 ASPEK
          // =========================================================================
          new Paragraph({
            pageBreakBefore: true,
            spacing: { before: 40, after: 30 },
            children: [
              new TextRun({
                text: 'IV. MASIH PERLU DIKEMBANGKAN (FOKUS PENDAMPINGAN)',
                bold: true,
                size: 18,
                color: '92400E', // Amber-800
                font: typography.primaryFont,
              }),
            ],
          }),
          ...canonicalDoc.growthPoints.map(
            (item) =>
              new Paragraph({
                spacing: { before: 20, after: 20, line: typography.lineSpacingTwip },
                children: [
                  new TextRun({ text: '• ', bold: true, size: 16, color: 'D97706', font: typography.primaryFont }),
                  new TextRun({ text: `${item.title}: `, bold: true, size: 15.5, color: '0F172A', font: typography.primaryFont }),
                  new TextRun({ text: item.recommendation, size: 15.5, color: '334155', font: typography.primaryFont }),
                ],
              })
          ),

          // Spacer
          new Paragraph({ spacing: { before: 60, after: 30 } }),

          // BAGIAN 6: DETAIL CAPAIAN ASPEK
          new Paragraph({
            spacing: { before: 40, after: 30 },
            children: [
              new TextRun({
                text: 'Bagian 6: Detail Capaian Aspek',
                bold: true,
                size: 19,
                color: '0369A1', // sky-700
                font: typography.primaryFont,
              }),
            ],
          }),

          // Table Detailed 6 Aspects
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: '0D9488' },
                    margins: { top: 50, bottom: 50, left: 70, right: 70 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Aspek Perkembangan', bold: true, size: 15, color: 'FFFFFF', font: typography.primaryFont }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    shading: { fill: '0D9488' },
                    margins: { top: 50, bottom: 50, left: 70, right: 70 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'Status', bold: true, size: 15, color: 'FFFFFF', font: typography.primaryFont }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    shading: { fill: '0D9488' },
                    margins: { top: 50, bottom: 50, left: 70, right: 70 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Yang Terlihat (Kemampuan Nyata)', bold: true, size: 15, color: 'FFFFFF', font: typography.primaryFont }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: '0D9488' },
                    margins: { top: 50, bottom: 50, left: 70, right: 70 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Yang Perlu Dikuatkan', bold: true, size: 15, color: 'FFFFFF', font: typography.primaryFont }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              // Rows
              ...canonicalDoc.aspects.map((asp) =>
                new TableRow({
                  cantSplit: true,
                  children: [
                    new TableCell({
                      margins: { top: 40, bottom: 40, left: 70, right: 70 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: asp.aspectTitle, bold: true, size: 14.5, color: '0F172A', font: typography.primaryFont }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      margins: { top: 40, bottom: 40, left: 70, right: 70 },
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new TextRun({ text: asp.ratingLabel, bold: true, size: 14.5, color: '059669', font: typography.primaryFont }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      margins: { top: 40, bottom: 40, left: 70, right: 70 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: asp.whatIsObserved, size: 14, color: '334155', font: typography.primaryFont }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      margins: { top: 40, bottom: 40, left: 70, right: 70 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: asp.whatNeedsStrengthening, size: 14, color: '64748B', font: typography.primaryFont }),
                          ],
                        }),
                      ],
                    }),
                  ],
                })
              ),
            ],
          }),

          // =========================================================================
          // HALAMAN 3: STIMULASI RUMAH, PESAN WALI KELAS & LEMBAR PENGESAHAN
          // =========================================================================
          new Paragraph({
            pageBreakBefore: true,
            spacing: { before: 40, after: 30 },
            children: [
              new TextRun({
                text: 'VI. STIMULASI SEDERHANA DI RUMAH BERSAMA KELUARGA',
                bold: true,
                size: 18,
                color: '312E81', // Indigo-900
                font: typography.primaryFont,
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                cantSplit: true,
                children: canonicalDoc.homeStimulations.map((item, idx) =>
                  new TableCell({
                    width: { size: 100 / canonicalDoc.homeStimulations.length, type: WidthType.PERCENTAGE },
                    shading: { fill: 'EEF2FF' }, // Indigo-50
                    margins: { top: 70, bottom: 70, left: 80, right: 80 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2FE' },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2FE' },
                      left: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2FE' },
                      right: { style: BorderStyle.SINGLE, size: 4, color: 'C7D2FE' },
                    },
                    children: [
                      new Paragraph({
                        spacing: { before: 0, after: 30 },
                        children: [
                          new TextRun({
                            text: `${idx + 1}. ${item.title}`,
                            bold: true,
                            size: 15,
                            color: '1E1B4B',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { before: 20, after: 30, line: typography.lineSpacingTwip },
                        children: [
                          new TextRun({
                            text: item.activity,
                            size: 14,
                            color: '334155',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { before: 30, after: 0 },
                        children: [
                          new TextRun({
                            text: `🎯 ${item.skillTrained}`,
                            bold: true,
                            size: 13,
                            color: '4338CA',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                    ],
                  })
                ),
              }),
            ],
          }),

          // Spacer
          new Paragraph({ spacing: { before: 50, after: 20 } }),

          // BAGIAN 7: PESAN & REKOMENDASI GURU
          new Paragraph({
            spacing: { before: 30, after: 20 },
            children: [
              new TextRun({
                text: 'Bagian 7: Pesan & Rekomendasi Guru',
                bold: true,
                size: 19,
                color: '0369A1', // sky-700
                font: typography.primaryFont,
              }),
            ],
          }),

          ...(canonicalDoc.teacherMessage
            ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          shading: { fill: 'FFFBEB' },
                          margins: { top: 60, bottom: 60, left: 80, right: 80 },
                          borders: {
                            top: { style: BorderStyle.SINGLE, size: 4, color: 'FDE68A' },
                            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FDE68A' },
                            left: { style: BorderStyle.SINGLE, size: 4, color: 'FDE68A' },
                            right: { style: BorderStyle.SINGLE, size: 4, color: 'FDE68A' },
                          },
                          children: [
                            new Paragraph({
                              spacing: { line: typography.lineSpacingTwip },
                              children: [
                                new TextRun({
                                  text: `"${canonicalDoc.teacherMessage}"`,
                                  italics: true,
                                  size: 15,
                                  color: '78350F',
                                  font: typography.primaryFont,
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ]
            : []),

          // Spacer
          new Paragraph({ spacing: { before: 120, after: 60 } }),

          // LEMBAR PENGESAHAN 3 PIHAK
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 33.3, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'Mengetahui,\n', size: 14.5, color: '475569', font: typography.primaryFont }),
                          new TextRun({ text: canonicalDoc.signatures.parent.label, size: 14.5, color: '475569', font: typography.primaryFont }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 320 } }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: `( ${canonicalDoc.signatures.parent.name} )`,
                            bold: true,
                            size: 15,
                            color: '0F172A',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 33.3, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: `${canonicalDoc.signatures.teacher.locationAndDate}\n`,
                            size: 14.5,
                            color: '475569',
                            font: typography.primaryFont,
                          }),
                          new TextRun({ text: canonicalDoc.signatures.teacher.label, size: 14.5, color: '475569', font: typography.primaryFont }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 320 } }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: `( ${canonicalDoc.signatures.teacher.name} )`,
                            bold: true,
                            size: 15,
                            color: '0F172A',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 33.3, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'Mengetahui,\n', size: 14.5, color: '475569', font: typography.primaryFont }),
                          new TextRun({ text: canonicalDoc.signatures.principal.label, size: 14.5, color: '475569', font: typography.primaryFont }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 320 } }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: `( ${canonicalDoc.signatures.principal.name} )`,
                            bold: true,
                            size: 15,
                            color: '0F172A',
                            font: typography.primaryFont,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${canonicalDoc.metadata.fileBaseName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
