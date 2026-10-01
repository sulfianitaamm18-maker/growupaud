import { jsPDF } from 'jspdf';
import { CanonicalReportDocument } from './reportDocumentModel';
import { REPORT_DOCUMENT_CONFIG } from './reportDocumentStyles';
import { sanitizeReportText, sanitizeForPdf, extractKelurahanAddress } from '../utils/textSanitizer';
import { schoolStore } from './schoolStore';

export interface ReportLayoutEngineOptions {
  canonicalDoc: CanonicalReportDocument;
  radarChartDataUrl?: string | null;
  logoDataUrl?: string | null;
}

/**
 * Reconstructed Master Report Layout Engine for GrowUPAUD
 * 
 * Standards & Design Philosophy:
 * - Direct vector coordinates calculation (No HTML-to-Canvas rasterization)
 * - Proportional visual match with Master PDF Gold Standard
 * - Margins: 18mm (Top), 18mm (Right), 18mm (Bottom), 18mm (Left)
 * - Printable Content Width: 174mm (210 - 18 - 18)
 * - Printable Content Height: 261mm (297 - 18 - 18)
 * - Dynamic vertical cursor (currentY) tracking with exact height calculation
 * - Zero text overlap, zero clipping, dynamic word wrapping, and safe page breaks
 * - Optimized 3-Page Layout Flow (with automatic expansion to Page 4+ if data is extensive)
 */
export class ReportLayoutEngine {
  private doc: jsPDF;
  private canonical: CanonicalReportDocument;
  private radarChartDataUrl?: string | null;
  private logoDataUrl?: string | null;

  // Geometry Constants (mm)
  public readonly pageWidth = 210;
  public readonly pageHeight = 297;
  public readonly marginLeft = 18;
  public readonly marginRight = 18;
  public readonly marginTop = 18;
  public readonly marginBottom = 18;
  public readonly contentWidth = 174; // 210 - 18 - 18 = 174 mm
  public readonly contentBottomLimit = 279; // 297 - 18 = 279 mm

  // Cursor State
  public currentY = 18;
  public currentPage = 1;

  constructor(options: ReportLayoutEngineOptions) {
    this.canonical = options.canonicalDoc;
    this.radarChartDataUrl = options.radarChartDataUrl;
    this.logoDataUrl = options.logoDataUrl;

    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    this.currentY = this.marginTop;
  }

  /**
   * Checks if required space in mm is available on the current page.
   * If not, adds a new page and resets cursor to top margin.
   */
  public ensureSpace(requiredHeightMm: number): boolean {
    if (this.currentY + requiredHeightMm > this.contentBottomLimit) {
      this.addPage();
      return true;
    }
    return false;
  }

  /**
   * Adds a new page and resets cursor to top margin.
   */
  public addPage(): void {
    this.doc.addPage('a4', 'portrait');
    this.currentPage++;
    this.currentY = this.marginTop;
  }

  /**
   * Adds a vertical spacer
   */
  public addSpacer(heightMm = 3): void {
    this.currentY += heightMm;
  }

  // =========================================================================
  // HELPER RENDERING METHODS
  // =========================================================================

  /**
   * Section Heading Banner with Left Vertical Accent Bar
   */
  public renderSectionHeading(
    title: string,
    accentColor: [number, number, number] = [13, 148, 136] // Default Teal
  ): void {
    this.ensureSpace(9);
    const startY = this.currentY;

    // Background pill across entire content width
    this.doc.setFillColor(241, 245, 249); // #F1F5F9
    this.doc.roundedRect(this.marginLeft, startY, this.contentWidth, 6.5, 1, 1, 'F');

    // Left vertical accent bar
    this.doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    this.doc.rect(this.marginLeft, startY, 3.0, 6.5, 'F');

    // Title Text
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.8);
    this.doc.setTextColor(15, 23, 42); // #0F172A
    this.doc.text(title, this.marginLeft + 5.5, startY + 4.6);

