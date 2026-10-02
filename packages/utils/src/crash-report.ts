/**
 * What an error boundary knows about a crash, made safe to send.
 *
 * Framework-free so the MUI boundary (portals, mWeb) and the Tamagui one
 * (native) build the same report and log the same rows — the Tech portal's
 * Error Boundaries page reads them by the marker below.
 */

/** Marker every boundary log carries, and the Tech portal filters on. */
export const BOUNDARY_LOG_COMPONENT = 'errorBoundary';

/** A crash the boundary caught, or the person pressing Report an Issue on it. */
export type BoundaryEvent = 'CAUGHT' | 'REPORTED';

/** Where the boundary sits: around the whole app, or around one page / screen. */
export type BoundaryScope = 'root' | 'page';

export interface CrashReport {
  /** Pairs the CAUGHT row with a later REPORTED one, and is the reference shown to the person. */
  crash_id: string;
  scope: BoundaryScope;
  /** Path only — query strings and hashes can carry tokens. */
  route: string;
  surface: string;
  platform: string;
  app_version?: string;
  name: string;
  message: string;
  stack?: string;
  component_stack?: string;
  occurred_at: string;
}

const STACK_LINES = 12;

/**
 * Secrets and personal data that turn up in error text: JWTs, bearer and
 * key=value credentials, email addresses and phone-length digit runs.
 */
const REDACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\beyJ[\w-]{4,}\.[\w-]{4,}\.[\w-]{4,}/g, '[token]'],
  [/\bbearer\s+[\w.~+/-]{8,}=*/gi, 'Bearer [token]'],
  [/\b(token|password|passwd|secret|api[_-]?key|authorization|otp)(["']?\s{0,3}[:=]\s{0,3}["']?)[^\s"'&,;]+/gi, '$1$2[redacted]'],
  [/[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){1,8}/g, '[email]'],
  [/\+?\d(?:[\s-]?\d){9,14}/g, '[number]'],
];

export function redactSensitive(text: string): string {
  return REDACTIONS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

const firstLines = (text: string | null | undefined) =>
  text ? redactSensitive(text.trim().split('\n').slice(0, STACK_LINES).join('\n')) : undefined;

const routeOnly = (route: string) => redactSensitive(route.split(/[?#]/)[0] || '/');

let sequence = 0;

/** Unique enough to pair two log rows; not a secret, so no crypto is needed. */
function crashId(now: Date): string {
  sequence += 1;
  return `${now.getTime().toString(36)}-${sequence.toString(36)}`;
}

function asError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) return error;
  return { name: 'Error', message: typeof error === 'string' ? error : 'Non-error value thrown' };
}

export function buildCrashReport(input: {
  error: unknown;
  componentStack?: string | null;
  scope: BoundaryScope;
  route: string;
  surface: string;
  platform: string;
  appVersion?: string;
  now?: Date;
}): CrashReport {
  const now = input.now ?? new Date();
  const error = asError(input.error);
  return {
    crash_id: crashId(now),
    scope: input.scope,
    route: routeOnly(input.route),
    surface: input.surface,
    platform: input.platform,
    app_version: input.appVersion,
    name: error.name || 'Error',
    message: redactSensitive(error.message || ''),
    stack: firstLines(error.stack),
    component_stack: firstLines(input.componentStack),
    occurred_at: now.toISOString(),
  };
}

/**
 * The scrubbed error for `logs.<surface>.error(route, BOUNDARY_LOG_COMPONENT, { error, … })` —
 * never the original, whose message and stack were not redacted.
 */
export function crashLogError(report: CrashReport): Error {
  const error = new Error(report.message);
  error.name = report.name;
  error.stack = report.stack;
  return error;
}

/**
 * The structured `data` beside it. These keys land verbatim in
 * TelemetryLog.data, which the Error Boundaries page renders and filters.
 */
export function crashLogData(report: CrashReport, event: BoundaryEvent): Record<string, string> {
  const data: Record<string, string> = {
    event,
    crash_id: report.crash_id,
    scope: report.scope,
    surface: report.surface,
  };
  if (report.component_stack) data.component_stack = report.component_stack;
  return data;
}

/** The body for `submitAppFeedback` when somebody presses Report an Issue on a crash screen. */
export function buildCrashReportMessage(report: CrashReport): string {
  const lines = [
    `Surface: ${report.surface}`,
    `Route: ${report.route}`,
    `Reference: ${report.crash_id}`,
    `Error: ${report.name}`,
    `Message: ${report.message}`,
    `Platform: ${report.platform}`,
    `When: ${report.occurred_at}`,
  ];
  if (report.app_version) lines.push(`App version: ${report.app_version}`);
  if (report.stack) lines.push('', report.stack);
  return lines.join('\n');
}
