import { FREE_REASONS, FREE_REASON_KEY, freeReasonKey } from '@duncit/utils';
import { fmtWhen } from '../monitoring/queries';
import type { FreeArrangementRow, FreeJustificationRow } from './queries';

type Translate = (key: string) => string;
type ChipTone = 'default' | 'warning' | 'success' | 'error';

/** What is free on the row (`FreeArrangementRow.kind`). */
export const FREE_KIND_KEY: Readonly<Record<string, string>> = {
  FREE_POD: 'admin.freeArrangements.kind.freePod',
  FREE_VENUE: 'admin.freeArrangements.kind.freeVenue',
  BOTH: 'admin.freeArrangements.kind.both',
};

/** The venue's answer (`venue_approval_status`), as the chip and the filter name it. */
export const VENUE_ANSWER_KEY: Readonly<Record<string, string>> = {
  NONE: 'admin.freeArrangements.venueStatus.none',
  PENDING: 'admin.freeArrangements.venueStatus.pending',
  APPROVED: 'admin.freeArrangements.venueStatus.approved',
  DECLINED: 'admin.freeArrangements.venueStatus.declined',
};

export const VENUE_ANSWER_TONE: Readonly<Record<string, ChipTone>> = {
  NONE: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  DECLINED: 'error',
};

/** A known value's label; an unknown one (a newer server) reads as itself. */
const labelOf = (keys: Readonly<Record<string, string>>, value: string, t: Translate) =>
  keys[value] ? t(keys[value]) : value;

export const kindLabel = (row: FreeArrangementRow, t: Translate) => labelOf(FREE_KIND_KEY, row.kind, t);

export const venueAnswerLabel = (row: FreeArrangementRow, t: Translate) =>
  labelOf(VENUE_ANSWER_KEY, row.venue_approval_status, t);

/** The reason filter: matched against the pod's and the venue's justification alike. */
export const freeReasonOptions = (t: Translate) =>
  FREE_REASONS.map((value) => ({ value, label: t(FREE_REASON_KEY[value]) }));

export const venueAnswerOptions = (t: Translate) =>
  Object.keys(VENUE_ANSWER_KEY).map((value) => ({ value, label: t(VENUE_ANSWER_KEY[value]) }));

/** The pod's justification, then the venue's — whichever the row has. */
const justificationsOf = (row: FreeArrangementRow): FreeJustificationRow[] =>
  [row.free_justification, row.venue_free_justification].filter((item): item is FreeJustificationRow => !!item);

/** Each distinct non-empty value once, in order; an em dash when there is none (a pod from before the policy). */
const joinDistinct = (values: readonly string[]) => {
  const distinct = [...new Set(values.filter(Boolean))];
  return distinct.length > 0 ? distinct.join(' · ') : '—';
};

export const reasonText = (row: FreeArrangementRow, t: Translate) =>
  joinDistinct(
    justificationsOf(row).map((item) => {
      const key = freeReasonKey(item.reason);
      return key ? t(key) : item.reason;
    }),
  );

export const detailsText = (row: FreeArrangementRow) => joinDistinct(justificationsOf(row).map((item) => item.details));

/** When the free policy was accepted, in the admin's date-time format. */
export const acceptedText = (row: FreeArrangementRow) =>
  joinDistinct(justificationsOf(row).map((item) => (item.accepted_at ? fmtWhen(item.accepted_at) : '')));

/** Cancelled pods stay listed — an audit keeps what happened. */
export const statusKey = (row: FreeArrangementRow) => {
  if (row.cancelled) return 'admin.eventTickets.cancelled';
  return row.is_active ? 'admin.profile.active' : 'admin.pods.draft';
};

export const statusTone = (row: FreeArrangementRow): ChipTone => {
  if (row.cancelled) return 'error';
  return row.is_active ? 'success' : 'default';
};
