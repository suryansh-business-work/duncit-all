import type { SlotLabels } from './types';

/**
 * The picker's copy, assembled from a surface's translator.
 *
 * Every key is written out as a literal `t('…')` call rather than built from a
 * namespace + suffix. Two reasons, and both matter:
 *  - `scripts/verify-translation-keys.mjs` greps source for the literal key, so
 *    a computed key would be reported as shipped-but-never-rendered and fail the
 *    Shared Gates job;
 *  - a typo in a computed key fails silently at runtime as blank text, while a
 *    literal one is greppable.
 *
 * The verbosity lives here, once, instead of at eleven call sites.
 */

export type SlotTranslate = (key: string) => string;

/** `mweb.slots.*` — mWeb and the native app (rule 27: one namespace for both). */
export function mwebSlotLabels(t: SlotTranslate): SlotLabels {
  return {
    date: t('mweb.slots.date'),
    hint: t('mweb.slots.hint'),
    availableSlots: t('mweb.slots.availableSlots'),
    free: t('mweb.slots.free'),
    today: t('mweb.slots.today'),
    tomorrow: t('mweb.slots.tomorrow'),
    loading: t('mweb.slots.loading'),
    empty: t('mweb.slots.empty'),
    emptyDay: t('mweb.slots.emptyDay'),
    previousMonth: t('mweb.slots.previousMonth'),
    nextMonth: t('mweb.slots.nextMonth'),
    pickVenueFirst: t('mweb.slots.pickVenueFirst'),
    currentlyBooked: t('mweb.slots.currentlyBooked'),
    wholeVenue: t('mweb.slots.wholeVenue'),
    wholeDay: t('mweb.slots.wholeDay'),
  };
}

/** `shell.slots.*` — every MUI portal. */
export function shellSlotLabels(t: SlotTranslate): SlotLabels {
  return {
    date: t('shell.slots.date'),
    hint: t('shell.slots.hint'),
    availableSlots: t('shell.slots.availableSlots'),
    free: t('shell.slots.free'),
    today: t('shell.slots.today'),
    tomorrow: t('shell.slots.tomorrow'),
    loading: t('shell.slots.loading'),
    empty: t('shell.slots.empty'),
    emptyDay: t('shell.slots.emptyDay'),
    previousMonth: t('shell.slots.previousMonth'),
    nextMonth: t('shell.slots.nextMonth'),
    pickVenueFirst: t('shell.slots.pickVenueFirst'),
    currentlyBooked: t('shell.slots.currentlyBooked'),
    wholeVenue: t('shell.slots.wholeVenue'),
    wholeDay: t('shell.slots.wholeDay'),
  };
}

/** Pick the namespace the calling surface ships. */
export function buildSlotLabels(
  t: SlotTranslate,
  namespace: 'mweb.slots' | 'shell.slots',
): SlotLabels {
  return namespace === 'mweb.slots' ? mwebSlotLabels(t) : shellSlotLabels(t);
}

/**
 * The onboarding meeting pickers reuse the calendar but replace its hint: a
 * booked meeting slot stays visible-and-disabled instead of vanishing, so the
 * venue wording would be wrong.
 */
export function mwebMeetingLabels(t: SlotTranslate, rescheduling: boolean): SlotLabels {
  return {
    ...mwebSlotLabels(t),
    hint: rescheduling ? t('mweb.slots.meetingRescheduleHint') : t('mweb.slots.meetingHint'),
  };
}

export function shellMeetingLabels(t: SlotTranslate, rescheduling: boolean): SlotLabels {
  return {
    ...shellSlotLabels(t),
    hint: rescheduling ? t('shell.slots.meetingRescheduleHint') : t('shell.slots.meetingHint'),
  };
}

/** The badge on the slot a rescheduling user currently holds. */
export function mwebCurrentLabel(t: SlotTranslate): string {
  return t('mweb.slots.current');
}

export function shellCurrentLabel(t: SlotTranslate): string {
  return t('shell.slots.current');
}
