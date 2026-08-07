'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import QaReportView from '@/components/QaReportView';
import AttachToTicket from '@/components/AttachToTicket';
import type { Report } from '@/lib/types';

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeViewport, setActiveViewport] = useState(0);

  useEffect(() => {
    fetch(`/api/reports/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Report not found');
        return res.json();
      })
      .then(setReport)
      .catch((err) => setError(err.message));
  }, [params.id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Report Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const createdDate = new Date(report.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-slate-100 rounded-lg shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">Visual QA Report</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <AttachToTicket reportId={report.id} />
            <div className="text-right text-sm text-slate-500 hidden sm:block">
              <p className="font-medium text-slate-700">{createdDate}</p>
              <a
                href={report.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline truncate max-w-xs"
              >
                {report.url} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <QaReportView
          report={report}
          activeViewport={activeViewport}
          onViewportChange={setActiveViewport}
        />
      </main>
    </div>
  );
}
