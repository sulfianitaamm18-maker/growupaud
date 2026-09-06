import { AspectDetailedReportItem } from '../services/reportDocumentModel';

/**
 * Pure Canvas-based Radar Chart Renderer for 6 PAUD Developmental Aspects.
 * Generates crisp, high-resolution PNG images of the assessment chart for Word (.docx) and PDF embedding.
 */
export async function renderRadarChartToCanvas(
  aspects: { aspectKey: string; aspectTitle: string; score: number | null; ratingLabel: string }[],
  width = 680,
  height = 500
): Promise<HTMLCanvasElement> {
  if (typeof document === 'undefined') {
    throw new Error('Canvas rendering is only available in browser environment');
  }

  const canvas = document.createElement('canvas');
  const dpr = 2; // High DPI resolution (retina sharpness)
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas 2d context');
  }

  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2 - 10;
  const r = Math.min(width, height) * 0.32; // ~160px
  const numAxes = 6;

  // 6 Predefined Aspect Titles & Standard Positions
  const defaultTitles = [
    'Nilai Agama & Budi Pekerti',
    'Jati Diri',
    'Literasi & STEAM',
    'Motorik Kasar',
    'Motorik Halus',
    'Kognitif',
  ];

  // 1. Draw Concentric Grid Rings
  const levels = [0.25, 0.5, 0.75, 1.0];
  levels.forEach((level, idx) => {
    ctx.beginPath();
    for (let i = 0; i < numAxes; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
      const x = cx + r * level * Math.cos(angle);
      const y = cy + r * level * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    if (idx === 3) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fill();
    }

    ctx.strokeStyle = idx === 3 ? '#94A3B8' : '#CBD5E1';
    ctx.lineWidth = idx === 3 ? 1.2 : 0.8;
    if (idx < 3) {
      ctx.setLineDash([4, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // 2. Draw Radial Axis Lines
  for (let i = 0; i < numAxes; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  // 3. Compute Data Polygon Points
  const points: { x: number; y: number; scoreVal: number; hasData: boolean }[] = [];
  for (let i = 0; i < numAxes; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
    const asp = aspects[i];
    const scoreVal = asp && asp.score !== null && asp.score > 0 ? Math.min(asp.score, 100) : 15;
    const hasData = !!(asp && asp.score !== null && asp.score > 0);
    const radius = (scoreVal / 100) * r;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push({ x, y, scoreVal, hasData });
  }

  // 4. Draw Filled Data Polygon
  if (points.length > 0) {
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  // 5. Draw Vertex Dots
  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = p.hasData ? '#059669' : '#94A3B8';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // 6. Draw Text Labels
  const labelOffsets = [
    { xOff: 0, yOff: -18, align: 'center' as CanvasTextAlign },
    { xOff: 18, yOff: -4, align: 'left' as CanvasTextAlign },
    { xOff: 18, yOff: 12, align: 'left' as CanvasTextAlign },
    { xOff: 0, yOff: 24, align: 'center' as CanvasTextAlign },
    { xOff: -18, yOff: 12, align: 'right' as CanvasTextAlign },
    { xOff: -18, yOff: -4, align: 'right' as CanvasTextAlign },
  ];

  for (let i = 0; i < numAxes; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
    const lx = cx + r * Math.cos(angle) + labelOffsets[i].xOff;
    const ly = cy + r * Math.sin(angle) + labelOffsets[i].yOff;

    const asp = aspects[i];
    const title = asp?.aspectTitle || defaultTitles[i];
    const scoreText =
      asp?.score !== null && asp?.score !== undefined ? `${asp.score}%` : 'Belum cukup data';
    const ratingText = asp?.ratingLabel ? ` (${asp.ratingLabel})` : '';

    ctx.textAlign = labelOffsets[i].align;
    ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(title, lx, ly);

    ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
    ctx.fillStyle = asp && asp.score !== null && asp.score > 0 ? '#047857' : '#64748B';
    ctx.fillText(`${scoreText}${ratingText}`, lx, ly + 14);
  }

  // 7. Legend strip at the bottom
  ctx.textAlign = 'center';
  ctx.font = 'normal 10px Arial, Helvetica, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText(
    'Peta Capaian 6 Aspek Perkembangan PAUD (Kurikulum Merdeka) • Target: Berkembang Sesuai Harapan (BSH)',
    cx,
    height - 12
  );

  return canvas;
}

/**
 * Returns the radar chart as Uint8Array (binary PNG) for direct embedding into Word (.docx).
 */
export async function renderRadarChartToPngBytes(
  aspects: { aspectKey: string; aspectTitle: string; score: number | null; ratingLabel: string }[],
  width = 640,
  height = 460
): Promise<Uint8Array | null> {
  try {
    const canvas = await renderRadarChartToCanvas(aspects, width, height);
    const dataUrl = canvas.toDataURL('image/png');
    const base64Str = dataUrl.split(',')[1];
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.warn('renderRadarChartToPngBytes failed:', err);
    return null;
  }
}

/**
 * Returns the radar chart as DataURL string for jsPDF / preview embedding.
 */
export async function renderRadarChartToDataUrl(
  aspects: { aspectKey: string; aspectTitle: string; score: number | null; ratingLabel: string }[],
  width = 640,
  height = 460
): Promise<string | null> {
  try {
    const canvas = await renderRadarChartToCanvas(aspects, width, height);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('renderRadarChartToDataUrl failed:', err);
    return null;
  }
}
