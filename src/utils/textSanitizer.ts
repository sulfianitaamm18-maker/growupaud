/**
 * Text Sanitizer for GrowUPAUD Reports
 * Cleans LaTeX leaks, math delimiters, broken XML/Unicode tokens, and ensures pristine typography.
 */

export function sanitizeReportText(input: string | null | undefined): string {
  if (!input) return '';
  let text = String(input);

  // 1. Clean LaTeX math brackets and formulas like $A\bullet5$, $A \bullet 5$, etc.
  text = text.replace(/\$A\\bullet5\$/g, 'A • 5');
  text = text.replace(/\$B\\bullet5\$/g, 'B • 5');
  text = text.replace(/\$B\\bullet6\$/g, 'B • 6');
  text = text.replace(/\$([A-Za-z0-9]+)\s*\\bullet\s*([0-9A-Za-z\s]+)\$/g, '$1 • $2');
  text = text.replace(/\$([A-Za-z0-9\s]+)\$/g, '$1');
  text = text.replace(/\\bullet/g, '•');
  text = text.replace(/\\text\{([^}]+)\}/g, '$1');
  text = text.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  text = text.replace(/\\textbf\{([^}]+)\}/g, '$1');
  text = text.replace(/\$/g, '');

  // 2. Fix broken HTML/XML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // 3. Fix corrupted tokens like "<B" or broken symbols
  text = text.replace(/<\s*B\s*/gi, 'Kelompok B ');
  text = text.replace(/<\s*A\s*/gi, 'Kelompok A ');

  return text.trim();
}

/**
 * Specifically cleans and formats groupName & age string to ensure clean rendering.
 * Transforms "$A\bullet5$" -> "A • 5" -> "KELOMPOK A • 5 Tahun 0 Bulan".
 */
export function formatStudentGroupAndAge(
  groupName?: string | null,
  ageDisplay?: string | null
): string {
  let group = groupName ? String(groupName) : 'KELOMPOK A';
  
  // Exact user specified replacement: groupName.replace(/\$A\\bullet5\$/g, 'A • 5').replace(/\$/g, '')
  group = group.replace(/\$A\\bullet5\$/g, 'A • 5').replace(/\$/g, '').trim();
  group = sanitizeReportText(group);

  // Normalize group label to "KELOMPOK A" / "KELOMPOK B"
  let cleanGroupLabel = 'KELOMPOK A';
  if (/^A(\s*•.*)?$/i.test(group) || /kelompok\s*a/i.test(group) || /tk\s*a/i.test(group)) {
    cleanGroupLabel = 'KELOMPOK A';
  } else if (/^B(\s*•.*)?$/i.test(group) || /kelompok\s*b/i.test(group) || /tk\s*b/i.test(group)) {
    cleanGroupLabel = 'KELOMPOK B';
  } else if (/kb|kelompok\s*bermain/i.test(group)) {
    cleanGroupLabel = 'KELOMPOK BERMAIN (KB)';
  } else if (/tpa|tempat\s*penitipan/i.test(group)) {
    cleanGroupLabel = 'TPA';
  } else if (/sps/i.test(group)) {
    cleanGroupLabel = 'SPS';
  } else {
    cleanGroupLabel = group.toUpperCase();
    if (!cleanGroupLabel.startsWith('KELOMPOK') && !cleanGroupLabel.startsWith('TK')) {
      cleanGroupLabel = `KELOMPOK ${cleanGroupLabel}`;
    }
  }

  let cleanAge = sanitizeReportText(ageDisplay || '5 Tahun 0 Bulan');
  if (!cleanAge || cleanAge === 'Umur belum diisi' || cleanAge === '-') {
    cleanAge = '5 Tahun 0 Bulan';
  }

  // Format "5 tahun" / "5 tahun 0 bulan" -> "5 Tahun 0 Bulan"
  cleanAge = cleanAge
    .replace(/(\d+)\s*tahun\s*(\d+)\s*bulan/gi, '$1 Tahun $2 Bulan')
    .replace(/(\d+)\s*tahun$/gi, '$1 Tahun 0 Bulan')
    .replace(/(\d+)\s*bulan$/gi, '0 Tahun $1 Bulan');

  return `${cleanGroupLabel} • ${cleanAge}`;
}

/**
 * Normalizes text for jsPDF Standard Fonts (Helvetica/Arial) to prevent corrupted glyphs.
 */
export function sanitizeForPdf(input: string | null | undefined): string {
  if (!input) return '';
  let text = sanitizeReportText(input);

  // Replace emoji with clean ASCII or Latin-1 equivalent
  text = text.replace(/🎯/g, '[Fokus]');
  text = text.replace(/★/g, '*');
  text = text.replace(/✓/g, 'v');
  text = text.replace(/•/g, '-');
  text = text.replace(/–/g, '-');
  text = text.replace(/—/g, '-');

  return text;
}
