/**
 * The 12-hour clock, as a chip picker has to model it (project rule 11).
 *
 * MUI X only needs to be told `ampm` — it redraws its own clock face from
 * there. A native picker draws its own hour strip, so it has to be handed the
 * hours to offer and the words to write on them.
 *
 * The hour VALUE stays 0–23 on both clocks: only the label and the meridiem row
 * change, so nothing downstream of a picker — a draft, a validator, an 'HH:mm'
 * on the wire — ever has to know which clock the admin chose.
 */

export const MERIDIEMS = ['AM', 'PM'] as const;
export type Meridiem = (typeof MERIDIEMS)[number];

/** One hour a strip offers: the 0–23 value it sets, and how it is written. */
export interface HourChip {
  /** 0–23 — what the picker stores, whichever clock is shown. */
  hour: number;
  /** '00'…'23' on a 24-hour clock; '12', '1'…'11' on a 12-hour one. */
  label: string;
}

const pad2 = (value: number) => String(value).padStart(2, '0');

/** The half of the day a 0–23 hour falls in. */
export function meridiemOf(hour: number): Meridiem {
  return hour < 12 ? 'AM' : 'PM';
}

/** The same clock number in the other half — 09 ⇄ 21, midnight ⇄ noon. */
export function withMeridiem(hour: number, meridiem: Meridiem): number {
  return (hour % 12) + (meridiem === 'PM' ? 12 : 0);
}

/** How a 0–23 hour is written on a 12-hour face: midnight and noon are both 12. */
export function twelveHourLabel(hour: number): string {
  return String(hour % 12 === 0 ? 12 : hour % 12);
}

/**
 * The hour chips to draw. A 24-hour clock offers all 24, labelled 00…23; a
 * 12-hour clock offers the twelve hours of `meridiem`, labelled in clock order
 * (12, 1 … 11) and still carrying their 0–23 value.
 */
export function hourChips(twelveHour: boolean, meridiem: Meridiem = 'AM'): HourChip[] {
  if (!twelveHour) {
    return Array.from({ length: 24 }, (_, hour) => ({ hour, label: pad2(hour) }));
  }
  const base = meridiem === 'PM' ? 12 : 0;
  return Array.from({ length: 12 }, (_, index) => ({
    hour: base + index,
    label: twelveHourLabel(base + index),
  }));
}
