import { DIGITS } from '@duncit/regex';

/**
 * The outer bounds an admin's own limits must sit inside, shared by the API
 * (which refuses anything outside them) and both apps' forms (which say so
 * before the round trip). A typo in the console — an extra zero, a minus
 * sign — is refused rather than saved.
 */
export const SETTING_BOUNDS = {
  ticketPrice: { min: 0, max: 10_000_000 },
  eventCapacity: { min: 1, max: 1_000_000 },
  seatsPerRegistration: { min: 1, max: 100 },
  reminderHour: { min: 1, max: 720 },
  sortOrder: { min: 0, max: 9999 },
} as const;

export interface CountRange {
  min: number;
  max: number;
}

export type CountIssue = 'negative' | 'notWhole' | 'belowMin' | 'aboveMax';

/** What is wrong with a number typed into a box, or null when it is a whole number inside the range. */
export function countIssue(raw: string, { min, max }: CountRange): CountIssue | null {
  const value = raw.trim();
  if (value.startsWith('-')) return 'negative';
  if (!DIGITS.test(value)) return 'notWhole';
  const n = Number(value);
  if (n < min) return 'belowMin';
  if (n > max) return 'aboveMax';
  return null;
}
