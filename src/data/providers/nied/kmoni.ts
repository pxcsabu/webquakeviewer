/**
 * NIED strong-motion image URL builder.
 *
 * The format is taken from the public KyoshinMonitorLib / KyoshinEewViewerIngen
 * implementation:
 *   http://www.kmoni.bosai.go.jp/data/map_img/RealTimeImg/jma_s/YYYYMMDD/YYYYMMDDHHmmss.jma_s.gif
 *
 * The endpoint is HTTP-only. An HTTPS GitHub Pages application cannot embed or
 * fetch it without mixed-content or proxy violations, so EarthScope only
 * generates a link for the user to open directly.
 */
export const KMONI_IMAGE_BASE =
  'http://www.kmoni.bosai.go.jp/data/map_img/RealTimeImg/jma_s';

export const KMONI_REFERENCE_URL =
  'https://github.com/ingen084/KyoshinEewViewerIngen';

function jstParts(date: Date): {
  date: string;
  timestamp: string;
} {
  // Shift to UTC+9 and use UTC getters so the result does not depend on the
  // browser's local timezone.
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jst.getUTCDate()).padStart(2, '0');
  const hours = String(jst.getUTCHours()).padStart(2, '0');
  const minutes = String(jst.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jst.getUTCSeconds()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  return {
    date: datePart,
    timestamp: `${datePart}${hours}${minutes}${seconds}`,
  };
}

export function buildKmoniImageUrl(date: Date): string {
  const parts = jstParts(date);
  return `${KMONI_IMAGE_BASE}/${parts.date}/${parts.timestamp}.jma_s.gif`;
}
