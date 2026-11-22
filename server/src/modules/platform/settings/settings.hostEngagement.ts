import { GraphQLError } from "graphql";

/**
 * Club Admin host engagement & performance — the Pod Settings group of the
 * same name. Kept out of settings.service (already past a thousand lines) so
 * the rules it adds read as one unit: the ranges, the clamps, and the status
 * list's own merge.
 *
 * The numbers are twins of `@duncit/utils` host-engagement.ts (the server has
 * no @duncit deps); the console cards refuse anything outside them.
 */

export const HOST_INACTIVITY_DAYS = { default: 14, min: 1, max: 90 } as const;
export const HOST_MONTHLY_POD_TARGET = { default: 8, min: 1, max: 100 } as const;
export const HOST_PERFORMANCE_NOTIFY_DAY = { default: 1, min: 1, max: 28 } as const;
export const HOST_UNDERPERFORM_THRESHOLD_PCT = { default: 100, min: 1, max: 100 } as const;
const MAX_STATUSES = 20;
const MAX_LABEL_LENGTH = 40;

export interface HostEngagementStatus {
  key: string;
  label: string;
  is_active: boolean;
}

/** The statuses a fresh install starts with, in the order a club admin works through them. */
export const DEFAULT_HOST_ENGAGEMENT_STATUSES: readonly HostEngagementStatus[] = [
  { key: "NOT_CONTACTED", label: "Not Contacted", is_active: true },
  { key: "CONTACTED", label: "Contacted", is_active: true },
  { key: "ENGAGING", label: "Engaging", is_active: true },
  { key: "ACTIVE", label: "Active", is_active: true },
  { key: "NOT_RESPONDING", label: "Not Responding", is_active: true },
  { key: "INACTIVE", label: "Inactive", is_active: true },
];

type Range = { readonly default: number; readonly min: number; readonly max: number };

/** A whole number held to the range; unset or non-numeric reads as the default
 * (`Number(null)` is 0, which would otherwise clamp to the minimum). */
const clampInt = (range: Range) => (value: unknown): number => {
  if (value === null || value === undefined || value === "") return range.default;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return range.default;
  return Math.min(range.max, Math.max(range.min, n));
};

export const cleanHostInactivityDays = clampInt(HOST_INACTIVITY_DAYS);
export const cleanHostMonthlyPodTarget = clampInt(HOST_MONTHLY_POD_TARGET);
export const cleanHostPerformanceNotifyDay = clampInt(HOST_PERFORMANCE_NOTIFY_DAY);
export const cleanHostUnderperformThresholdPct = clampInt(HOST_UNDERPERFORM_THRESHOLD_PCT);

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

/** A stable key from a label: "Call back later" → "CALL_BACK_LATER". */
export function statusKeyFromLabel(label: string): string {
  const collapsed = label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  let start = 0;
  let end = collapsed.length;
  while (start < end && collapsed[start] === "_") start += 1;
  while (end > start && collapsed[end - 1] === "_") end -= 1;
  return collapsed.slice(start, end).slice(0, MAX_LABEL_LENGTH) || "STATUS";
}

const isStatus = (value: unknown): value is HostEngagementStatus => {
  const row = value as Partial<HostEngagementStatus> | null;
  return typeof row?.key === "string" && row.key.length > 0 && typeof row.label === "string";
};

/**
 * The stored list as the apps read it: the defaults when nothing usable is
 * stored, else every well-formed row (a row written outside the service with
 * no `is_active` reads as active).
 */
export function readHostEngagementStatuses(stored: unknown): HostEngagementStatus[] {
  const rows = Array.isArray(stored) ? stored.filter(isStatus) : [];
  if (rows.length === 0) return DEFAULT_HOST_ENGAGEMENT_STATUSES.map((row) => ({ ...row }));
  return rows.map((row) => ({ key: row.key, label: row.label, is_active: row.is_active !== false }));
}

export interface HostEngagementStatusInput {
  key?: string | null;
  label: string;
  is_active: boolean;
}