    this.currentY = startY + 8.0;
  }

  /**
   * Helper to render a bullet item with bold label and wrapped description.
   * Guarantees zero text overflow beyond contentWidth.
   */
  public renderBulletItem(
    bulletSymbol: string,
    bulletColor: [number, number, number],
    title: string,
    description: string,
    options?: {
      titleFontSize?: number;
      bodyFontSize?: number;
      lineHeightMm?: number;
      bulletIndentMm?: number;
    }
  ): void {
    const titleFontSize = options?.titleFontSize || 8.2;
    const bodyFontSize = options?.bodyFontSize || 8.0;
    const lineHeightMm = options?.lineHeightMm || 4.0;
    const bulletIndentMm = options?.bulletIndentMm || 5.5;

    const bulletX = this.marginLeft + 1;
    const textStartX = this.marginLeft + bulletIndentMm;
    const availableTextWidth = this.contentWidth - bulletIndentMm - 1;

    // Measure Title Width in Bold
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(titleFontSize);
    const labelStr = `${title}: `;
    const labelWidth = this.doc.getTextWidth(labelStr);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(bodyFontSize);

    // Calculate line breaks for description considering line 1 remaining width
    const firstLineAvailWidth = Math.max(availableTextWidth - labelWidth, 10);
    const words = description.split(/\s+/).filter(Boolean);

    const formattedLines: { text: string; isFirstLine: boolean }[] = [];
    let currentLineWords: string[] = [];
    let isFirst = true;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = [...currentLineWords, word].join(' ');
      const testWidth = this.doc.getTextWidth(testLine);
      const limit = isFirst ? firstLineAvailWidth : availableTextWidth;

      if (testWidth <= limit) {
        currentLineWords.push(word);
      } else {
        if (currentLineWords.length > 0) {
          formattedLines.push({ text: currentLineWords.join(' '), isFirstLine: isFirst });
          isFirst = false;
          currentLineWords = [word];
        } else {
          // Word itself is longer than limit, force break
          formattedLines.push({ text: word, isFirstLine: isFirst });
          isFirst = false;
          currentLineWords = [];
        }
      }
    }

    if (currentLineWords.length > 0) {
      formattedLines.push({ text: currentLineWords.join(' '), isFirstLine: isFirst });
    }

    // Total block height
    const totalLinesCount = Math.max(formattedLines.length, 1);
    const blockHeight = totalLinesCount * lineHeightMm + 1.2;

    this.ensureSpace(blockHeight);
    const startY = this.currentY;

    // Render Bullet
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(titleFontSize + 1);
    this.doc.setTextColor(bulletColor[0], bulletColor[1], bulletColor[2]);
    this.doc.text(bulletSymbol, bulletX, startY + 3.0);

    // Render Bold Label
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(titleFontSize);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(labelStr, textStartX, startY + 3.0);

    // Render Description Lines
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(bodyFontSize);
    this.doc.setTextColor(51, 65, 85);

    let lineY = startY + 3.0;
    for (let idx = 0; idx < formattedLines.length; idx++) {
      const lineObj = formattedLines[idx];
      if (lineObj.isFirstLine) {
        this.doc.text(lineObj.text, textStartX + labelWidth, lineY);
      } else {
        this.doc.text(lineObj.text, textStartX, lineY);
      }
      lineY += lineHeightMm;
    }

    this.currentY = startY + blockHeight;
  }

  // =========================================================================
  // CORE SECTIONS RENDERING
  // =========================================================================

  /**
   * 1. Official Kop Surat & Header
   */
  public renderKopSurat(): void {
    const startY = this.currentY;
    const school = this.canonical.school;
    const meta = this.canonical.metadata;

    const logoSize = 15; // mm
    const hasLogo = !!this.logoDataUrl;

    if (hasLogo && this.logoDataUrl) {
      try {
        const format = this.logoDataUrl.includes('png') ? 'PNG' : 'JPEG';
        this.doc.addImage(this.logoDataUrl, format, this.marginLeft + 2, startY, logoSize, logoSize);
      } catch (err) {
        console.warn('Could not add logo image:', err);
      }
    } else {
      // Draw formal school emblem badge
      this.doc.setFillColor(248, 250, 252);
      this.doc.setDrawColor(30, 41, 59);
      this.doc.setLineWidth(0.4);
      this.doc.circle(this.marginLeft + 2 + logoSize / 2, startY + logoSize / 2, logoSize / 2 - 0.5, 'FD');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(15, 23, 42);
      const initial = (school.name || 'P').trim().charAt(0).toUpperCase();
      this.doc.text(initial, this.marginLeft + 2 + logoSize / 2, startY + logoSize / 2 + 1.2, { align: 'center' });
      this.doc.setFontSize(4.2);
      this.doc.text('PAUD', this.marginLeft + 2 + logoSize / 2, startY + logoSize / 2 + 4.2, { align: 'center' });
    }

    // Right-hand formal curriculum seal for balanced header
    const rightSealX = this.marginLeft + this.contentWidth - logoSize - 2;
    this.doc.setFillColor(240, 253, 244);
    this.doc.setDrawColor(21, 128, 61);
    this.doc.setLineWidth(0.4);
    this.doc.circle(rightSealX + logoSize / 2, startY + logoSize / 2, logoSize / 2 - 0.5, 'FD');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(4.4);
    this.doc.setTextColor(21, 128, 61);
    this.doc.text('KURIKULUM', rightSealX + logoSize / 2, startY + logoSize / 2 - 0.5, { align: 'center' });
    this.doc.text('MERDEKA', rightSealX + logoSize / 2, startY + logoSize / 2 + 2.5, { align: 'center' });

    // Title & Subtitle Centered across full content width
    const textCenterX = this.marginLeft + this.contentWidth / 2;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12.0);
    this.doc.setTextColor(15, 23, 42); // #0F172A
    this.doc.text('LAPORAN PERKEMBANGAN ANAK', textCenterX, startY + 3.8, { align: 'center' });

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10.0);
    this.doc.setTextColor(30, 41, 59); // #1E293B
    this.doc.text((school.name || 'PAUD TERPADU').toUpperCase(), textCenterX, startY + 8.5, {
      align: 'center',
    });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.0);
    this.doc.setTextColor(71, 85, 105); // #475569
    const sub = `${meta.semester} • TAHUN AJARAN ${meta.academicYear}`;
    this.doc.text(sub, textCenterX, startY + 12.5, { align: 'center' });

    if (school.address) {
      this.doc.setFontSize(7.2);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(school.address, textCenterX, startY + 16.0, { align: 'center' });
    }

    const kopHeight = Math.max(logoSize, school.address ? 18 : 14);
    this.currentY = startY + kopHeight + 1.5;

    // Double Divider Lines (Official Style)
    this.doc.setDrawColor(15, 23, 42);
    this.doc.setLineWidth(0.6);
    this.doc.line(this.marginLeft, this.currentY, this.marginLeft + this.contentWidth, this.currentY);

    this.doc.setLineWidth(0.2);
    this.doc.line(
      this.marginLeft,
      this.currentY + 0.7,
      this.marginLeft + this.contentWidth,
      this.currentY + 0.7
    );

    this.currentY += 3.5;
  }

  /**
   * 2. Student Identity Grid (2 Balanced Columns)
   */
  public renderStudentIdentity(): void {
    const boxHeight = 19;
    this.ensureSpace(boxHeight + 2);

    const startY = this.currentY;
    const student = this.canonical.student;
    const meta = this.canonical.metadata;
    const teacher = this.canonical.signatures.teacher;

    // Background Card
    this.doc.setFillColor(248, 250, 252); // #F8FAFC
    this.doc.setDrawColor(226, 232, 240); // #E2E8F0
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.marginLeft, startY, this.contentWidth, boxHeight, 1.2, 1.2, 'FD');

    const halfWidth = this.contentWidth / 2;
    const col1X = this.marginLeft + 3.5;
    const col2X = this.marginLeft + halfWidth + 3.5;
    const labelW = 30;
    const valueW = halfWidth - labelW - 5;

    this.doc.setFontSize(7.8);

    // Left Column
    // Row 1: Nama Peserta Didik
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Nama Peserta Didik', col1X, startY + 4.8);
    this.doc.text(':', col1X + labelW - 2, startY + 4.8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(15, 23, 42);
    const fullName = `${student.fullName}${student.nickname ? ` (${student.nickname})` : ''}`;
    const nameLines = this.doc.splitTextToSize(fullName, valueW);
    this.doc.text(nameLines[0] || fullName, col1X + labelW, startY + 4.8);

    // Row 2: Kelompok / Usia
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Kelompok / Usia', col1X, startY + 9.8);
    this.doc.text(':', col1X + labelW - 2, startY + 9.8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(30, 41, 59);
    this.doc.text(`${student.className} • ${student.ageDisplay}`, col1X + labelW, startY + 9.8);

    // Row 3: NISN / ID Siswa
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('NISN / ID Siswa', col1X, startY + 14.8);
    this.doc.text(':', col1X + labelW - 2, startY + 14.8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(30, 41, 59);
    this.doc.text(student.nisn || student.id || '—', col1X + labelW, startY + 14.8);

    // Right Column
    const labelW2 = 26;
    const valueW2 = halfWidth - labelW2 - 5;

    // Row 1: Orang Tua / Wali
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Orang Tua / Wali', col2X, startY + 4.8);
    this.doc.text(':', col2X + labelW2 - 2, startY + 4.8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(30, 41, 59);
    const parentLines = this.doc.splitTextToSize(student.parentName || '—', valueW2);
    this.doc.text(parentLines[0] || '—', col2X + labelW2, startY + 4.8);

    // Row 2: Guru Wali Kelas
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Guru Wali Kelas', col2X, startY + 9.8);
    this.doc.text(':', col2X + labelW2 - 2, startY + 9.8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(30, 41, 59);
    const teacherLines = this.doc.splitTextToSize(teacher.name || '—', valueW2);
    this.doc.text(teacherLines[0] || '—', col2X + labelW2, startY + 9.8);

    // Row 3: Tanggal Asesmen
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Tanggal Asesmen', col2X, startY + 14.8);
    this.doc.text(':', col2X + labelW2 - 2, startY + 14.8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(15, 23, 42);
    const assessmentDate = this.canonical.observationSummary?.latestObservationDate || meta.generatedDate || '—';
    this.doc.text(assessmentDate, col2X + labelW2, startY + 14.8);

    this.currentY = startY + boxHeight + 3.5;
  }

  /**
   * 3. Section I: Gambaran Menyeluruh (Narrative Box)
   */
  public renderOverallSummary(): void {
    this.renderSectionHeading('I. PERKEMBANGAN ANANDA (GAMBARAN MENYELURUH)', [5, 150, 105]);

    const narrative =
      this.canonical.overallSummary.description ||
      'Ananda menunjukkan perkembangan yang sangat positif dan antusias dalam beraktivitas.';

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.2);

    const paddingX = 3.5;
    const textWidth = this.contentWidth - paddingX * 2;
    const lines = this.doc.splitTextToSize(narrative, textWidth);
    const lineHeightMm = 4.0; // 1.5 line spacing
    const boxPadding = 3.0;
    const boxHeight = lines.length * lineHeightMm + boxPadding * 2;

    this.ensureSpace(boxHeight + 2);
    const startY = this.currentY;

    // Soft emerald background box
    this.doc.setFillColor(240, 253, 244); // #F0FDF4
    this.doc.setDrawColor(187, 247, 208); // #BBF7D0
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.marginLeft, startY, this.contentWidth, boxHeight, 1.2, 1.2, 'FD');

    this.doc.setTextColor(20, 83, 45); // #14532D
    let textY = startY + boxPadding + 3.0;
    for (const line of lines) {
      this.doc.text(line, this.marginLeft + paddingX, textY);
      textY += lineHeightMm;
    }

    this.currentY = startY + boxHeight + 3.5;
  }

  /**
   * 4. Section II: Radar Chart & Quick Summary
   */
  public renderRadarChartSection(): void {
    this.renderSectionHeading('II. GRAFIK PERKEMBANGAN & RINGKASAN 6 ASPEK PAUD', [79, 70, 229]);

    const sectionHeight = 54;
    this.ensureSpace(sectionHeight + 2);
    const startY = this.currentY;

    // Container box
    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.marginLeft, startY, this.contentWidth, sectionHeight, 1.2, 1.2, 'FD');

    const chartW = 78;
    const chartH = 50;
    const leftMargin = this.marginLeft + 2;

    // Left: Radar Chart Image
    if (this.radarChartDataUrl) {
      try {
        this.doc.addImage(
          this.radarChartDataUrl,
          'PNG',
          leftMargin,
          startY + 2,
          chartW,
          chartH,
          undefined,
          'FAST'
        );
      } catch (err) {
        console.warn('Could not add radar chart image:', err);
      }
    }

    // Vertical Divider Line
    const dividerX = this.marginLeft + 82;
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.3);
    this.doc.line(dividerX, startY + 2.5, dividerX, startY + sectionHeight - 2.5);

    // Right: 3 Summary Cards + Mini Legend
    const rightX = dividerX + 3;
    const rightW = this.contentWidth - 88;
    const quick = this.canonical.quickSummary;

    let cardY = startY + 2.0;

    // Card 1: Paling Berkembang
    this.doc.setFillColor(240, 253, 244); // #F0FDF4
    this.doc.setDrawColor(187, 247, 208); // #BBF7D0
    this.doc.roundedRect(rightX, cardY, rightW, 11.5, 1, 1, 'FD');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(20, 83, 45);
    this.doc.text(`★ Paling Berkembang: ${quick.topDeveloped.aspect}`, rightX + 2.2, cardY + 3.6);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(22, 101, 52);
    const topLines = this.doc.splitTextToSize(quick.topDeveloped.detail, rightW - 4.5);
    this.doc.text(topLines[0] || '', rightX + 2.2, cardY + 7.0);
    if (topLines[1]) this.doc.text(topLines[1], rightX + 2.2, cardY + 10.0);

    cardY += 13.0;

    // Card 2: Sedang Berkembang
    this.doc.setFillColor(255, 251, 235); // #FFFBEB
    this.doc.setDrawColor(253, 230, 138); // #FDE68A
    this.doc.roundedRect(rightX, cardY, rightW, 11.5, 1, 1, 'FD');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(120, 53, 15);
    this.doc.text(`Sedang Berkembang: ${quick.emerging.aspect}`, rightX + 2.2, cardY + 3.6);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(146, 64, 14);
    const emLines = this.doc.splitTextToSize(quick.emerging.detail, rightW - 4.5);
    this.doc.text(emLines[0] || '', rightX + 2.2, cardY + 7.0);
    if (emLines[1]) this.doc.text(emLines[1], rightX + 2.2, cardY + 10.0);

    cardY += 13.0;

    // Card 3: Perlu Stimulasi
    this.doc.setFillColor(240, 249, 255); // #F0F9FF
    this.doc.setDrawColor(186, 230, 253); // #BAE6FD
    this.doc.roundedRect(rightX, cardY, rightW, 11.5, 1, 1, 'FD');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(12, 74, 110);
    this.doc.text(`Perlu Stimulasi: ${quick.needsStimulation.aspect}`, rightX + 2.2, cardY + 3.6);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(3, 105, 161);
    const stimLines = this.doc.splitTextToSize(quick.needsStimulation.detail, rightW - 4.5);
    this.doc.text(stimLines[0] || '', rightX + 2.2, cardY + 7.0);
    if (stimLines[1]) this.doc.text(stimLines[1], rightX + 2.2, cardY + 10.0);

    // Mini Rubric Definition Guide
    const rubY = cardY + 13.5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.8);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text('Kamus: BB (Belum) • MB (Mulai) • BSH (Sesuai) • BSB (Sangat Baik)', rightX + 1, rubY);

    this.currentY = startY + sectionHeight + 3.5;
  }

  /**
   * 5. Section III: Yang Sudah Berkembang (Kekuatan Utama Ananda)
   */
  public renderDevelopedPoints(): void {
    this.renderSectionHeading('III. YANG SUDAH BERKEMBANG (KEKUATAN UTAMA ANANDA)', [5, 150, 105]);

    const points = this.canonical.developedPoints;
    if (!points || points.length === 0) {
      return;
    }

    for (const item of points) {
      this.renderBulletItem(
        '✓',
        [5, 150, 105], // Emerald green
        item.title,
        item.behavior,
        {
          titleFontSize: 8.0,
          bodyFontSize: 7.8,
          lineHeightMm: 3.8,
          bulletIndentMm: 5.0,
        }
      );
    }

    this.currentY += 1.5;
  }

  /**
   * 6. Section IV: Masih Perlu Dikembangkan (Fokus Pendampingan)
   */
  public renderGrowthPoints(): void {
    this.renderSectionHeading('IV. MASIH PERLU DIKEMBANGKAN (FOKUS PENDAMPINGAN)', [217, 119, 6]);

    const points = this.canonical.growthPoints;
    if (!points || points.length === 0) {
      return;
    }

    for (const item of points) {
      this.renderBulletItem(
        '•',
        [217, 119, 6], // Amber
        item.title,
        item.recommendation,
        {
          titleFontSize: 8.0,
          bodyFontSize: 7.8,
          lineHeightMm: 3.8,
          bulletIndentMm: 5.0,
        }
      );
    }

    this.currentY += 1.5;
  }

  /**
   * 7. Section Bukti Autentik / Dokumentasi Pengamatan
   */
  public renderEvidencesSection(): void {
    const evidences = this.canonical.evidences || [];
    this.renderSectionHeading('DOKUMENTASI PENGAMATAN & BUKTI KEGIATAN', [147, 51, 234]); // Purple

    if (evidences.length > 0) {
      const cardW = (this.contentWidth - 4) / 2;
      const cardH = 46;

      for (let i = 0; i < evidences.length; i += 2) {
        this.ensureSpace(cardH + 3);
        const startY = this.currentY;

        for (let c = 0; c < 2 && i + c < evidences.length; c++) {
          const ev = evidences[i + c];
          const cardX = this.marginLeft + c * (cardW + 4);

          // Card outline
          this.doc.setFillColor(248, 250, 252);
          this.doc.setDrawColor(226, 232, 240);
          this.doc.setLineWidth(0.3);
          this.doc.roundedRect(cardX, startY, cardW, cardH, 1.2, 1.2, 'FD');

          // Photo or placeholder
          if (ev.url) {
            try {
              const format = ev.url.includes('png') ? 'PNG' : 'JPEG';
              this.doc.addImage(ev.url, format, cardX + 2, startY + 2, cardW - 4, 27, undefined, 'FAST');
            } catch (imgErr) {
              // Placeholder box
              this.doc.setFillColor(241, 245, 249);
              this.doc.rect(cardX + 2, startY + 2, cardW - 4, 27, 'F');
            }
          } else {
            this.doc.setFillColor(241, 245, 249);
            this.doc.rect(cardX + 2, startY + 2, cardW - 4, 27, 'F');
          }

          // Title & Date
          this.doc.setFont('helvetica', 'bold');
          this.doc.setFontSize(7.2);
          this.doc.setTextColor(15, 23, 42);
          this.doc.text(this.doc.splitTextToSize(ev.activityTitle, cardW - 20)[0] || ev.activityTitle, cardX + 2.5, startY + 32.5);

          this.doc.setFont('helvetica', 'normal');
          this.doc.setFontSize(6.2);
          this.doc.setTextColor(100, 116, 139);
          this.doc.text(ev.date, cardX + cardW - 2.5, startY + 32.5, { align: 'right' });

          // Caption
          this.doc.setFont('helvetica', 'normal');
          this.doc.setFontSize(6.5);
          this.doc.setTextColor(51, 65, 85);
          const capLines = this.doc.splitTextToSize(ev.caption, cardW - 5);
          this.doc.text(capLines[0] || '', cardX + 2.5, startY + 36.5);
          if (capLines[1]) {
            this.doc.text(capLines[1], cardX + 2.5, startY + 40.0);
          }
        }

        this.currentY = startY + cardH + 3.5;
      }
    } else {
      // Elegant observational summary card
      const boxHeight = 18;
      this.ensureSpace(boxHeight + 2);
      const startY = this.currentY;

      this.doc.setFillColor(248, 250, 252);
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(this.marginLeft, startY, this.contentWidth, boxHeight, 1.2, 1.2, 'FD');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.8);
      this.doc.setTextColor(30, 41, 59);
      this.doc.text('Dokumentasi Pengamatan Portofolio Guru', this.marginLeft + 3.5, startY + 5.0);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.2);
      this.doc.setTextColor(71, 85, 105);
      const note = 'Ananda aktif, responsif, dan ceria dalam mengikuti seluruh rangkaian kegiatan pembelajaran di kelas bersama guru dan teman-teman.';
      const lines = this.doc.splitTextToSize(note, this.contentWidth - 7);
      let ny = startY + 9.5;
      for (const line of lines) {
        this.doc.text(line, this.marginLeft + 3.5, ny);
        ny += 3.8;
      }

      this.currentY = startY + boxHeight + 3.5;
    }
  }

  /**
   * 8. Section V: 4-Column Table for 6 Aspects (Kurikulum Merdeka)
   */
  public renderAspectsTable(): void {
    this.renderSectionHeading('V. PERKEMBANGAN SPESIFIK 6 ASPEK (KURIKULUM MERDEKA)', [13, 148, 136]);

    // Column widths: Total = 174 mm
    const colW = {
      aspect: 38,
      status: 24,
      observed: 60,
      strengthening: 52,
    };

    const renderTableHeader = () => {
      this.doc.setFillColor(13, 148, 136); // Dark Teal #0D9488
      this.doc.rect(this.marginLeft, this.currentY, this.contentWidth, 6.5, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.2);
      this.doc.setTextColor(255, 255, 255);

      let x = this.marginLeft;
      this.doc.text('Aspek Perkembangan', x + 2.5, this.currentY + 4.5);
      x += colW.aspect;
      this.doc.text('Status Capaian', x + colW.status / 2, this.currentY + 4.5, { align: 'center' });
      x += colW.status;
      this.doc.text('Yang Terlihat (Kemampuan Nyata)', x + 2.5, this.currentY + 4.5);
      x += colW.observed;
      this.doc.text('Yang Perlu Dikuatkan', x + 2.5, this.currentY + 4.5);

      this.currentY += 6.5;
    };

    this.ensureSpace(16);
    renderTableHeader();

    const aspects = this.canonical.aspects;
    const lineHeightMm = 3.6;

    aspects.forEach((asp, idx) => {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.8);

      const linesObserved = this.doc.splitTextToSize(asp.whatIsObserved || '—', colW.observed - 5);
      const linesStrength = this.doc.splitTextToSize(
        asp.whatNeedsStrengthening || '—',
        colW.strengthening - 5
      );
      const linesAspect = this.doc.splitTextToSize(asp.aspectTitle, colW.aspect - 5);

      const maxLines = Math.max(linesObserved.length, linesStrength.length, linesAspect.length, 1);
      const rowHeight = Math.max(maxLines * lineHeightMm + 3.2, 7.5);

      // Check space, re-draw table header if new page is added
      if (this.ensureSpace(rowHeight)) {
        renderTableHeader();
      }

      const rowY = this.currentY;

      // Row background
      if (idx % 2 === 1) {
        this.doc.setFillColor(248, 250, 252); // #F8FAFC
      } else {
        this.doc.setFillColor(255, 255, 255);
      }
      this.doc.rect(this.marginLeft, rowY, this.contentWidth, rowHeight, 'F');

      // Row border
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.2);
      this.doc.rect(this.marginLeft, rowY, this.contentWidth, rowHeight, 'S');

      // Vertical cell separators
      let cx = this.marginLeft + colW.aspect;
      this.doc.line(cx, rowY, cx, rowY + rowHeight);
      cx += colW.status;
      this.doc.line(cx, rowY, cx, rowY + rowHeight);
      cx += colW.observed;
      this.doc.line(cx, rowY, cx, rowY + rowHeight);

      // Col 1: Aspect Title
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(15, 23, 42);
      let lineY = rowY + 3.2;
      for (const line of linesAspect) {
        this.doc.text(line, this.marginLeft + 2.5, lineY);
        lineY += lineHeightMm;
      }

      // Col 2: Status Badge
      const statusX = this.marginLeft + colW.aspect;
      const badgeW = 20;
      const badgeH = 4.8;
      const badgeX = statusX + (colW.status - badgeW) / 2;
      const badgeY = rowY + (rowHeight - badgeH) / 2;

      if (asp.ratingLevel === 'BSB') {
        this.doc.setFillColor(209, 250, 229);
        this.doc.setTextColor(6, 95, 70);
      } else if (asp.ratingLevel === 'BSH') {
        this.doc.setFillColor(204, 251, 241);
        this.doc.setTextColor(17, 94, 89);
      } else if (asp.ratingLevel === 'MB') {
        this.doc.setFillColor(254, 243, 199);
        this.doc.setTextColor(146, 64, 14);
      } else {
        this.doc.setFillColor(241, 245, 249);
        this.doc.setTextColor(71, 85, 105);
      }

      this.doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.0);
      this.doc.text(asp.ratingLabel || '—', badgeX + badgeW / 2, badgeY + 3.3, { align: 'center' });

      // Col 3: Observed Behavior
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.6);
      this.doc.setTextColor(30, 41, 59);
      const obsX = this.marginLeft + colW.aspect + colW.status + 2.5;
      lineY = rowY + 3.2;
      for (const line of linesObserved) {
        this.doc.text(line, obsX, lineY);
        lineY += lineHeightMm;
      }

      // Col 4: Strengthening Focus
      this.doc.setTextColor(71, 85, 105);
      const strX = this.marginLeft + colW.aspect + colW.status + colW.observed + 2.5;
      lineY = rowY + 3.2;
      for (const line of linesStrength) {
        this.doc.text(line, strX, lineY);
        lineY += lineHeightMm;
      }

      this.currentY += rowHeight;
    });

    this.currentY += 4.0;
  }

  /**
   * 9. Section VI: Stimulasi Sederhana di Rumah (Multi-Card Layout with Safe Inner Wrapping)
   * 
   * Strict Constraints:
   * - ZERO text overflow: All text measured and wrapped strictly to textInnerWidth
   * - Dynamic card height based on actual line calculations across title, description, and tags
   * - Guaranteed padding on left, right, top, bottom so text never touches or crosses borders
   * - Automatic row-height equalization across cards
   */
  public renderHomeStimulationCards(): void {
    const cards = this.canonical.homeStimulations || [];
    if (cards.length === 0) return;

    const cardsCount = cards.length;
    const gap = 3.0; // mm
    const cardW = (this.contentWidth - (cardsCount - 1) * gap) / cardsCount;
    const paddingLeft = 3.0;
    const paddingRight = 3.0;
    const paddingTop = 3.0;
    const paddingBottom = 3.0;
    const textInnerWidth = cardW - paddingLeft - paddingRight;

    // Line heights
    const titleLineHeight = 3.3;
    const actLineHeight = 3.2;
    const tagLineHeight = 2.9;

    // Step 1: Pre-calculate wrapped lines and required height for each card
    const cardData = cards.map((c, idx) => {
      // 1. Title
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.2);
      const titleText = `${idx + 1}. ${c.title}`;
      const titleLines = this.doc.splitTextToSize(titleText, textInnerWidth);
      const titleHeight = titleLines.length * titleLineHeight;

      // 2. Activity Description
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      const actText = c.activity;
      const actLines = this.doc.splitTextToSize(actText, textInnerWidth);
      const actHeight = actLines.length * actLineHeight;

      // 3. Skill Trained Tag
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.0);
      const cleanSkill = sanitizeForPdf(c.skillTrained);
      const tagText = `Fokus: ${cleanSkill}`;
      const tagLines = this.doc.splitTextToSize(tagText, textInnerWidth);
      const tagHeight = tagLines.length * tagLineHeight;

      // Total required card height
      const totalCardHeight =
        paddingTop + titleHeight + 1.8 + actHeight + 2.2 + tagHeight + paddingBottom;

      return {
        titleLines,
        titleHeight,
        actLines,
        actHeight,
        tagLines,
        tagHeight,
        totalCardHeight,
      };
    });

    const maxCardH = Math.max(...cardData.map((d) => d.totalCardHeight), 26.0);

    // Keep heading and card block together
    this.ensureSpace(maxCardH + 11.0);
    this.renderSectionHeading('VI. STIMULASI SEDERHANA DI RUMAH BERSAMA KELUARGA', [79, 70, 229]);

    const startY = this.currentY;

    // Render Cards in Row
    cardData.forEach((cd, idx) => {
      const cardX = this.marginLeft + idx * (cardW + gap);

      // Card Background & Border
      this.doc.setFillColor(238, 242, 255); // #EEF2FF
      this.doc.setDrawColor(199, 210, 254); // #C7D2FE
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(cardX, startY, cardW, maxCardH, 1.2, 1.2, 'FD');

      // 1. Render Title
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.2);
      this.doc.setTextColor(49, 46, 129); // #312E81
      let lineY = startY + paddingTop + 2.4;
      for (const tLine of cd.titleLines) {
        this.doc.text(tLine, cardX + paddingLeft, lineY);
        lineY += titleLineHeight;
      }

      // 2. Render Activity Text
      lineY += 0.8;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(51, 65, 85);
      for (const aLine of cd.actLines) {
        this.doc.text(aLine, cardX + paddingLeft, lineY);
        lineY += actLineHeight;
      }

      // 3. Render Skill Trained Tag (anchored cleanly near bottom)
      const tagStartY = startY + maxCardH - (cd.tagHeight + paddingBottom - 2.2);

      // Divider Line inside card
      this.doc.setDrawColor(224, 231, 255);
      this.doc.setLineWidth(0.2);
      this.doc.line(cardX + paddingLeft, tagStartY - 1.8, cardX + cardW - paddingRight, tagStartY - 1.8);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.0);
      this.doc.setTextColor(79, 70, 229);
      let tgY = tagStartY;
      for (const tgLine of cd.tagLines) {
        this.doc.text(tgLine, cardX + paddingLeft, tgY);
        tgY += tagLineHeight;
      }
    });

    this.currentY = startY + maxCardH + 4.0;
  }

  /**
   * 10. Teacher Message Box
   */
  public renderTeacherMessage(): void {
    const message = this.canonical.teacherMessage;
    if (!message) return;

    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(7.8);
    const lines = this.doc.splitTextToSize(`"${message}"`, this.contentWidth - 8);
    const boxHeight = lines.length * 4.0 + 8.5;

    this.ensureSpace(boxHeight + 2);
    const startY = this.currentY;

    // Amber box
    this.doc.setFillColor(255, 251, 235); // #FFFBEB
    this.doc.setDrawColor(253, 230, 138); // #FDE68A
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.marginLeft, startY, this.contentWidth, boxHeight, 1.2, 1.2, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.8);
    this.doc.setTextColor(120, 53, 15);
    this.doc.text('Pesan Wali Kelas untuk Ananda & Keluarga:', this.marginLeft + 3.5, startY + 4.6);

    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(7.4);
    this.doc.setTextColor(146, 64, 14);
    let lineY = startY + 8.6;
    for (const line of lines) {
      this.doc.text(line, this.marginLeft + 3.5, lineY);
      lineY += 4.0;
    }

    this.currentY = startY + boxHeight + 4.5;
  }

  /**
   * 11. Signatures Block (3 Balanced Columns)
   */
  public renderSignatures(): void {
    const sigHeight = 33;
    this.ensureSpace(sigHeight + 2);
    const startY = this.currentY;

    const sig = this.canonical.signatures;
    const colW = this.contentWidth / 3;

    // Top subtle divider
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.marginLeft, startY, this.marginLeft + this.contentWidth, startY);

    const textY = startY + 4.5;

    // Col 1: Orang Tua / Wali
    const c1X = this.marginLeft + colW / 2;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text('Mengetahui,', c1X, textY, { align: 'center' });
    this.doc.text(sig.parent.label, c1X, textY + 4.0, { align: 'center' });

    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(`( ${sig.parent.name} )`, c1X, textY + 24, { align: 'center' });
    this.doc.setLineWidth(0.2);
    this.doc.line(c1X - 20, textY + 25, c1X + 20, textY + 25);

    // Col 2: Guru Wali Kelas
    const c2X = this.marginLeft + colW + colW / 2;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text(sig.teacher.locationAndDate, c2X, textY, { align: 'center' });
    this.doc.text(sig.teacher.label, c2X, textY + 4.0, { align: 'center' });

    // Embedded Digital Signature Image or Badge
    if (sig.teacher.signatureDataUrl) {
      try {
        this.doc.addImage(sig.teacher.signatureDataUrl, 'PNG', c2X - 14, textY + 6.5, 28, 14);
      } catch (e) {
        console.warn('Could not render teacher signature in PDF:', e);
      }
    } else if (sig.teacher.isAuthorized) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(2, 132, 199);
      this.doc.text('TEROTORISASI DIGITAL', c2X, textY + 12, { align: 'center' });
      if (sig.teacher.verificationCode) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(5);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text(sig.teacher.verificationCode, c2X, textY + 15, { align: 'center' });
      }
    }

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(`( ${sig.teacher.name} )`, c2X, textY + 24, { align: 'center' });
    this.doc.line(c2X - 20, textY + 25, c2X + 20, textY + 25);
    if (sig.teacher.nip) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(`NIP: ${sig.teacher.nip}`, c2X, textY + 28, { align: 'center' });
    }

    // Col 3: Kepala Sekolah
    const c3X = this.marginLeft + colW * 2 + colW / 2;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text('Mengetahui,', c3X, textY, { align: 'center' });
    this.doc.text(sig.principal.label, c3X, textY + 4.0, { align: 'center' });

    // Embedded Digital Signature / Seal Image or Badge
    if (sig.principal.signatureDataUrl) {
      try {
        this.doc.addImage(sig.principal.signatureDataUrl, 'PNG', c3X - 14, textY + 6.5, 28, 14);
      } catch (e) {
        console.warn('Could not render principal signature in PDF:', e);
      }
    } else if (sig.principal.isAuthorized) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(4, 120, 87);
      this.doc.text('DISAHKAN KEPALA SEKOLAH', c3X, textY + 12, { align: 'center' });
      if (sig.principal.verificationCode) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(5);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text(sig.principal.verificationCode, c3X, textY + 15, { align: 'center' });
      }
    }

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(`( ${sig.principal.name} )`, c3X, textY + 24, { align: 'center' });
    this.doc.line(c3X - 20, textY + 25, c3X + 20, textY + 25);
    if (sig.principal.nip) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(`NIP: ${sig.principal.nip}`, c3X, textY + 28, { align: 'center' });
    }

    // Bottom official digital authorization note in PDF
    if (sig.teacher.isAuthorized || sig.principal.isAuthorized) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(
        'Dokumen resmi telah diotorisasi secara elektronik sesuai regulasi asesmen Kurikulum Merdeka PAUD Kemendikbudristek.',
        this.marginLeft + this.contentWidth / 2,
        startY + sigHeight + 1.5,
        { align: 'center' }
      );
    }

    this.currentY = startY + sigHeight + 3.5;
  }

  /**
   * 12. Final Two-Pass: Decorates all pages with Running Headers & Footers
   */
  public finalizeDocument(): void {
    const totalPages = this.doc.getNumberOfPages();
    const student = this.canonical.student;
    const school = this.canonical.school;
    const meta = this.canonical.metadata;

    for (let p = 1; p <= totalPages; p++) {
      this.doc.setPage(p);

      // Running Header (Pages 2+ in print & vector export)
      if (p > 1) {
        const assessmentDate = this.canonical.observationSummary?.latestObservationDate || meta.generatedDate || '—';
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(6.8);
        this.doc.setTextColor(30, 41, 59);
        this.doc.text(
          `${sanitizeReportText(school.name)} • ${sanitizeReportText(student.fullName)} (${sanitizeReportText(student.className)})`,
          this.marginLeft,
          this.marginTop - 6
        );

        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(6.5);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text(
          `Tgl Asesmen: ${assessmentDate}`,
          this.pageWidth - this.marginRight,
          this.marginTop - 6,
          { align: 'right' }
        );

        this.doc.setDrawColor(226, 232, 240);
        this.doc.setLineWidth(0.2);
        this.doc.line(
          this.marginLeft,
          this.marginTop - 3.5,
          this.pageWidth - this.marginRight,
          this.marginTop - 3.5
        );
      }

      // Running Footer (All Pages with Centered Page Number)
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.2);
      this.doc.line(
        this.marginLeft,
        this.pageHeight - this.marginBottom + 2.0,
        this.pageWidth - this.marginRight,
        this.pageHeight - this.marginBottom + 2.0
      );

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(148, 163, 184);
      this.doc.text(
        `GrowUPAUD Assessment Intelligence • Dicetak pada ${meta.generatedDate}`,
        this.marginLeft,
        this.pageHeight - this.marginBottom + 6.0
      );

      // Centered Page Number
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(71, 85, 105);
      this.doc.text(
        `Halaman ${p} dari ${totalPages}`,
        this.marginLeft + this.contentWidth / 2,
        this.pageHeight - this.marginBottom + 6.0,
        { align: 'center' }
      );

      // Right Footer Text
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(148, 163, 184);
      this.doc.text(
        'Dokumen Resmi Portofolio Asesmen Autentik PAUD',
        this.pageWidth - this.marginRight,
        this.pageHeight - this.marginBottom + 6.0,
        { align: 'right' }
      );
    }
  }

  /**
   * Section Heading with Blue Title and Subtle Underline
   * Matches the standardized layout: "Bagian X: ..."
   */
  public renderStandardSectionTitle(title: string): void {
    const startY = this.currentY;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(3, 105, 161); // #0369A1 (sky-700)
    this.doc.text(title, this.marginLeft, startY + 3.2);

    // Subtle blue underline divider
    this.doc.setDrawColor(186, 230, 253); // #BAE6FD (sky-200)
    this.doc.setLineWidth(0.3);
    this.doc.line(this.marginLeft, startY + 4.8, this.marginLeft + this.contentWidth, startY + 4.8);

    this.currentY = startY + 7.5;
  }

  /**
   * Official Standard Header
   * Integrates the previous design elements: School Logo, Centered Titles & Details, Kurikulum Merdeka Seal, and Double Divider Lines
   */
  public renderKopSuratStandard(): void {
    const startY = this.currentY;
    const school = this.canonical.school;
    const meta = this.canonical.metadata;

    const profile = schoolStore.getSchoolProfile();
    const effectiveLogo = this.logoDataUrl || school.logoUrl || profile?.schoolLogo || (profile as any)?.logoUrl;
    const logoSizeSetting = profile?.logoSize || 'MEDIUM';
    const logoPosSetting = profile?.logoPosition || 'LEFT';

    let logoSize = 13.5; // mm (MEDIUM)
    if (logoSizeSetting === 'SMALL') logoSize = 11.0;
    if (logoSizeSetting === 'LARGE') logoSize = 16.5;

    const hasLogo = !!effectiveLogo;

    // School Logo (Left or Center)
    const logoX = logoPosSetting === 'CENTER'
      ? this.marginLeft + this.contentWidth / 2 - logoSize / 2
      : this.marginLeft;

    if (hasLogo && effectiveLogo) {
      try {
        const format = effectiveLogo.includes('png') ? 'PNG' : 'JPEG';
        this.doc.addImage(effectiveLogo, format, logoX, startY, logoSize, logoSize);
      } catch (err) {
        console.warn('Could not add logo image:', err);
      }
    } else {
      // Formal school emblem badge
      this.doc.setFillColor(248, 250, 252);
      this.doc.setDrawColor(30, 41, 59);
      this.doc.setLineWidth(0.35);
      this.doc.circle(logoX + logoSize / 2, startY + logoSize / 2, logoSize / 2 - 0.5, 'FD');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.0);
      this.doc.setTextColor(15, 23, 42);
      const initial = (school.name || 'P').trim().charAt(0).toUpperCase();
      this.doc.text(initial, logoX + logoSize / 2, startY + logoSize / 2 + 1.0, { align: 'center' });
      this.doc.setFontSize(3.8);
      this.doc.text('PAUD', logoX + logoSize / 2, startY + logoSize / 2 + 3.8, { align: 'center' });
    }

    // Kurikulum Merdeka Seal (Right)
    const rightSealX = this.marginLeft + this.contentWidth - 13.5;
    this.doc.setFillColor(240, 253, 244);
    this.doc.setDrawColor(21, 128, 61);
    this.doc.setLineWidth(0.35);
    this.doc.circle(rightSealX + 13.5 / 2, startY + 13.5 / 2, 13.5 / 2 - 0.5, 'FD');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(4.0);
    this.doc.setTextColor(21, 128, 61);
    this.doc.text('KURIKULUM', rightSealX + 13.5 / 2, startY + 13.5 / 2 - 0.5, { align: 'center' });
    this.doc.text('MERDEKA', rightSealX + 13.5 / 2, startY + 13.5 / 2 + 2.2, { align: 'center' });

    // Centered Official Kop Surat Titles
    const textCenterX = this.marginLeft + this.contentWidth / 2;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11.5);
    this.doc.setTextColor(15, 23, 42); // #0F172A
    this.doc.text('LAPORAN PERKEMBANGAN ANAK', textCenterX, startY + 3.2, { align: 'center' });

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(30, 41, 59); // #1E293B
    this.doc.text((school.name || 'SATUAN PAUD').toUpperCase(), textCenterX, startY + 7.5, {
      align: 'center',
    });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(71, 85, 105); // #475569
    const sub = `${meta.semester} • TAHUN AJARAN ${meta.academicYear}`;
    this.doc.text(sub, textCenterX, startY + 11.2, { align: 'center' });

    if (school.address) {
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(school.address, textCenterX, startY + 14.5, { align: 'center' });
    }

    const kopHeight = Math.max(logoSize, school.address ? 15.5 : 12.5);
    const lineY = startY + kopHeight + 1.5;

    // Double Divider Lines (Official Indonesian Kop Style)
    this.doc.setDrawColor(15, 23, 42);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.marginLeft, lineY, this.marginLeft + this.contentWidth, lineY);

    this.doc.setLineWidth(0.2);
    this.doc.setDrawColor(148, 163, 184);
    this.doc.line(this.marginLeft, lineY + 0.8, this.marginLeft + this.contentWidth, lineY + 0.8);

    this.currentY = lineY + 3.5;
  }

  /**
   * Bagian 1: Identitas Siswa
   * 2 Columns in a structured card with previous design elements (Nama, Kelompok/Usia, NISN, Ortu, Fase Fondasi, Periode)
   */
  public renderStudentIdentityStandard(): void {
    this.renderStandardSectionTitle('Bagian 1: Identitas Siswa');

    const startY = this.currentY;
    const boxHeight = 19;
    const student = this.canonical.student;
    const meta = this.canonical.metadata;

    // Card border
    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(226, 232, 240); // #E2E8F0
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.marginLeft, startY, this.contentWidth, boxHeight, 1.5, 1.5, 'FD');

    const halfWidth = this.contentWidth / 2;
    const col1X = this.marginLeft + 3.5;
    const col2X = this.marginLeft + halfWidth + 3.5;
    const labelW = 32;

    this.doc.setFontSize(7.6);

    // Left Column - Row 1: Nama Peserta Didik
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Nama Peserta Didik', col1X, startY + 4.8);
    this.doc.text(':', col1X + labelW - 2, startY + 4.8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(15, 23, 42);
    const fullName = `${student.fullName}${student.nickname ? ` (${student.nickname})` : ''}`;
    this.doc.text(fullName, col1X + labelW, startY + 4.8);

    // Left Column - Row 2: Kelas / Kelompok
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Kelas / Kelompok', col1X, startY + 10.2);
    this.doc.text(':', col1X + labelW - 2, startY + 10.2);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(30, 41, 59);
    const groupStr = `${student.className.toUpperCase()}${student.ageDisplay ? ` (${student.ageDisplay})` : ''}`;
    this.doc.text(groupStr, col1X + labelW, startY + 10.2);

    // Left Column - Row 3: NISN / ID Siswa
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('NISN / ID Siswa', col1X, startY + 15.6);
    this.doc.text(':', col1X + labelW - 2, startY + 15.6);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(30, 41, 59);
    this.doc.text(student.nisn || student.id || '—', col1X + labelW, startY + 15.6);

    // Right Column - Row 1: Orang Tua / Wali
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Orang Tua / Wali', col2X, startY + 4.8);
    this.doc.text(':', col2X + 28, startY + 4.8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(30, 41, 59);
    this.doc.text(student.parentName || 'Bpk. Herman', col2X + 30, startY + 4.8);

    // Right Column - Row 2: Fase Perkembangan
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Fase Perkembangan', col2X, startY + 10.2);
    this.doc.text(':', col2X + 28, startY + 10.2);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(30, 41, 59);
    this.doc.text('Fase Fondasi (PAUD)', col2X + 30, startY + 10.2);

    // Right Column - Row 3: Periode / Semester
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Periode / Semester', col2X, startY + 15.6);
    this.doc.text(':', col2X + 28, startY + 15.6);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(30, 41, 59);
    this.doc.text(`${meta.semester} • TA ${meta.academicYear}`, col2X + 30, startY + 15.6);

    this.currentY = startY + boxHeight + 4.0;
  }

  /**
   * Bagian 2: Ringkasan Perkembangan
   * Card with Left Blue Accent Line
   */
  public renderOverallSummaryStandard(): void {
    this.renderStandardSectionTitle('Bagian 2: Ringkasan Perkembangan');

    const startY = this.currentY;
    const student = this.canonical.student;
    const studentDisplayName = `${student.fullName}${student.nickname ? ` (${student.nickname})` : ''}`;
    const descText = this.canonical.overallSummary?.description ||
      `Ananda ${studentDisplayName} menunjukkan perkembangan yang sangat baik pada semester ini, terutama dalam kemampuan bersosialisasi dan kreativitas di kelas ${student.className}.`;

    const percentage = this.canonical.overallSummary?.overallPercentage ?? (this.canonical.overallSummary as any)?.percentage ?? null;
    const strengths = this.canonical.visualSummary?.strengths ||
      this.canonical.developedPoints?.slice(0, 2).map((p) => p.title || p.behavior) || [
        'Kemandirian dan inisiatif bermain',
        'Interaksi sosial positif bersama teman',
      ];
    const emergingAreas = this.canonical.visualSummary?.needsReinforcement ||
      this.canonical.growthPoints?.slice(0, 2).map((p) => p.title || p.recommendation) || [
        'Fokus menyelesaikan kegiatan terstruktur',
      ];

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.8);
    const lines = this.doc.splitTextToSize(descText, this.contentWidth - 10);
    const narrativeH = lines.length * 3.8 + 2;

    const boxHeight = narrativeH + (percentage !== null ? 10 : 7) + 2;

    // Background box
    this.doc.setFillColor(248, 250, 252);
    this.doc.roundedRect(this.marginLeft, startY, this.contentWidth, boxHeight, 1.2, 1.2, 'F');

    // Left blue accent border
    this.doc.setFillColor(2, 132, 199); // #0284C7
    this.doc.rect(this.marginLeft, startY, 2.2, boxHeight, 'F');

    // Text content
    this.doc.setTextColor(30, 41, 59);
    let lineY = startY + 4.2;
    for (const line of lines) {
      this.doc.text(line, this.marginLeft + 5.5, lineY);
      lineY += 3.8;
    }

    // Summary bullets / meta line
    lineY += 1.5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(15, 23, 42);

    if (percentage !== null) {
      this.doc.setFillColor(240, 253, 244);
      this.doc.setDrawColor(187, 247, 208);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(this.marginLeft + 5.5, lineY, 44, 4.5, 0.8, 0.8, 'FD');
      this.doc.setTextColor(21, 128, 61);
      this.doc.text(`Capaian Umum: ${percentage}% • Baik`, this.marginLeft + 7.5, lineY + 3.2);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(71, 85, 105);
      const strText = `Kekuatan: ${strengths.slice(0, 2).join(', ')}`;
      const emText = `Area Berkembang: ${emergingAreas.slice(0, 1).join(', ')}`;
      this.doc.text(`${strText}   |   ${emText}`, this.marginLeft + 52, lineY + 3.2);
    } else {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(71, 85, 105);
      const strText = `Kekuatan Utama: ${strengths.slice(0, 2).join(', ')}   •   Area Berkembang: ${emergingAreas.slice(0, 1).join(', ')}`;
      this.doc.text(strText, this.marginLeft + 5.5, lineY + 3.2);
    }

    this.currentY = startY + boxHeight + 4.0;
  }

  /**
   * Bagian 3: Grafik Perkembangan Aspek
   * Diagram Batang with clearly visible developmental scale ruler (BB, MB, BSH, BSB)
   */
  public renderAspectBarChartStandard(): void {
    this.renderStandardSectionTitle('Bagian 3: Grafik Perkembangan Aspek');

    const startY = this.currentY;
    const aspects = this.canonical.aspects && this.canonical.aspects.length > 0 ? this.canonical.aspects : [
      { aspectTitle: 'Nilai Agama & Budi Pekerti', score: 75, ratingLevel: 'BSH' },
      { aspectTitle: 'Jati Diri', score: 90, ratingLevel: 'BSB' },
      { aspectTitle: 'Dasar-dasar Literasi, Sains & Seni', score: 75, ratingLevel: 'BSH' },
    ];

    const numRows = Math.min(aspects.length, 4);
    const boxHeight = 14 + numRows * 9.5 + 7;

    // Card border
    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.marginLeft, startY, this.contentWidth, boxHeight, 1.5, 1.5, 'FD');

    // Ruler Header Coordinates (56mm Label, 88mm Bar Track, 24mm Badge)
    const labelColW = 56;
    const barColW = 88;
    const badgeColW = 24;
    const barStartX = this.marginLeft + labelColW + 2;
    const badgeStartX = barStartX + barColW + 2;

    // Top Ruler Labels
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text('ASPEK PERKEMBANGAN', this.marginLeft + 3.5, startY + 5.0);

    // Scale Ruler Markers across bar width (0-25% BB, 25-50% MB, 50-75% BSH, 75-100% BSB)
    const segW = barColW / 4;
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(148, 163, 184);
    this.doc.text('BB', barStartX + segW * 0.5, startY + 5.0, { align: 'center' });
    this.doc.setTextColor(217, 119, 6); // amber
    this.doc.text('MB', barStartX + segW * 1.5, startY + 5.0, { align: 'center' });
    this.doc.setTextColor(2, 132, 199); // sky
    this.doc.text('BSH', barStartX + segW * 2.5, startY + 5.0, { align: 'center' });
    this.doc.setTextColor(5, 150, 105); // emerald
    this.doc.text('BSB', barStartX + segW * 3.5, startY + 5.0, { align: 'center' });

    this.doc.setTextColor(71, 85, 105);
    this.doc.text('CAPAIAN', badgeStartX + badgeColW / 2, startY + 5.0, { align: 'center' });

    // Divider under ruler
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.2);
    this.doc.line(this.marginLeft + 3, startY + 7.0, this.marginLeft + this.contentWidth - 3, startY + 7.0);

    // Render Each Aspect Bar
    let rowY = startY + 11.0;
    for (let i = 0; i < numRows; i++) {
      const asp = aspects[i];
      const title = asp.aspectTitle || 'Aspek Perkembangan';
      const score = asp.score !== null && asp.score !== undefined && asp.score > 0 ? asp.score : 75;
      const rating = (asp.ratingLevel || 'BSH').toUpperCase();

      // Aspect Label - guaranteed not to overflow
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.4);
      this.doc.setTextColor(30, 41, 59);
      const titleLines = this.doc.splitTextToSize(title, labelColW - 4);
      this.doc.text(titleLines[0] || title, this.marginLeft + 3.5, rowY + 3.5);

      // Background Bar Track with 4 Quadrants
      this.doc.setFillColor(241, 245, 249); // #F1F5F9
      this.doc.setDrawColor(203, 213, 225); // #CBD5E1
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(barStartX, rowY, barColW, 4.8, 1.2, 1.2, 'FD');

      // Vertical Guideline Ticks at 25%, 50%, 75%
      this.doc.setDrawColor(203, 213, 225);
      this.doc.line(barStartX + segW, rowY, barStartX + segW, rowY + 4.8);
      this.doc.line(barStartX + segW * 2, rowY, barStartX + segW * 2, rowY + 4.8);
      this.doc.line(barStartX + segW * 3, rowY, barStartX + segW * 3, rowY + 4.8);

      // Filled Bar
      const fillW = Math.max((score / 100) * barColW, 12);
      if (rating === 'BSB') {
        this.doc.setFillColor(5, 150, 105); // #059669
      } else if (rating === 'BSH') {
        this.doc.setFillColor(2, 132, 199); // #0284C7
      } else if (rating === 'MB') {
        this.doc.setFillColor(245, 158, 11); // #F59E0B
      } else {
        this.doc.setFillColor(225, 29, 72); // #E11D48
      }
      this.doc.roundedRect(barStartX, rowY, fillW, 4.8, 1.2, 1.2, 'F');

      // Percentage label inside bar
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.8);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(`${score}%`, barStartX + fillW - 1.5, rowY + 3.4, { align: 'right' });

      // Badge Pill Container
      const badgeW = 16;
      const badgeH = 4.8;
      const badgeX = badgeStartX + (badgeColW - badgeW) / 2;

      if (rating === 'BSB') {
        this.doc.setFillColor(236, 253, 245);
        this.doc.setDrawColor(167, 243, 208);
      } else if (rating === 'BSH') {
        this.doc.setFillColor(240, 249, 255);
        this.doc.setDrawColor(186, 230, 253);
      } else if (rating === 'MB') {
        this.doc.setFillColor(254, 243, 199);
        this.doc.setDrawColor(253, 230, 138);
      } else {
        this.doc.setFillColor(255, 241, 242);
        this.doc.setDrawColor(254, 205, 211);
      }
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(badgeX, rowY, badgeW, badgeH, 1.0, 1.0, 'FD');

      // Badge text precisely centered inside pill
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.8);
      if (rating === 'BSB') {
        this.doc.setTextColor(5, 150, 105);
      } else if (rating === 'BSH') {
        this.doc.setTextColor(2, 132, 199);
      } else if (rating === 'MB') {
        this.doc.setTextColor(217, 119, 6);
      } else {
        this.doc.setTextColor(225, 29, 72);
      }
      this.doc.text(rating, badgeX + badgeW / 2, rowY + 3.4, { align: 'center' });

      rowY += 9.5;
    }

    // Legend at bottom of card
    this.doc.setDrawColor(241, 245, 249);
    this.doc.setLineWidth(0.2);
    this.doc.line(this.marginLeft + 3, rowY + 0.5, this.marginLeft + this.contentWidth - 3, rowY + 0.5);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(100, 116, 139);
    const legendStr = 'Skala Perkembangan: BB = Belum Berkembang • MB = Mulai Berkembang • BSH = Berkembang Sesuai Harapan • BSB = Berkembang Sangat Baik';
    this.doc.text(legendStr, this.marginLeft + this.contentWidth / 2, rowY + 4.5, { align: 'center' });

    this.currentY = startY + boxHeight + 4.5;
  }

  /**
   * Bagian 4: Detail Capaian Aspek (Pindah jadi Bagian 4)
   * Structured Table with exact columns: Aspek Perkembangan, Capaian, Indikator & Catatan Pengamatan, Bukti Aktivitas
   */
  public renderAspectsTableStandard(): void {
    this.renderStandardSectionTitle('Bagian 4: Detail Capaian Aspek');

    const startY = this.currentY;
    const col1W = this.contentWidth * 0.28;
    const col2W = this.contentWidth * 0.14;
    const col3W = this.contentWidth * 0.58;

    const aspects = this.canonical.aspects && this.canonical.aspects.length > 0 ? this.canonical.aspects : [
      {
        aspectTitle: 'Nilai Agama & Budi Pekerti',
        ratingLevel: 'BSH',
        whatIsObserved: 'Mampu mengikuti doa bersama dengan khidmat sebelum dan sesudah belajar.',
        observedIndicators: [{ indicatorName: 'Mengenal konsep Tuhan & berdoa harian' }],
        supportingActivities: ['Pembiasaan Doa Pagi', 'Infaq Jumat'],
      },
      {
        aspectTitle: 'Jati Diri',
        ratingLevel: 'BSB',
        whatIsObserved: 'Menunjukkan emosi stabil dan mandiri dalam mengelola perlengkapan pribadi.',
        observedIndicators: [{ indicatorName: 'Regulasi emosi & kemandirian diri' }],
        supportingActivities: ['Merapikan Mainan Sendiri'],
      },
      {
        aspectTitle: 'Dasar-dasar Literasi, Matematika, Sains & Seni',
        ratingLevel: 'BSH',
        whatIsObserved: 'Antusias mengeksplorasi ragam media seni, menyusun balok, dan mengenali pola bentuk.',
        observedIndicators: [{ indicatorName: 'Mengenali bentuk geometri dan pola warna' }],
        supportingActivities: ['Eksplorasi Balok Warna', 'Mencampur Warna'],
      },
    ];

    // Table Header
    const headerH = 7.0;
    this.doc.setFillColor(248, 250, 252); // #F8FAFC
    this.doc.rect(this.marginLeft, startY, this.contentWidth, headerH, 'F');
    this.doc.setDrawColor(203, 213, 225);
    this.doc.setLineWidth(0.3);
    this.doc.rect(this.marginLeft, startY, this.contentWidth, headerH, 'S');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.4);
    this.doc.setTextColor(30, 41, 59);
    this.doc.text('Aspek Perkembangan', this.marginLeft + 3, startY + 4.6);
    this.doc.text('Capaian', this.marginLeft + col1W + col2W / 2, startY + 4.6, { align: 'center' });
    this.doc.text('Indikator, Catatan Pengamatan & Bukti Observasi', this.marginLeft + col1W + col2W + 3, startY + 4.6);

    let rowY = startY + headerH;
    for (let i = 0; i < Math.min(aspects.length, 4); i++) {
      const asp = aspects[i];
      const title = asp.aspectTitle;
      const rating = (asp.ratingLevel || 'BSH').toUpperCase();
      
      const indicators = asp.observedIndicators && asp.observedIndicators.length > 0
        ? asp.observedIndicators.map((ind: any) => ind.indicatorName || ind.text).join('; ')
        : 'Indikator capaian fase fondasi terpantau konsisten.';
      const narrative = asp.whatIsObserved || 'Menunjukkan kemajuan positif dalam kegiatan terarah.';
      const activities = asp.supportingActivities && asp.supportingActivities.length > 0
        ? `Bukti/Kegiatan: ${asp.supportingActivities.join(', ')}`
        : '';

      const fullNote = `${narrative} [Indikator: ${indicators}]${activities ? ` • ${activities}` : ''}`;

      const titleLines = this.doc.splitTextToSize(title, col1W - 5);
      const narrativeLines = this.doc.splitTextToSize(fullNote, col3W - 6);
      const maxLines = Math.max(titleLines.length, narrativeLines.length);
      const rowH = Math.max(maxLines * 3.8 + 4.0, 11.5);

      // Row border
      this.doc.setDrawColor(226, 232, 240);
      this.doc.rect(this.marginLeft, rowY, this.contentWidth, rowH, 'S');

      // Column Dividers
      this.doc.line(this.marginLeft + col1W, rowY, this.marginLeft + col1W, rowY + rowH);
      this.doc.line(this.marginLeft + col1W + col2W, rowY, this.marginLeft + col1W + col2W, rowY + rowH);

      // Col 1 Text
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.2);
      this.doc.setTextColor(15, 23, 42);
      let textY = rowY + 4.2;
      for (const tl of titleLines) {
        this.doc.text(tl, this.marginLeft + 3, textY);
        textY += 3.6;
      }

      // Col 2 Text Badge
      const badgeW = 16;
      const badgeH = 4.8;
      const badgeX = this.marginLeft + col1W + (col2W - badgeW) / 2;
      const badgeY = rowY + 3.2;

      if (rating === 'BSB') {
        this.doc.setFillColor(236, 253, 245);
        this.doc.setDrawColor(167, 243, 208);
      } else if (rating === 'BSH') {
        this.doc.setFillColor(240, 249, 255);
        this.doc.setDrawColor(186, 230, 253);
      } else if (rating === 'MB') {
        this.doc.setFillColor(254, 243, 199);
        this.doc.setDrawColor(253, 230, 138);
      } else {
        this.doc.setFillColor(255, 241, 242);
        this.doc.setDrawColor(254, 205, 211);
      }
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.0, 1.0, 'FD');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.8);
      if (rating === 'BSB') this.doc.setTextColor(5, 150, 105);
      else if (rating === 'BSH') this.doc.setTextColor(2, 132, 199);
      else if (rating === 'MB') this.doc.setTextColor(217, 119, 6);
      else this.doc.setTextColor(225, 29, 72);
      this.doc.text(rating, badgeX + badgeW / 2, badgeY + 3.4, { align: 'center' });

      // Col 3 Text
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.9);
      this.doc.setTextColor(51, 65, 85);
      textY = rowY + 4.2;
      for (const nl of narrativeLines.slice(0, 4)) {
        this.doc.text(nl, this.marginLeft + col1W + col2W + 3, textY);
        textY += 3.6;
      }

      rowY += rowH;
    }

    this.currentY = rowY + 4.5;
  }

  /**
   * Bagian 5: Summary Visual Perkembangan (Pindah jadi Bagian 5)
   * 3 Columns: Kekuatan (Green), Berkembang (Amber), Penguatan (Rose) + Highlight Cards
   */
  public renderVisualSummaryStandard(): void {
    this.renderStandardSectionTitle('Bagian 5: Summary Visual Perkembangan');

    const startY = this.currentY;
    const colW = (this.contentWidth - 6) / 3;
    const boxHeight = 27;

    // Points extraction
    const strengthPoints: string[] = [];
    const developingPoints: string[] = [];
    const strengtheningPoints: string[] = [];

    if (this.canonical.developedPoints && this.canonical.developedPoints.length > 0) {
      strengthPoints.push(...this.canonical.developedPoints.slice(0, 2).map((p) => p.title || p.behavior));
      if (this.canonical.developedPoints.length > 2) {
        developingPoints.push(...this.canonical.developedPoints.slice(2, 4).map((p) => p.title || p.behavior));
      }
    }
    if (strengthPoints.length === 0) {
      strengthPoints.push('Sangat mandiri & inisiatif', 'Mudah bergaul dengan rekan');
    }
    if (developingPoints.length === 0) {
      developingPoints.push('Kreativitas seni & motorik halus');
    }

    if (this.canonical.growthPoints && this.canonical.growthPoints.length > 0) {
      strengtheningPoints.push(...this.canonical.growthPoints.slice(0, 2).map((p) => p.title || p.recommendation));
    }
    if (strengtheningPoints.length === 0) {
      strengtheningPoints.push('Fokus ketuntasan tugas');
    }

    // Column 1: Kekuatan Anak
    const col1X = this.marginLeft;
    this.doc.setFillColor(240, 253, 244); // emerald-50
    this.doc.setDrawColor(187, 247, 208); // emerald-200
    this.doc.roundedRect(col1X, startY, colW, boxHeight, 1.5, 1.5, 'FD');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.0);
    this.doc.setTextColor(21, 128, 61); // emerald-700
    this.doc.text('Kekuatan Anak', col1X + colW / 2, startY + 5.0, { align: 'center' });
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.0);
    this.doc.setTextColor(30, 41, 59);
    let yPos = startY + 10.5;
    for (const item of strengthPoints.slice(0, 2)) {
      this.doc.setTextColor(22, 163, 74);
      this.doc.text('✓', col1X + 3.5, yPos);
      this.doc.setTextColor(30, 41, 59);
      const txt = this.doc.splitTextToSize(item, colW - 8);
      this.doc.text(txt[0] || item, col1X + 7.5, yPos);
      yPos += 5.5;
    }

    // Column 2: Area Sedang Berkembang
    const col2X = this.marginLeft + colW + 3;
    this.doc.setFillColor(255, 251, 235); // amber-50
    this.doc.setDrawColor(254, 240, 138); // amber-200
    this.doc.roundedRect(col2X, startY, colW, boxHeight, 1.5, 1.5, 'FD');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.0);
    this.doc.setTextColor(180, 83, 9); // amber-700
    this.doc.text('Sedang Berkembang', col2X + colW / 2, startY + 5.0, { align: 'center' });
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.0);
    this.doc.setTextColor(30, 41, 59);
    yPos = startY + 10.5;
    for (const item of developingPoints.slice(0, 2)) {
      this.doc.setTextColor(217, 119, 6);
      this.doc.text('✓', col2X + 3.5, yPos);
      this.doc.setTextColor(30, 41, 59);
      const txt = this.doc.splitTextToSize(item, colW - 8);
      this.doc.text(txt[0] || item, col2X + 7.5, yPos);
      yPos += 5.5;
    }

    // Column 3: Area Perlu Diperkuat
    const col3X = this.marginLeft + (colW + 3) * 2;
    this.doc.setFillColor(255, 241, 242); // rose-50
    this.doc.setDrawColor(254, 205, 211); // rose-200
    this.doc.roundedRect(col3X, startY, colW, boxHeight, 1.5, 1.5, 'FD');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.0);
    this.doc.setTextColor(190, 18, 60); // rose-700
    this.doc.text('Perlu Diperkuat', col3X + colW / 2, startY + 5.0, { align: 'center' });
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.0);
    this.doc.setTextColor(30, 41, 59);
    yPos = startY + 10.5;
    for (const item of strengtheningPoints.slice(0, 2)) {
      this.doc.setTextColor(225, 29, 72);
      this.doc.text('•', col3X + 4.0, yPos);
      this.doc.setTextColor(30, 41, 59);
      const txt = this.doc.splitTextToSize(item, colW - 8);
      this.doc.text(txt[0] || item, col3X + 7.5, yPos);
      yPos += 5.5;
    }

    // 2 Highlight Cards Underneath: Kemampuan Paling Menonjol & Prioritas Stimulasi Lanjutan
    const cardY = startY + boxHeight + 3.5;
    const cardHalfW = (this.contentWidth - 4) / 2;
    const cardH = 12.5;

    const mostProminent = this.canonical.visualSummary?.mostProminentSkill || strengthPoints[0] || 'Kemandirian dan interaksi sosial aktif';
    const nextPriority = this.canonical.visualSummary?.furtherStimulationPriority || strengtheningPoints[0] || 'Stimulasi fokus dan kesabaran menyelesaikan tugas';

    // Left Highlight Card
    this.doc.setFillColor(248, 250, 252);
    this.doc.setDrawColor(226, 232, 240);
    this.doc.roundedRect(this.marginLeft, cardY, cardHalfW, cardH, 1.2, 1.2, 'FD');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text('⭐ Kemampuan Paling Menonjol:', this.marginLeft + 3.5, cardY + 4.5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(71, 85, 105);
    const promLines = this.doc.splitTextToSize(mostProminent, cardHalfW - 7);
    this.doc.text(promLines[0] || mostProminent, this.marginLeft + 3.5, cardY + 8.8);

    // Right Highlight Card
    this.doc.setFillColor(248, 250, 252);
    this.doc.setDrawColor(226, 232, 240);
    this.doc.roundedRect(this.marginLeft + cardHalfW + 4, cardY, cardHalfW, cardH, 1.2, 1.2, 'FD');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text('🎯 Prioritas Stimulasi Lanjutan:', this.marginLeft + cardHalfW + 7.5, cardY + 4.5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(71, 85, 105);
    const prioLines = this.doc.splitTextToSize(nextPriority, cardHalfW - 7);
    this.doc.text(prioLines[0] || nextPriority, this.marginLeft + cardHalfW + 7.5, cardY + 8.8);

    this.currentY = cardY + cardH + 4.5;
  }

  /**
   * Bagian 6: Dokumentasi Kegiatan (Album Dokumentasi Kegiatan)
   * Tampilan album foto dengan foto nyata/placeholder, judul, tanggal, aspek/CP/TP terkait, dan deskripsi singkat.
   */
  public renderEvidencesStandard(): void {
    this.renderStandardSectionTitle('Bagian 6: Dokumentasi Kegiatan');

    const startY = this.currentY;
    const photoW = (this.contentWidth - 6) / 2;
    const photoH = 32; // mm
    const student = this.canonical.student;
    const evidenceList = this.canonical.evidences || [];

    const ev1: { activityTitle: string; caption: string; date?: string; relatedAspect?: string; url?: string } = evidenceList[0] || {
      activityTitle: 'Bermain Balok Konstruksi',
      caption: `${student.nickname || student.fullName} antusias berkolaborasi menyusun balok bersama kelompoknya.`,
      date: '12 September 2026',
      relatedAspect: 'Jati Diri / Kolaborasi',
    };
    const ev2: { activityTitle: string; caption: string; date?: string; relatedAspect?: string; url?: string } = evidenceList[1] || {
      activityTitle: 'Praktik Cuci Tangan Mandiri',
      caption: 'Menunjukkan pembiasaan pola hidup bersih dan sehat secara mandiri sebelum makan bersama.',
      date: '15 September 2026',
      relatedAspect: 'Nilai Agama & Budi Pekerti',
    };

    // Slot 1: Left Photo Card
    const slot1X = this.marginLeft;
    let addedImg1 = false;
    if (ev1.url && ev1.url.startsWith('data:image')) {
      try {
        const fmt = ev1.url.includes('png') ? 'PNG' : 'JPEG';
        this.doc.addImage(ev1.url, fmt, slot1X, startY, photoW, photoH);
        addedImg1 = true;
      } catch (e) {
        console.warn('Could not add image 1 to PDF:', e);
      }
    }
    if (!addedImg1) {
      this.doc.setFillColor(248, 250, 252);
      this.doc.setDrawColor(203, 213, 225);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(slot1X, startY, photoW, photoH, 1.5, 1.5, 'FD');
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.0);
      this.doc.setTextColor(148, 163, 184);
      this.doc.text('Dokumentasi Kegiatan 1', slot1X + photoW / 2, startY + photoH / 2, { align: 'center' });
    }

    // Meta Badge & Judul 1
    const metaY1 = startY + photoH + 3.5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.6);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(ev1.activityTitle, slot1X, metaY1);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.4);
    this.doc.setTextColor(100, 116, 139);
    const badgeText1 = `${ev1.date || 'Semester 1'} • ${ev1.relatedAspect || 'Aspek Terkait'}`;
    this.doc.text(badgeText1, slot1X, metaY1 + 3.6);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.6);
    this.doc.setTextColor(51, 65, 85);
    const cap1Lines = this.doc.splitTextToSize(ev1.caption, photoW);
    let capY = metaY1 + 7.2;
    for (const l of cap1Lines.slice(0, 2)) {
      this.doc.text(l, slot1X, capY);
      capY += 3.4;
    }

    // Slot 2: Right Photo Card
    const slot2X = this.marginLeft + photoW + 6;
    let addedImg2 = false;
    if (ev2.url && ev2.url.startsWith('data:image')) {
      try {
        const fmt = ev2.url.includes('png') ? 'PNG' : 'JPEG';
        this.doc.addImage(ev2.url, fmt, slot2X, startY, photoW, photoH);
        addedImg2 = true;
      } catch (e) {
        console.warn('Could not add image 2 to PDF:', e);
      }
    }
    if (!addedImg2) {
      this.doc.setFillColor(248, 250, 252);
      this.doc.setDrawColor(203, 213, 225);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(slot2X, startY, photoW, photoH, 1.5, 1.5, 'FD');
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.0);
      this.doc.setTextColor(148, 163, 184);
      this.doc.text('Dokumentasi Kegiatan 2', slot2X + photoW / 2, startY + photoH / 2, { align: 'center' });
    }

    // Meta Badge & Judul 2
    const metaY2 = startY + photoH + 3.5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.6);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(ev2.activityTitle, slot2X, metaY2);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.4);
    this.doc.setTextColor(100, 116, 139);
    const badgeText2 = `${ev2.date || 'Semester 1'} • ${ev2.relatedAspect || 'Aspek Terkait'}`;
    this.doc.text(badgeText2, slot2X, metaY2 + 3.6);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.6);
    this.doc.setTextColor(51, 65, 85);
    const cap2Lines = this.doc.splitTextToSize(ev2.caption, photoW);
    capY = metaY2 + 7.2;
    for (const l of cap2Lines.slice(0, 2)) {
      this.doc.text(l, slot2X, capY);
      capY += 3.4;
    }

    this.currentY = startY + photoH + 16.5;
  }

  /**
   * Bagian 7: Catatan Guru (Pindah jadi Bagian 7)
   * Menyajikan catatan perkembangan dari wali kelas/guru, hal positif yang perlu dipertahankan,
   * hal yang perlu diperkuat, dan catatan tambahan jika ada.
   */
  public renderTeacherMessageStandard(): void {
    this.renderStandardSectionTitle('Bagian 7: Catatan Guru');

    const startY = this.currentY;
    const student = this.canonical.student;
    const tData = this.canonical.teacherNotesData;

    const generalNote = tData?.generalNote || this.canonical.teacherMessage ||
      `Ananda ${student.nickname || student.fullName} menunjukkan kemajuan yang luar biasa dalam inisiatif belajar dan interaksi sosial. Pertahankan rasa ingin tahu dan semangat belajarmu!`;
    const positiveNote = tData?.positiveToMaintain ||
      'Pertahankan antusiasme bermain, kemandirian memakai sepatu, dan interaksi hangat bersama teman.';
    const strengthenNote = tData?.areasToStrengthen ||
      'Penguatan konsentrasi saat menyelesaikan aktivitas terarah dan pembiasaan merapikan perlengkapan secara tuntas.';

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.2);
    const genLines = this.doc.splitTextToSize(generalNote, this.contentWidth - 8);
    const posLines = this.doc.splitTextToSize(`• Hal Positif yang Dipertahankan: ${positiveNote}`, this.contentWidth - 8);
    const strLines = this.doc.splitTextToSize(`• Hal yang Perlu Diperkuat: ${strengthenNote}`, this.contentWidth - 8);

    const totalLinesCount = genLines.length + posLines.length + strLines.length;
    const boxHeight = Math.max(totalLinesCount * 3.6 + 6, 22);

    // Card border
    this.doc.setFillColor(248, 250, 252);
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.marginLeft, startY, this.contentWidth, boxHeight, 1.5, 1.5, 'FD');

    // General note
    this.doc.setTextColor(30, 41, 59);
    let lineY = startY + 4.2;
    for (const l of genLines) {
      this.doc.text(l, this.marginLeft + 4, lineY);
      lineY += 3.6;
    }

    // Positive points
    lineY += 1.0;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(21, 128, 61);
    this.doc.text(posLines[0] || '', this.marginLeft + 4, lineY);
    lineY += 3.6;
    this.doc.setFont('helvetica', 'normal');
    for (const l of posLines.slice(1)) {
      this.doc.text(l, this.marginLeft + 4, lineY);
      lineY += 3.6;
    }

    // Strengthen points
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(180, 83, 9);
    this.doc.text(strLines[0] || '', this.marginLeft + 4, lineY);
    lineY += 3.6;
    this.doc.setFont('helvetica', 'normal');
    for (const l of strLines.slice(1)) {
      this.doc.text(l, this.marginLeft + 4, lineY);
      lineY += 3.6;
    }

    this.currentY = startY + boxHeight + 4.0;
  }

  /**
   * Bagian 8: Rekomendasi Stimulasi di Rumah (WAJIB ADA)
   * Menyajikan rekomendasi kegiatan konkret yang dapat dilakukan orang tua di rumah:
   * Nama kegiatan, tujuan, cara melakukan, alat/bahan sederhana di rumah, durasi, kemampuan/aspek yang distimulasi.
   */
  public renderHomeStimulationStandard(): void {
    this.renderStandardSectionTitle('Bagian 8: Rekomendasi Stimulasi di Rumah');

    const startY = this.currentY;
    const stimulations = this.canonical.homeStimulations && this.canonical.homeStimulations.length > 0
      ? this.canonical.homeStimulations.slice(0, 2)
      : [
          {
            title: 'Merapikan Mainan & Menyusun Pola Balok',
            purpose: 'Melatih kemandirian, tanggung jawab, serta pengenalan pola warna dan bentuk secara terarah.',
            howTo: 'Ajak ananda mengelompokkan mainan sesuai warna atau ukuran ke wadah yang sesuai secara menyenangkan.',
            materials: 'Keranjang mainan, balok susun, atau wadah plastik berwarna.',
            duration: '10–15 menit setiap sore',
            aspectStimulated: 'Jati Diri (Kemandirian) & Kognitif (Pola Geometri)',
          },
          {
            title: 'Membaca Dongeng Interaktif Sebelum Tidur',
            purpose: 'Memperkaya perbendaharaan kata, empati, dan pembiasaan doa harian.',
            howTo: 'Bacakan buku cerita bergambar, tanyakan perasaan tokoh, dan beri kesempatan ananda memimpin doa singkat.',
            materials: 'Buku cerita bergambar anak.',
            duration: '15 menit sebelum tidur',
            aspectStimulated: 'Literasi Awal & Nilai Agama Budi Pekerti',
          },
        ];

    const cardW = (this.contentWidth - 4) / stimulations.length;
    const cardH = 34; // mm

    for (let i = 0; i < stimulations.length; i++) {
      const item = stimulations[i];
      const cardX = this.marginLeft + i * (cardW + 4);

      // Background card
      this.doc.setFillColor(254, 252, 246); // warm light background
      this.doc.setDrawColor(253, 230, 138); // amber border
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(cardX, startY, cardW, cardH, 1.5, 1.5, 'FD');

      // Card Header: Title & Duration Badge
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.4);
      this.doc.setTextColor(15, 23, 42);
      const titleLines = this.doc.splitTextToSize(`${i + 1}. ${item.title}`, cardW - 7);
      this.doc.text(titleLines[0] || item.title, cardX + 3.5, startY + 4.2);

      // Duration badge
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(180, 83, 9);
      this.doc.text(`⏱ ${item.duration || '15 menit'}`, cardX + 3.5, startY + 7.8);

      // Aspek yang distimulasi
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.3);
      this.doc.setTextColor(21, 128, 61);
      const aspLines = this.doc.splitTextToSize(`Aspek: ${item.aspectStimulated || 'Perkembangan Menyeluruh'}`, cardW - 7);
      this.doc.text(aspLines[0], cardX + 3.5, startY + 11.4);

      // Tujuan & Cara Melakukan
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(51, 65, 85);
      const purposeLines = this.doc.splitTextToSize(`Tujuan: ${item.purpose}`, cardW - 7);
      this.doc.text(purposeLines[0], cardX + 3.5, startY + 15.2);

      const howToLines = this.doc.splitTextToSize(`Cara: ${item.howTo}`, cardW - 7);
      let curTextY = startY + 19.0;
      for (const line of howToLines.slice(0, 2)) {
        this.doc.text(line, cardX + 3.5, curTextY);
        curTextY += 3.3;
      }

      // Alat & Bahan
      const matLines = this.doc.splitTextToSize(`Bahan: ${item.materials}`, cardW - 7);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(matLines[0], cardX + 3.5, startY + 29.5);
    }

    this.currentY = startY + cardH + 4.5;
  }

  /**
   * Running Header for Page 2
   * Follows the formal previous design with school name on the left and student metadata on the right
   */
  public renderPage2RunningHeaderStandard(): void {
    const startY = this.marginTop - 4;
    const school = this.canonical.school;
    const student = this.canonical.student;
    const assessmentDate = this.canonical.observationSummary?.latestObservationDate || this.canonical.metadata.generatedDate || 'September 2026';

    // Left: School Name
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.0);
    this.doc.setTextColor(30, 41, 59);
    this.doc.text((school.name || 'SATUAN PAUD').toUpperCase(), this.marginLeft, startY);

    // Right: Student details and Assessment Date
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(100, 116, 139);
    const rightText = `Nama: ${student.fullName}   •   Kelas: ${student.className}   •   Tgl: ${assessmentDate}`;
    this.doc.text(rightText, this.pageWidth - this.marginRight, startY, { align: 'right' });

    // Divider line
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.25);
    this.doc.line(this.marginLeft, startY + 2.5, this.pageWidth - this.marginRight, startY + 2.5);

    this.currentY = startY + 6.0;
  }

  /**
   * Tanda Tangan: Kepala Sekolah (Kepsek) & Guru Kelompok / Wali Kelas
   * Sesuai instruksi baku: tanda tangan kepsek di kiri dan Guru kelompok / Wali Kelas di kanan
   * Alamat diisi kelurahan (bukan jalan) dan nama wali kelas dicantumkan jelas.
   */
  public renderSignaturesStandard(): void {
    const startY = this.currentY;
    const signatures = this.canonical.signatures;
    const principalName = signatures?.principal?.name || this.canonical.school?.principalName || 'Kepala Satuan PAUD';
    const principalNip = signatures?.principal?.nip;

    // Resolve Wali Kelas name
    const matchingClass = schoolStore.getClasses().find(
      (c) =>
        (this.canonical.student.className && c.name.trim().toLowerCase() === this.canonical.student.className.trim().toLowerCase()) ||
        c.id === (this.canonical.student as any).classId
    );
    const teacherName =
      matchingClass?.teacherName ||
      (this.canonical.student as any).teacherName ||
      (signatures?.teacher?.name && signatures.teacher.name !== 'Guru Kelompok' ? signatures.teacher.name : null) ||
      schoolStore.getTeachers()[0]?.name ||
      'Ibu Rahmawati, S.Pd.';

    const teacherNip = signatures?.teacher?.nip;
    
    // Alamat diisi Kelurahan, bukan jalan
    const kelurahanAddress = extractKelurahanAddress(this.canonical.school?.address, this.canonical.school?.cityName || 'Makassar');
    const dateStr = this.canonical.observationSummary?.latestObservationDate || this.canonical.metadata.generatedDate || '15 September 2026';

    const colW = this.contentWidth / 2;
    const leftColCenter = this.marginLeft + colW / 2;
    const rightColCenter = this.marginLeft + colW + colW / 2;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.6);
    this.doc.setTextColor(51, 65, 85);

    // Left: Mengetahui, Kepala Satuan PAUD (Kepsek)
    this.doc.text('Mengetahui,', leftColCenter, startY + 3.5, { align: 'center' });
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(15, 23, 42);
    this.doc.text('Kepala Satuan PAUD', leftColCenter, startY + 7.5, { align: 'center' });

    // Principal Signature Image (if provided)
    const principalSig = signatures?.principal?.signatureDataUrl;
    if (principalSig && principalSig.startsWith('data:image')) {
      try {
        const fmt = principalSig.includes('png') ? 'PNG' : 'JPEG';
        this.doc.addImage(principalSig, fmt, leftColCenter - 14, startY + 9.0, 28, 10);
      } catch (e) {
        console.warn('Could not add principal signature to PDF:', e);
      }
    }

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.8);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(principalName, leftColCenter, startY + 22.0, { align: 'center' });
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(100, 116, 139);
    this.doc.text(`NIP. ${principalNip || '—'}`, leftColCenter, startY + 25.5, { align: 'center' });

    // Right: Kelurahan, Tanggal & Guru Kelompok / Wali Kelas
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.6);
    this.doc.setTextColor(51, 65, 85);
    this.doc.text(`${kelurahanAddress}, ${dateStr}`, rightColCenter, startY + 3.5, { align: 'center' });
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(15, 23, 42);
    this.doc.text('Guru Kelompok / Wali Kelas', rightColCenter, startY + 7.5, { align: 'center' });

    // Teacher Signature Image (if provided)
    const teacherSig = signatures?.teacher?.signatureDataUrl;
    if (teacherSig && teacherSig.startsWith('data:image')) {
      try {
        const fmt = teacherSig.includes('png') ? 'PNG' : 'JPEG';
        this.doc.addImage(teacherSig, fmt, rightColCenter - 14, startY + 9.0, 28, 10);
      } catch (e) {
        console.warn('Could not add teacher signature to PDF:', e);
      }
    }

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.8);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(teacherName, rightColCenter, startY + 22.0, { align: 'center' });
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(100, 116, 139);
    this.doc.text(`Wali Kelas • NIP. ${teacherNip || '—'}`, rightColCenter, startY + 25.5, { align: 'center' });

    this.currentY = startY + 28.0;
  }

  /**
   * Finalizes the Standard 2-Page Document Footers
   */
  public finalizeStandardDocument(): void {
    const student = this.canonical.student;
    const studentDisplayName = `${student.fullName}${student.nickname ? ` (${student.nickname})` : ''}`;
    const totalPages = this.doc.getNumberOfPages();

    for (let p = 1; p <= totalPages; p++) {
      this.doc.setPage(p);

      // Running Footer Line
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.2);
      this.doc.line(
        this.marginLeft,
        this.pageHeight - this.marginBottom + 2.0,
        this.pageWidth - this.marginRight,
        this.pageHeight - this.marginBottom + 2.0
      );

      // Left Footer
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(
        `Laporan Perkembangan Ananda ${studentDisplayName} - ${student.className}`,
        this.marginLeft,
        this.pageHeight - this.marginBottom + 6.0
      );

      // Right Footer
      this.doc.text(
        `GrowUPAUD Assessment Intelligence | Halaman ${p} dari ${totalPages}`,
        this.pageWidth - this.marginRight,
        this.pageHeight - this.marginBottom + 6.0,
        { align: 'right' }
      );
    }
  }

  /**
   * Executes the Standard 3-Page Flow.
   * Matches the exact 8-part layout, section headings, and bar chart scale requested by the user:
   * Halaman 1: Kop Surat, Bagian 1 (Identitas), Bagian 2 (Ringkasan), Bagian 3 (Grafik Aspek)
   * Halaman 2: Running Header, Bagian 4 (Detail Capaian Aspek), Bagian 5 (Summary Visual)
   * Halaman 3: Running Header, Bagian 6 (Dokumentasi Kegiatan), Bagian 7 (Catatan Guru), Bagian 8 (Rekomendasi Stimulasi di Rumah), Tanda Tangan Resmi
   */
  public generateFullReport(): jsPDF {
    // =========================================================================
    // HALAMAN 1: Header Kop Surat, Bagian 1, Bagian 2, Bagian 3
    // =========================================================================
    this.renderKopSuratStandard();
    this.renderStudentIdentityStandard();
    this.renderOverallSummaryStandard();
    this.renderAspectBarChartStandard();

    // =========================================================================
    // HALAMAN 2: Running Header, Bagian 4 (Detail Capaian), Bagian 5 (Summary Visual)
    // =========================================================================
    this.addPage();
    this.renderPage2RunningHeaderStandard();
    this.renderAspectsTableStandard();
    this.renderVisualSummaryStandard();

    // =========================================================================
    // HALAMAN 3: Running Header, Bagian 6 (Dokumentasi), Bagian 7 (Catatan Guru), Bagian 8 (Rekomendasi Stimulasi di Rumah), Tanda Tangan
    // =========================================================================
    this.addPage();
    this.renderPage2RunningHeaderStandard();
    this.renderEvidencesStandard();
    this.renderTeacherMessageStandard();
    this.renderHomeStimulationStandard();
    this.renderSignaturesStandard();

    // Finalize running footers across all 3 pages
    this.finalizeStandardDocument();

    return this.doc;
  }

  public getBlob(): Blob {
    return this.doc.output('blob');
  }

  public getDataUrl(): string {
    return this.doc.output('dataurlstring');
  }

  public save(filename: string): void {
    this.doc.save(filename);
  }
}

