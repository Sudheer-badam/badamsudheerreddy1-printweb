/**
 * YouPI Authentic Vector QR Code Engine (Pure TypeScript / JavaScript).
 * Generates crisp scannable QR codes for all UPI applications without external APIs.
 */
import { qrcode } from "./qr-lib.js";

export class QrCode {
  /**
   * Generates a 2D binary matrix for the input text.
   */
  static encode(text: string, errorCorrection: "L" | "M" | "Q" | "H" = "M"): number[][] {
    const qr = qrcode(0, errorCorrection);
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const matrix: number[][] = [];
    for (let r = 0; r < count; r++) {
      const row: number[] = [];
      for (let c = 0; c < count; c++) {
        row.push(qr.isDark(r, c) ? 1 : 0);
      }
      matrix.push(row);
    }
    return matrix;
  }
}

/**
 * Generates valid SVG markup for genuine QR Code.
 */
export function generateQrSvg(
  text: string,
  boxSize = 240,
  errorCorrection: "L" | "M" | "Q" | "H" = "M"
): string {
  const matrix = QrCode.encode(text, errorCorrection);
  const numModules = matrix.length;
  const moduleSize = boxSize / numModules;

  let rects = "";
  for (let r = 0; r < numModules; r++) {
    for (let c = 0; c < numModules; c++) {
      if (matrix[r][c] === 1) {
        const x = (c * moduleSize).toFixed(2);
        const y = (r * moduleSize).toFixed(2);
        const s = (moduleSize + 0.05).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#0f172a" />\n`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boxSize} ${boxSize}" width="100%" height="100%" shape-rendering="crispEdges">
  <rect width="${boxSize}" height="${boxSize}" fill="#ffffff" rx="8" />
  ${rects}
</svg>`;
}

/**
 * Generates Data URL for QR Code image source (<img src={...} />).
 */
export function generateQrDataUrl(
  text: string,
  scale = 6,
  margin = 2,
  errorCorrection: "L" | "M" | "Q" | "H" = "M"
): string {
  try {
    const qr = qrcode(0, errorCorrection);
    qr.addData(text);
    qr.make();
    return qr.createDataURL(scale, margin);
  } catch (err) {
    console.error("QR Data URL generation failed:", err);
    return "";
  }
}
