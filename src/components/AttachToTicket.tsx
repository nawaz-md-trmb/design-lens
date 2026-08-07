'use client';

import { useState } from 'react';
import { Link2, Loader2, X } from 'lucide-react';

type Platform = 'jira' | 'azure-devops';

type Props = {
  reportId: string;
};

export default function AttachToTicket({ reportId }: Props) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>('jira');
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAttach = async () => {
    if (!ticketId.trim()) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/integrations/attach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          ticketId: ticketId.trim(),
          reportId,
          reportUrl: `${window.location.origin}/report/${reportId}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to attach');
      setMessage(data.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to attach');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
      >
        <Link2 className="w-4 h-4" />
        Attach to ticket
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Attach report to work item</h3>
              <button type="button" onClick={() => setOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                {(['jira', 'azure-devops'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      platform === p
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {p === 'jira' ? 'Jira' : 'Azure DevOps'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {platform === 'jira' ? 'Jira issue key' : 'Azure DevOps work item ID'}
                </label>
                <input
                  type="text"
                  placeholder={platform === 'jira' ? 'e.g. PROJ-123' : 'e.g. 1042'}
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Posts a summary with match scores, issues, and dev fix suggestions as a comment.
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              {message && (
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={handleAttach}
                disabled={loading || !ticketId.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Attach to {platform === 'jira' ? 'Jira' : 'Azure DevOps'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
