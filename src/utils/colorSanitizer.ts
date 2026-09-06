/**
 * Color Sanitizer & Converter for HTML2Canvas and PDF Rendering
 * Converts modern CSS color functions (oklab, oklch, color-mix, lab, lch) into standard sRGB hex/rgba.
 * This prevents html2canvas from throwing: "Attempting to parse an unsupported color function oklab/oklch".
 */

let canvasCtx: CanvasRenderingContext2D | null = null;

function getCanvasContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!canvasCtx) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      canvasCtx = canvas.getContext('2d', { willReadFrequently: true });
    } catch {
      canvasCtx = null;
    }
  }
  return canvasCtx;
}

/**
 * Converts an oklab color string into rgba(r, g, b, a) using mathematical transform.
 */
export function oklabToRgba(oklabStr: string): string {
  const match = oklabStr.match(
    /oklab\(\s*([0-9.]+%?)\s+([+-]?[0-9.]+%?)\s+([+-]?[0-9.]+%?)(?:\s*\/\s*([0-9.]+%?))?\s*\)/i
  );
  if (!match) return 'rgba(15, 23, 42, 1)';

  let L = parseComponent(match[1]);
  let a = parseComponent(match[2], true);
  let b = parseComponent(match[3], true);
  let alpha = match[4] !== undefined ? parseAlpha(match[4]) : 1;

  // Oklab to linear LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Linear LMS to linear sRGB
  let rLin = +4.0767434099 * l - 3.3077115913 * m + 0.2309699292 * s;
  let gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Linear sRGB to standard sRGB (gamma correction)
  const r = Math.round(Math.min(255, Math.max(0, linearToSrgb(rLin) * 255)));
  const g = Math.round(Math.min(255, Math.max(0, linearToSrgb(gLin) * 255)));
  const bVal = Math.round(Math.min(255, Math.max(0, linearToSrgb(bLin) * 255)));

  return alpha < 1 ? `rgba(${r}, ${g}, ${bVal}, ${alpha})` : `rgb(${r}, ${g}, ${bVal})`;
}

/**
 * Converts an oklch color string into rgba(r, g, b, a).
 */
export function oklchToRgba(oklchStr: string): string {
  const match = oklchStr.match(
    /oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+(?:deg|rad|turn)?)(?:\s*\/\s*([0-9.]+%?))?\s*\)/i
  );
  if (!match) return 'rgba(15, 23, 42, 1)';

  let L = parseComponent(match[1]);
  let C = parseComponent(match[2]);
  let hue = parseHue(match[3]);
  let alpha = match[4] !== undefined ? parseAlpha(match[4]) : 1;

  let a = C * Math.cos(hue);
  let b = C * Math.sin(hue);

  return oklabToRgba(`oklab(${L} ${a} ${b} / ${alpha})`);
}

function parseComponent(val: string, allowNegative: boolean = false): number {
  val = val.trim();
  if (val.endsWith('%')) {
    return parseFloat(val) / 100;
  }
  return parseFloat(val);
}

function parseAlpha(val: string): number {
  val = val.trim();
  if (val.endsWith('%')) {
    return Math.min(1, Math.max(0, parseFloat(val) / 100));
  }
  return Math.min(1, Math.max(0, parseFloat(val)));
}

function parseHue(val: string): number {
  val = val.trim();
  let deg = 0;
  if (val.endsWith('turn')) {
    deg = parseFloat(val) * 360;
  } else if (val.endsWith('rad')) {
    return parseFloat(val);
  } else if (val.endsWith('deg')) {
    deg = parseFloat(val);
  } else {
    deg = parseFloat(val);
  }
  return (deg * Math.PI) / 180;
}

function linearToSrgb(c: number): number {
  const abs = Math.abs(c);
  if (abs <= 0.0031308) {
    return c * 12.92;
  }
  return (Math.sign(c) || 1) * (1.055 * Math.pow(abs, 1.0 / 2.4) - 0.055);
}

/**
 * Universal color resolver: Uses browser 2D context or fallback mathematical converters.
 */
export function resolveCssColor(colorStr: string): string {
  if (!colorStr) return colorStr;
  const trimmed = colorStr.trim();

  // If already standard hex or standard rgb/rgba, return as-is
  if (/^#([0-9a-f]{3,8})$/i.test(trimmed)) return trimmed;
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/i.test(trimmed)) return trimmed;

  // Try browser native conversion via canvas context
  const ctx = getCanvasContext();
  if (ctx) {
    try {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = trimmed;
      const resolved = ctx.fillStyle;
      if (resolved && !resolved.includes('oklab') && !resolved.includes('oklch')) {
        return resolved;
      }
    } catch {
      // fallback to manual parsers
    }
  }

  if (trimmed.startsWith('oklab(')) {
    return oklabToRgba(trimmed);
  }
  if (trimmed.startsWith('oklch(')) {
    return oklchToRgba(trimmed);
  }

  // Handle color-mix(in oklab, ...) or similar
  if (trimmed.includes('color-mix')) {
    return '#111827';
  }

  return trimmed;
}

