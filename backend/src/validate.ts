/**
 * URL validation and SSRF protection
 */

const HTTP_ONLY = /^https?:\/\//i;
const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i;
const PRIVATE_IP =
  /^https?:\/\/(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i;

export function isValidUrl(url: string): boolean {
  if (typeof url !== "string" || url.length > 2048) return false;
  if (!HTTP_ONLY.test(url)) return false;
  if (LOCALHOST.test(url)) return false;
  if (PRIVATE_IP.test(url)) return false;

  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
