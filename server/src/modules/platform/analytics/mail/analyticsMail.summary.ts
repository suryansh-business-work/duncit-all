import { logs } from '@observability/log';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import type { AnalyticsReport } from './analyticsMail.report';

/**
 * The AI's reading of a report — the few things that matter, for the top of
 * the mail and the PDF. It reads only the numbers the report already shows,
 * through the `analytics.report_summary` prompts (AI Library), in the
 * reader's language. A report never waits on it: with OpenAI unset or an
 * answer that is not the agreed JSON, the report goes without a summary.
 */

export interface ReportSummary {
  headline: string;
  highlights: string[];
  concerns: string[];
  watch: string[];
}

const strings = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').slice(0, max)
    : [];

/** The report as the prompt reads it: what each tile says, never the raw data behind it. */
function reportData(report: AnalyticsReport, language: string) {
  return {
    language,
    period: report.period,
    dashboards: report.sections.map((section) =>
      section.error
        ? { title: section.title, error: section.error }
        : {
            title: section.title,
            tiles: section.kpis.map((kpi) => ({ title: kpi.title, value: kpi.value, change: kpi.change, tone: kpi.tone })),
          }
    ),
  };
}

function parseSummary(content: string): ReportSummary | null {
  const parsed: unknown = JSON.parse(content);
  if (!parsed || typeof parsed !== 'object') return null;
  const answer = parsed as Record<string, unknown>;
  const headline = typeof answer.headline === 'string' ? answer.headline.trim() : '';
  if (!headline) return null;
  return {
    headline,
    highlights: strings(answer.highlights, 4),
    concerns: strings(answer.concerns, 4),
    watch: strings(answer.watch, 3),
  };
}

export async function summarizeReport(report: AnalyticsReport, language: string): Promise<ReportSummary | null> {
  try {
    const [system, user] = await Promise.all([
      resolvePrompt('analytics.report_summary'),
      resolvePrompt('analytics.report_summary.user', { report_data: JSON.stringify(reportData(report, language)) }),
    ]);
    const res = await openaiChat({
      task: 'platform.analytics_summary',
      detail: report.title,
      model: system.model,
      temperature: 0.2,
      json: true,
      messages: [
        { role: 'system', content: system.content },
        { role: 'user', content: user.content },
      ],
    });
    if (!res.ok) {
      logs.server.warn('analytics-mail', 'summary', { code: res.code, msg: res.message });
      return null;
    }
    return parseSummary(res.content);
  } catch (err) {
    logs.server.error('analytics-mail', 'summary', { error: err, msg: 'summary failed' });
    return null;
  }
}
