export interface AttendeePerson {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
  is_host: boolean;
  /**
   * Seats this person's booking holds. One face per person however many they
   * booked — the group is a label beside their name, never extra avatars, or
   * the same booking is counted twice on screen.
   */
  seats?: number;
}

export type Translate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

/**
 * "+3 other members" — the people a booking covers who are not on the app.
 * Word for word with mWeb through the shared bundle (rule 27).
 */
export function otherMembersLabel(seats: number, t: Translate): string {
  const others = Math.max(0, Math.floor(seats) - 1);
  if (others === 1) return t('mweb.podDetails.otherMembersOne');
  return t('mweb.podDetails.otherMembersMany', { vars: { count: others } });
}

/** One filled Backout seat, already resolved to display copy by the section —
 * computed once in the parent so both surfaces render identical rows. */
export interface SpotFillRow {
  key: string;
  old_user_id: string;
  old_name: string;
  old_photo: string | null;
  filled_by_label: string;
}
