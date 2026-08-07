export function normalizeUrl(raw: string): string {
  const u = raw.trim();
  if (u && !/^https?:\/\//i.test(u)) return 'https://' + u;
  return u;
}
