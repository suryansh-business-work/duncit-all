/**
 * Monthly employee targets — the shape both ends of the flow agree on.
 *
 * The Targets console assigns a month's goals and reviews the report; the
 * Employee console shows the goals and files the report. Same record, same
 * statuses, same limits and the same selection, read by two portals — so they
 * live here once (rule 40). Data and pure helpers only: the two consoles share
 * the shape, never the UI.
 *
 * TWIN: `EMPLOYEE_TARGET_LIMITS` mirrors server/src/modules/targets/
 * employeeTarget/employeeTarget.rules.ts, which re-checks every write (the
 * server imports no @duncit/* package). Change one, change the other.
 */

export const EMPLOYEE_TARGET_STATUSES = ['ASSIGNED', 'SUBMITTED', 'REVIEWED'] as const;
export type EmployeeTargetStatus = (typeof EMPLOYEE_TARGET_STATUSES)[number];

/** Chip colour per state, so the two consoles never disagree about what amber means. */
export const EMPLOYEE_TARGET_STATUS_COLORS = {
  ASSIGNED: 'info',
  SUBMITTED: 'warning',
  REVIEWED: 'success',
} as const;

/** Status -> translation key, written out so the rule-38 gate sees every key as a literal. */
export const EMPLOYEE_TARGET_STATUS_KEYS: Readonly<Record<EmployeeTargetStatus, string>> = {
  ASSIGNED: 'employeeTargets.status.ASSIGNED',
  SUBMITTED: 'employeeTargets.status.SUBMITTED',
  REVIEWED: 'employeeTargets.status.REVIEWED',
};

/** The status filter's choices, labelled — one list for the Targets and Employee tables. */
export const employeeTargetStatusOptions = (
  t: (key: string) => string,
): { value: EmployeeTargetStatus; label: string }[] =>
  EMPLOYEE_TARGET_STATUSES.map((value) => ({ value, label: t(EMPLOYEE_TARGET_STATUS_KEYS[value]) }));

export const EMPLOYEE_TARGET_LIMITS = {
  goalsMax: 20,
  goalTitleMax: 120,
  goalDescriptionMax: 1000,
  goalUnitMax: 40,
  goalTargetMax: 1_000_000_000_000,
  notesMax: 2000,
  achievementsMax: 30,
  achievementTitleMax: 120,
  achievementDetailsMax: 2000,
  updatesMax: 5000,
  commentMax: 2000,
} as const;

/** Targets > Settings: the month-end reminder window's ranges (twin of the server's REMINDER_BOUNDS). */
export const EMPLOYEE_TARGET_REMINDER_BOUNDS = {
  daysBeforeEnd: { min: 1, max: 15 },
  graceDays: { min: 0, max: 15 },
} as const;

/** The GraphQL selection both consoles make on `EmployeeTarget`. */
export const EMPLOYEE_TARGET_SELECTION = `
  id
  employee {
    user_id
    name
    email
  }
  month
  goals {
    title
    description
    target_value
    unit
  }
  goal_count
  notes
  status
  submission {
    completion_percent
    achievements {
      title
      details
    }
    updates
    submitted_at
    submission_count
  }
  review {
    comment
    reviewed_by {
      user_id
      name
    }
    reviewed_at
  }
  reminder_active
  revision
  assigned_by {
    user_id
    name
  }
  created_at
  updated_at
`;

export interface EmployeeTargetGoal {
  title: string;
  description: string;
  target_value: number | null;
  unit: string;
}

export interface EmployeeTargetAchievement {
  title: string;
  details: string;
}

/** One target, as both consoles read it back through {@link EMPLOYEE_TARGET_SELECTION}. */
export interface EmployeeTargetRecord {
  id: string;
  employee: { user_id: string; name: string; email: string | null };
  month: string;
  goals: EmployeeTargetGoal[];
  goal_count: number;
  notes: string;
  status: EmployeeTargetStatus;
  submission: {
    completion_percent: number;
    achievements: EmployeeTargetAchievement[];
    updates: string;
    submitted_at: string;
    submission_count: number;
  } | null;
  review: { comment: string; reviewed_by: { user_id: string; name: string }; reviewed_at: string } | null;
  reminder_active: boolean;
  revision: number;
  assigned_by: { user_id: string; name: string };
  created_at: string;
  updated_at: string;
}

/** Goals are the admin's promise: only changed before any progress is reported. */
export const canEditTargetGoals = (status: EmployeeTargetStatus): boolean => status === 'ASSIGNED';
/** The employee reports, and may correct the report, until it is reviewed. */
export const canSubmitTarget = (status: EmployeeTargetStatus): boolean => status !== 'REVIEWED';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM` for the calendar month a picked date falls in (its local fields — what the picker showed). */
export const monthKeyOf = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

/** The first of the month a `YYYY-MM` key names, as a local date for a picker; null for anything else. */
export function dateOfMonthKey(key: string | null | undefined): Date | null {
  if (!key || key.length !== 7 || key[4] !== '-') return null;
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

/**
 * "November 2026" for `2026-11`, in the reader's locale — the month's name and
 * year from Intl, so no date pattern is written here. An unreadable key is
 * shown as it is rather than as a blank.
 */
export function formatMonthKey(key: string, locale?: string): string {
  const date = dateOfMonthKey(key);
  if (!date) return key;
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}
