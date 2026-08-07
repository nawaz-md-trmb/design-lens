import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import type { Report } from '@/lib/types';
import { buildQaReport } from '@/lib/qa-report';

export const maxDuration = 30;

type AttachBody = {
  platform: 'jira' | 'azure-devops';
  ticketId: string;
  reportId: string;
  reportUrl?: string;
};

function buildComment(report: Report, reportUrl: string): string {
  const qa = buildQaReport(report);
  const lines = [
    'h3. Visual QA Report',
    '',
    `*Result:* ${qa.overallLabel}`,
    qa.overallSummary,
    '',
    `*URL tested:* ${report.url}`,
    `*Full report:* ${reportUrl}`,
    '',
    'h4. For Developers',
    ...qa.devChecklist.map((item) => `* ${item}`),
    '',
    'h4. For QA',
    ...qa.qaChecklist.map((item, i) => `# ${i + 1}. ${item}`),
  ];
  return lines.join('\n');
}

function buildMarkdownComment(report: Report, reportUrl: string): string {
  const qa = buildQaReport(report);
  const lines = [
    '## Visual QA Report',
    '',
    `**Result: ${qa.overallLabel}**`,
    '',
    qa.overallSummary,
    '',
    `**URL tested:** ${report.url}`,
    `**Full report:** ${reportUrl}`,
    '',
    '### For Developers',
    ...qa.devChecklist.map((item) => `- ${item}`),
    '',
    '### For QA',
    ...qa.qaChecklist.map((item, i) => `${i + 1}. ${item}`),
  ];
  return lines.join('\n');
}

async function attachToJira(ticketId: string, body: string): Promise<void> {
  const base = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!base || !email || !token) {
    throw new Error(
      'Jira not configured. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN in environment.',
    );
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const res = await fetch(`${base.replace(/\/$/, '')}/rest/api/3/issue/${ticketId}/comment`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: body }],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jira API error (${res.status}): ${err}`);
  }
}

async function attachToAzureDevOps(
  ticketId: string,
  body: string,
): Promise<void> {
  const org = process.env.ADO_ORG;
  const project = process.env.ADO_PROJECT;
  const pat = process.env.ADO_PAT;
  if (!org || !project || !pat) {
    throw new Error(
      'Azure DevOps not configured. Set ADO_ORG, ADO_PROJECT, and ADO_PAT in environment.',
    );
  }

  const auth = Buffer.from(`:${pat}`).toString('base64');
  const res = await fetch(
    `https://dev.azure.com/${org}/${project}/_apis/wit/workitems/${ticketId}/comments?api-version=7.0-preview.3`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: body }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Azure DevOps API error (${res.status}): ${err}`);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AttachBody;
    const { platform, ticketId, reportId } = payload;

    if (!platform || !ticketId?.trim() || !reportId?.trim()) {
      return NextResponse.json(
        { error: 'platform, ticketId, and reportId are required' },
        { status: 400 },
      );
    }

    const reportPath = path.join(process.cwd(), 'public', 'reports', reportId, 'report.json');
    const report = JSON.parse(await readFile(reportPath, 'utf-8')) as Report;

    const origin = new URL(request.url).origin;
    const reportUrl = payload.reportUrl ?? `${origin}/report/${reportId}`;

    const comment =
      platform === 'jira'
        ? buildComment(report, reportUrl)
        : buildMarkdownComment(report, reportUrl);

    if (platform === 'jira') {
      await attachToJira(ticketId.trim().toUpperCase(), comment);
    } else {
      await attachToAzureDevOps(ticketId.trim(), comment);
    }

    return NextResponse.json({
      ok: true,
      message: `Report attached to ${platform === 'jira' ? 'Jira' : 'Azure DevOps'} ${ticketId}`,
      reportUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to attach report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
