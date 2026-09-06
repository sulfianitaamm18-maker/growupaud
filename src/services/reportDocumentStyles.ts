/**
 * Single Source of Truth for GrowUPAUD Assessment Report Document Standards
 * Standard A4 Official Kurikulum Merdeka Document Guidelines:
 * - Paper: A4 (210mm x 297mm)
 * - Visual Gold Standard Margins: Top 18mm, Bottom 18mm, Left 18mm, Right 18mm
 * - Printable Content Area: 174mm x 261mm
 * - Main Font: Arial, Helvetica, sans-serif
 * - Base Font Size: 12pt (with calibrated hierarchy for official report sections)
 * - Line Spacing: 1.5 (360 in twip for DOCX)
 * - Text Colors: #0F172A / #000000 for high-contrast official printability
 */

export const REPORT_DOCUMENT_CONFIG = {
  paper: {
    format: 'a4' as const,
    widthMm: 210,
    heightMm: 297,
    orientation: 'portrait' as const,
  },
  margins: {
    topMm: 18,
    bottomMm: 18,
    leftMm: 18,
    rightMm: 18,
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    primaryFont: 'Arial',
    baseSizePt: 12,
    lineSpacing: 1.5,
    lineSpacingTwip: 360, // 240 * 1.5 = 360 twips in docx
  },
  colors: {
    primaryText: '#0F172A',
    secondaryText: '#334155',
    mutedText: '#64748B',
    lightText: '#94A3B8',
    borderColor: '#E2E8F0',
    headerBg: '#F1F5F9',
    emeraldBg: '#F0FDF4',
    emeraldBorder: '#BBF7D0',
    emeraldText: '#14532D',
    emeraldPrimary: '#059669',
    amberBg: '#FFFBEB',
    amberBorder: '#FDE68A',
    amberText: '#78350F',
    amberPrimary: '#D97706',
    indigoBg: '#EEF2FF',
    indigoBorder: '#C7D2FE',
    indigoText: '#312E81',
    indigoPrimary: '#4F46E5',
    purpleBg: '#FAF5FF',
    purpleBorder: '#E9D5FF',
    purpleText: '#581C87',
  },
} as const;

/**
 * Returns printable content width in millimeters
 */
export function getPrintableContentWidthMm(): number {
  return (
    REPORT_DOCUMENT_CONFIG.paper.widthMm -
    REPORT_DOCUMENT_CONFIG.margins.leftMm -
    REPORT_DOCUMENT_CONFIG.margins.rightMm
  ); // 210 - 18 - 18 = 174 mm
}

/**
 * Returns printable content height in millimeters
 */
export function getPrintableContentHeightMm(): number {
  return (
    REPORT_DOCUMENT_CONFIG.paper.heightMm -
    REPORT_DOCUMENT_CONFIG.margins.topMm -
    REPORT_DOCUMENT_CONFIG.margins.bottomMm
  ); // 297 - 18 - 18 = 261 mm
}
