import type { IssueKind, ParsedIssue } from './parse';

/**
 * The two places a parsed issue travels: the telemetry log that feeds the Tech
 * portal's Error Logs section, and the report a person chooses to send.
 */

/** Marker every issue log carries, and the Tech portal filters on. */
export const ISSUE_LOG_COMPONENT = 'serverIssue';

/**
 * Kinds where the server answered correctly and the person on the screen is
 * the one who acts: fix the input, sign in, ask for access, pick something
 * that still exists. Nothing is broken, so nothing should be logged as broken.
 */
const CALLER_FIXABLE_KINDS = new Set<IssueKind>([
  'VALIDATION',
  'AUTH',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
]);

/**
 * Which `logs.<surface>.<level>` an issue belongs on — the client twin of the
 * server's graphqlErrorLevel, and for the same reason: an ERROR row rolls up
 * into a Bug, so logging "add your billing address" as an error files a bug
 * against a working checkout and buries the real ones.
 *
 * Both levels are persisted, and the Error Logs section filters on
 * ISSUE_LOG_COMPONENT rather than on level, so a warn is still on the page.
 */
export function issueLogLevel(issue: ParsedIssue): 'warn' | 'error' {
  return CALLER_FIXABLE_KINDS.has(issue.kind) ? 'warn' : 'error';
}

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
