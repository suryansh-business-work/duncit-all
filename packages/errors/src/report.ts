import type { ParsedIssue } from './parse';

/**
 * The two places a parsed issue travels: the telemetry log that feeds the Tech
 * portal's Error Logs section, and the report a person chooses to send.
 */

/** Marker every issue log carries, and the Tech portal filters on. */
export const ISSUE_LOG_COMPONENT = 'serverIssue';

/**
 * The structured `data` for `logs.<surface>.error(page, ISSUE_LOG_COMPONENT, …)`.
 * These keys land verbatim in TelemetryLog.data (Mixed), which is what the
 * Error Logs section renders — so the shape here IS the section's contract.
 */
export function issueLogData(issue: ParsedIssue): Record<string, string> {
  const data: Record<string, string> = { kind: issue.kind };
  if (issue.code) data.code = issue.code;
  if (issue.operation) data.operation = issue.operation;
  if (issue.path) data.gql_path = issue.path;
  return data;
}

/** Category the report files under in the existing feedback pipeline. */
export const ISSUE_REPORT_CATEGORY = 'BUG';

/**
 * The message body for `submitAppFeedback` when somebody presses Report issue.
 * Plain lines rather than JSON: the row lands in Slack and the support
 * feedback table, both read by people.
 */
export function buildIssueReportMessage(
  issue: ParsedIssue,
  context: { surface: string; page: string }
): string {
  const lines = [
    `Server operation failed on ${context.surface} · ${context.page}`,
    `Message: ${issue.message}`,
    `Kind: ${issue.kind}`,
  ];
  if (issue.code) lines.push(`Code: ${issue.code}`);
  if (issue.operation) lines.push(`Operation: ${issue.operation}`);
  if (issue.path) lines.push(`Path: ${issue.path}`);
  return lines.join('\n');
}
