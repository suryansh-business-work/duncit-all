/**
 * Is every pod's timing right? A pure function over pod rows, so each rule is
 * testable on its own and the tool around it only fetches and reports.
 *
 * Always checked:
 *   INVALID_DATE             the start (or end) is not a date at all
 *   MISSING_END              no end time — duration, overlap and completion cannot be judged
 *   END_NOT_AFTER_START      the pod ends before, or as, it starts
 *   COMPLETED_BEFORE_START   marked complete before it began
 *   CREATED_AFTER_START      created after its own start (back-dated)
 *   VENUE_OVERLAP            another live pod at the same venue overlaps it
 *   HOST_OVERLAP             one of its hosts is hosting another pod at the same time
 * Checked only when the caller gives the threshold (they are business rules,
 * not something to guess):
 *   TOO_SHORT / TOO_LONG     outside min/max duration minutes
 *   NOT_COMPLETED_AFTER_END  still not completed this many minutes after it ended
 */

export interface PodTimingRow {
  id: string;
  pod_title: string;
  pod_date_time: string;
  pod_end_date_time?: string | null;
  venue_id?: string | null;
  pod_hosts_id?: readonly string[] | null;
  pod_mode?: string | null;
  is_deleted?: boolean | null;
  completed_at?: string | null;
  created_at?: string | null;
}

export type TimingCheck =
  | 'INVALID_DATE'
  | 'MISSING_END'
  | 'END_NOT_AFTER_START'
  | 'COMPLETED_BEFORE_START'
  | 'CREATED_AFTER_START'
  | 'VENUE_OVERLAP'
  | 'HOST_OVERLAP'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'NOT_COMPLETED_AFTER_END';

export interface TimingIssue {
  check: TimingCheck;
  severity: 'error' | 'warning';
  pod_id: string;
  pod_title: string;
  start: string;
  end: string | null;
  detail: string;
  related_pod_id?: string;
}

export interface TimingAuditOptions {
  now: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  completionGraceMinutes?: number;
}

export interface TimingAuditResult {
  issues: TimingIssue[];
  checked: TimingCheck[];
  skipped: string[];
}

const MINUTE = 60_000;

interface Timed {
  row: PodTimingRow;
  start: number;
  end: number | null;
}

/** A live pod with a real window — the only kind that can collide with another. */
interface PodWindow extends Timed {
  end: number;
}

const toTime = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const minutes = (ms: number): number => Math.round(ms / MINUTE);

function issueFor(timed: Timed, check: TimingCheck, severity: TimingIssue['severity'], detail: string, related?: string): TimingIssue {
  const issue: TimingIssue = {
    check,
    severity,
    pod_id: timed.row.id,
    pod_title: timed.row.pod_title,
    start: timed.row.pod_date_time,
    end: timed.row.pod_end_date_time ?? null,
    detail,
  };
  if (related) issue.related_pod_id = related;
  return issue;
}

/** The single-pod rules. */
function checkPod(timed: Timed, options: TimingAuditOptions): TimingIssue[] {
  const issues: TimingIssue[] = [];
  const { row, start, end } = timed;
  if (end === null) {
    issues.push(issueFor(timed, 'MISSING_END', 'warning', 'The pod has no end time.'));
  } else if (end <= start) {
    issues.push(issueFor(timed, 'END_NOT_AFTER_START', 'error', `It ends ${minutes(start - end)} min before (or as) it starts.`));
  } else {
    const length = minutes(end - start);
    if (options.minDurationMinutes !== undefined && length < options.minDurationMinutes) {
      issues.push(issueFor(timed, 'TOO_SHORT', 'warning', `It lasts ${length} min, under the ${options.minDurationMinutes} min minimum.`));
    }
    if (options.maxDurationMinutes !== undefined && length > options.maxDurationMinutes) {
      issues.push(issueFor(timed, 'TOO_LONG', 'warning', `It lasts ${length} min, over the ${options.maxDurationMinutes} min maximum.`));
    }
    const grace = options.completionGraceMinutes;
    if (grace !== undefined && !row.completed_at && !row.is_deleted && end + grace * MINUTE < options.now) {
      issues.push(issueFor(timed, 'NOT_COMPLETED_AFTER_END', 'warning', `It ended ${minutes(options.now - end)} min ago and is still not completed.`));
    }
  }
  const completed = toTime(row.completed_at);
  if (completed !== null && completed < start) {
    issues.push(issueFor(timed, 'COMPLETED_BEFORE_START', 'error', `Marked complete ${minutes(start - completed)} min before it started.`));
  }
  const created = toTime(row.created_at);
  if (created !== null && created > start) {
    issues.push(issueFor(timed, 'CREATED_AFTER_START', 'warning', `Created ${minutes(created - start)} min after its own start time.`));
  }
  return issues;
}

