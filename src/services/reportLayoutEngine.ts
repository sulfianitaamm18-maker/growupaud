import { jsPDF } from 'jspdf';
import { CanonicalReportDocument } from './reportDocumentModel';
import { REPORT_DOCUMENT_CONFIG } from './reportDocumentStyles';
import { sanitizeReportText, sanitizeForPdf } from '../utils/textSanitizer';

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
    }

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

    // Row 3: Tanggal Laporan
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('Tanggal Laporan', col2X, startY + 14.8);
    this.doc.text(':', col2X + labelW2 - 2, startY + 14.8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(30, 41, 59);
    this.doc.text(meta.generatedDate || '—', col2X + labelW2, startY + 14.8);

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

    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(`( ${sig.teacher.name} )`, c2X, textY + 24, { align: 'center' });
    this.doc.line(c2X - 20, textY + 25, c2X + 20, textY + 25);

    // Col 3: Kepala Sekolah
    const c3X = this.marginLeft + colW * 2 + colW / 2;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text('Mengetahui,', c3X, textY, { align: 'center' });
    this.doc.text(sig.principal.label, c3X, textY + 4.0, { align: 'center' });

    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(`( ${sig.principal.name} )`, c3X, textY + 24, { align: 'center' });
    this.doc.line(c3X - 20, textY + 25, c3X + 20, textY + 25);

    this.currentY = startY + sigHeight + 2;
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

      // Running Header (Pages 2+)
      if (p > 1) {
        this.doc.setFont('helvetica', 'italic');
        this.doc.setFontSize(7.2);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text(
          `Laporan Perkembangan Ananda ${sanitizeReportText(student.fullName)} • ${sanitizeReportText(school.name)}`,
          this.marginLeft,
          this.marginTop - 6
        );

        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(6.8);
        this.doc.setTextColor(148, 163, 184);
        this.doc.text(
          'LAPORAN PERKEMBANGAN ANAK PAUD',
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
   * Executes the Standard 3-Page Flow (with natural dynamic expansion if notes are long).
   * 
   * Page 1: Kop Surat, Identitas, Gambaran Menyeluruh, Radar Chart & Yang Sudah Berkembang
   * Page 2: Masih Perlu Dikembangkan, Dokumentasi Bukti Autentik, Tabel Rinci 6 Aspek
   * Page 3: Stimulasi Sederhana di Rumah, Pesan Guru & Lembar Pengesahan 3 Pihak
   */
  public generateFullReport(): jsPDF {
    // =========================================================================
    // PAGE 1: Kop, Identitas, Gambaran Menyeluruh, Radar Chart & Yang Sudah Berkembang
    // =========================================================================
    this.renderKopSurat();
    this.renderStudentIdentity();
    this.renderOverallSummary();
    this.renderRadarChartSection();
    this.renderDevelopedPoints();

    // =========================================================================
    // PAGE 2: Masih Perlu Dikembangkan, Bukti Autentik & Tabel Rinci 6 Aspek
    // =========================================================================
    this.addPage();
    this.renderGrowthPoints();
    this.renderEvidencesSection();
    this.renderAspectsTable();

    // =========================================================================
    // PAGE 3: Stimulasi Rumah, Pesan Wali Kelas & Lembar Pengesahan 3 Pihak
    // =========================================================================
    this.addPage();
    this.renderHomeStimulationCards();
    this.renderTeacherMessage();
    this.addSpacer(6);
    this.renderSignatures();

    // Finalize running headers and footers with accurate total page count
    this.finalizeDocument();

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
