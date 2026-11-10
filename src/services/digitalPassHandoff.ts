/** Only the QR issued by the DNS operator can populate a customer activation. */
export type OperatorHandoff = { number: string; code: string };
export function parseOperatorHandoffQr(payload: string, expectedOrigin: string): OperatorHandoff | null {
  if (typeof payload !== 'string' || payload.length > 2048) return null;
  let url: URL;
  try { url = new URL(payload); } catch { return null; }
  if (url.origin !== expectedOrigin || url.username || url.password || url.search ||
      !['/dns-workspace/pass.html', '/pass.html'].includes(url.pathname) ||
      (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) ||
      !url.hash.startsWith('#activation?')) return null;
  const fields = new URLSearchParams(url.hash.slice('#activation?'.length));
  if (Array.from(fields.keys()).some(key => !['number','code'].includes(key)) ||
      fields.getAll('number').length !== 1 || fields.getAll('code').length !== 1) return null;
  const number = fields.get('number') || '';
  const code = fields.get('code') || '';
  return /^\d{1,12}$/.test(number) && /^[A-HJ-NP-Z2-9]{6}$/.test(code) ? { number, code } : null;
}