/** Overlaps within each group (a venue, a host), each pair reported once on the later pod. */
function overlaps(groups: Map<string, PodWindow[]>, check: 'VENUE_OVERLAP' | 'HOST_OVERLAP', what: string): TimingIssue[] {
  const issues: TimingIssue[] = [];
  for (const [key, pods] of groups) {
    const sorted = [...pods].sort((a, b) => a.start - b.start);
    sorted.forEach((current, index) => {
      for (const later of sorted.slice(index + 1)) {
        if (later.start >= current.end) break;
        issues.push(
          issueFor(later, check, 'warning', `Overlaps "${current.row.pod_title}" at the same ${what} (${key}).`, current.row.id)
        );
      }
    });
  }
  return issues;
}

function addTo(groups: Map<string, PodWindow[]>, key: string, podWindow: PodWindow): void {
  const list = groups.get(key);
  if (list) list.push(podWindow);
  else groups.set(key, [podWindow]);
}

export function auditPodTimings(rows: readonly PodTimingRow[], options: TimingAuditOptions): TimingAuditResult {
  const issues: TimingIssue[] = [];
  const byVenue = new Map<string, PodWindow[]>();
  const byHost = new Map<string, PodWindow[]>();

  for (const row of rows) {
    const start = toTime(row.pod_date_time);
    const end = toTime(row.pod_end_date_time);
    if (start === null || (row.pod_end_date_time && end === null)) {
      issues.push({
        check: 'INVALID_DATE',
        severity: 'error',
        pod_id: row.id,
        pod_title: row.pod_title,
        start: row.pod_date_time,
        end: row.pod_end_date_time ?? null,
        detail: 'The start or end time is not a valid date.',
      });
      continue;
    }
    const timed: Timed = { row, start, end };
    issues.push(...checkPod(timed, options));
    if (row.is_deleted || end === null || end <= start) continue;
    const podWindow: PodWindow = { row, start, end };
    if (row.venue_id) addTo(byVenue, row.venue_id, podWindow);
    for (const host of new Set(row.pod_hosts_id ?? [])) addTo(byHost, host, podWindow);
  }
  issues.push(...overlaps(byVenue, 'VENUE_OVERLAP', 'venue'), ...overlaps(byHost, 'HOST_OVERLAP', 'host'));

  const checked: TimingCheck[] = [
    'INVALID_DATE',
    'MISSING_END',
    'END_NOT_AFTER_START',
    'COMPLETED_BEFORE_START',
    'CREATED_AFTER_START',
    'VENUE_OVERLAP',
    'HOST_OVERLAP',
  ];
  const skipped: string[] = [];
  if (options.minDurationMinutes === undefined) skipped.push('TOO_SHORT — pass min_duration_minutes to check it');
  else checked.push('TOO_SHORT');
  if (options.maxDurationMinutes === undefined) skipped.push('TOO_LONG — pass max_duration_minutes to check it');
  else checked.push('TOO_LONG');
  if (options.completionGraceMinutes === undefined) {
    skipped.push('NOT_COMPLETED_AFTER_END — pass completion_grace_minutes to check it');
  } else checked.push('NOT_COMPLETED_AFTER_END');
  return { issues, checked, skipped };
}