function uniqueKey(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/**
 * An admin's edit of the status list, merged onto what is stored.
 *
 * Keys are the identity a club admin's saved status points at, so they never
 * change and never disappear: a row sent without a key is NEW and gets one
 * derived from its label; a stored key the admin left out is kept, switched
 * off, at the end — removing it would orphan every host already filed under
 * it. Labels and order are the admin's. Refused outright (rather than clamped)
 * when it cannot be applied as typed: an unknown or repeated key, a blank or
 * over-long label, too many rows, or nothing left active.
 */
export function mergeHostEngagementStatuses(
  input: readonly HostEngagementStatusInput[],
  stored: readonly HostEngagementStatus[],
): HostEngagementStatus[] {
  const storedKeys = new Set(stored.map((row) => row.key));
  const taken = new Set<string>(storedKeys);
  const seen = new Set<string>();
  const out: HostEngagementStatus[] = [];
  for (const row of input) {
    const label = String(row?.label ?? "").trim();
    if (!label) badInput("Every status needs a label.");
    if (label.length > MAX_LABEL_LENGTH) badInput(`A status label can be at most ${MAX_LABEL_LENGTH} characters.`);
    const given = row.key?.trim();
    if (given && !storedKeys.has(given)) badInput(`Unknown status key: ${given}.`);
    const key = given || uniqueKey(statusKeyFromLabel(label), taken);
    if (seen.has(key)) badInput(`The status ${key} is listed twice.`);
    seen.add(key);
    taken.add(key);
    out.push({ key, label, is_active: row.is_active !== false });
  }
  for (const row of stored) {
    if (!seen.has(row.key)) out.push({ ...row, is_active: false });
  }
  if (out.length > MAX_STATUSES) badInput(`At most ${MAX_STATUSES} statuses can be configured.`);
  if (!out.some((row) => row.is_active)) badInput("At least one status must stay active.");
  return out;
}

/** Everything the host engagement features read from Pod Settings, already clamped. */
export interface HostEngagementSettings {
  inactivity_days: number;
  monthly_pod_target: number;
  statuses: HostEngagementStatus[];
  notify_enabled: boolean;
  notify_day: number;
  notify_hosts: boolean;
  notify_club_admins: boolean;
  underperform_threshold_pct: number;
}

/** The settings document's host-engagement half, as the features read it. */
export function hostEngagementSettingsOf(doc: Record<string, unknown> | null | undefined): HostEngagementSettings {
  return {
    inactivity_days: cleanHostInactivityDays(doc?.host_inactivity_days),
    monthly_pod_target: cleanHostMonthlyPodTarget(doc?.host_monthly_pod_target),
    statuses: readHostEngagementStatuses(doc?.host_engagement_statuses),
    notify_enabled: doc?.host_performance_notify_enabled === true,
    notify_day: cleanHostPerformanceNotifyDay(doc?.host_performance_notify_day),
    notify_hosts: doc?.host_performance_notify_hosts !== false,
    notify_club_admins: doc?.host_performance_notify_club_admins !== false,
    underperform_threshold_pct: cleanHostUnderperformThresholdPct(doc?.host_underperform_threshold_pct),
  };
}

/** The AppSettings fields the public settings payload carries for this group. */
export function hostEngagementPub(doc: Record<string, unknown> | null | undefined) {
  const s = hostEngagementSettingsOf(doc);
  return {
    host_inactivity_days: s.inactivity_days,
    host_monthly_pod_target: s.monthly_pod_target,
    host_engagement_statuses: s.statuses,
    host_performance_notify_enabled: s.notify_enabled,
    host_performance_notify_day: s.notify_day,
    host_performance_notify_hosts: s.notify_hosts,
    host_performance_notify_club_admins: s.notify_club_admins,
    host_underperform_threshold_pct: s.underperform_threshold_pct,
  };
}

/** Pass-through booleans of this group, copied as-is when supplied. */
export const HOST_ENGAGEMENT_BOOLEAN_FIELDS = [
  "host_performance_notify_enabled",
  "host_performance_notify_hosts",
  "host_performance_notify_club_admins",
] as const;

/** Numbers of this group, each with its clamp. */
export const HOST_ENGAGEMENT_CLEANED_FIELDS = [
  ["host_inactivity_days", cleanHostInactivityDays],
  ["host_monthly_pod_target", cleanHostMonthlyPodTarget],
  ["host_performance_notify_day", cleanHostPerformanceNotifyDay],
  ["host_underperform_threshold_pct", cleanHostUnderperformThresholdPct],
] as const;
