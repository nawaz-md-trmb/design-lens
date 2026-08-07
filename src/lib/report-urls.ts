/** Client-safe report asset URL helper (no Node.js imports). */
export function reportAssetBase(reportId: string): string {
  return `/api/reports/${reportId}/assets`;
}