/**
 * Recursively replaces any oklab/oklch/color-mix function inside a complex CSS string (e.g. boxShadow or background).
 */
export function sanitizeComplexCssValue(value: string): string {
  if (!value) return value;
  if (!value.includes('oklab') && !value.includes('oklch') && !value.includes('color-mix')) {
    return value;
  }

  // Replace oklab(...)
  let result = value.replace(/oklab\([^)]+\)/gi, (match) => {
    return resolveCssColor(match);
  });

  // Replace oklch(...)
  result = result.replace(/oklch\([^)]+\)/gi, (match) => {
    return resolveCssColor(match);
  });

  // Replace color-mix(...)
  result = result.replace(/color-mix\([^)]+\)/gi, 'rgba(15, 23, 42, 0.2)');

  return result;
}

/**
 * Comprehensive Sanitizer for HTML2Canvas Cloned Document
 * Completely neutralizes oklab/oklch from stylesheets, style tags, and computed styles.
 */
export function sanitizePdfDocumentStyles(clonedDoc: Document): void {
  // 1. Sanitize all <style> elements in the cloned document
  const styleElements = clonedDoc.querySelectorAll('style');
  styleElements.forEach((styleEl) => {
    if (styleEl.textContent && (styleEl.textContent.includes('oklab') || styleEl.textContent.includes('oklch') || styleEl.textContent.includes('color-mix'))) {
      styleEl.textContent = sanitizeComplexCssValue(styleEl.textContent);
    }
  });

  // 2. Sanitize all elements and force clean RGB/RGBA/HEX inline properties
  const allElements = clonedDoc.querySelectorAll('*');
  allElements.forEach((node) => {
    if (node instanceof HTMLElement || node instanceof SVGElement) {
      try {
        const computed = window.getComputedStyle(node);

        if (node instanceof HTMLElement) {
          // Color
          if (computed.color && (computed.color.includes('oklab') || computed.color.includes('oklch'))) {
            node.style.color = resolveCssColor(computed.color);
          }

          // Background Color
          if (computed.backgroundColor && (computed.backgroundColor.includes('oklab') || computed.backgroundColor.includes('oklch'))) {
            node.style.backgroundColor = resolveCssColor(computed.backgroundColor);
          }

          // Border Colors
          if (computed.borderTopColor && (computed.borderTopColor.includes('oklab') || computed.borderTopColor.includes('oklch'))) {
            node.style.borderTopColor = resolveCssColor(computed.borderTopColor);
          }
          if (computed.borderRightColor && (computed.borderRightColor.includes('oklab') || computed.borderRightColor.includes('oklch'))) {
            node.style.borderRightColor = resolveCssColor(computed.borderRightColor);
          }
          if (computed.borderBottomColor && (computed.borderBottomColor.includes('oklab') || computed.borderBottomColor.includes('oklch'))) {
            node.style.borderBottomColor = resolveCssColor(computed.borderBottomColor);
          }
          if (computed.borderLeftColor && (computed.borderLeftColor.includes('oklab') || computed.borderLeftColor.includes('oklch'))) {
            node.style.borderLeftColor = resolveCssColor(computed.borderLeftColor);
          }

          // Outline Color
          if (computed.outlineColor && (computed.outlineColor.includes('oklab') || computed.outlineColor.includes('oklch'))) {
            node.style.outlineColor = resolveCssColor(computed.outlineColor);
          }

          // Text Decoration Color
          if (computed.textDecorationColor && (computed.textDecorationColor.includes('oklab') || computed.textDecorationColor.includes('oklch'))) {
            node.style.textDecorationColor = resolveCssColor(computed.textDecorationColor);
          }

          // Box Shadow (Very common source of oklab in Tailwind v4!)
          if (computed.boxShadow && (computed.boxShadow.includes('oklab') || computed.boxShadow.includes('oklch') || computed.boxShadow.includes('color-mix'))) {
            node.style.boxShadow = sanitizeComplexCssValue(computed.boxShadow);
          }
        }

        // SVG Fill & Stroke
        if (node instanceof SVGElement) {
          if (computed.fill && (computed.fill.includes('oklab') || computed.fill.includes('oklch'))) {
            node.setAttribute('fill', resolveCssColor(computed.fill));
          }
          if (computed.stroke && (computed.stroke.includes('oklab') || computed.stroke.includes('oklch'))) {
            node.setAttribute('stroke', resolveCssColor(computed.stroke));
          }
        }
      } catch (e) {
        // Ignore nodes that cannot be accessed
      }
    }
  });
}
