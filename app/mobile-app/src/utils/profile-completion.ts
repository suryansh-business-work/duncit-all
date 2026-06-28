/**
 * Profile-completion meter — a pure, read-only calculation shared by the Account
 * (Profile Settings) screen. RN twin of mWeb's account-edit `completion.ts`, so
 * both surfaces show the same percentage. No backend write.
 */

/** The profile fields that count toward completion (the editable, meaningful set). */
export const COMPLETION_FIELDS = [
  'first_name',
  'last_name',
  'bio',
  'dob',
  'city',
  'state',
  'country',
  'phone_number',
  'whatsapp_number',
  'profile_photo',
] as const;

export type CompletionField = (typeof COMPLETION_FIELDS)[number];

export type ProfileForCompletion = Partial<Record<CompletionField, string | null | undefined>>;

/** True when a field has a non-blank value (trimmed). */
function isFilled(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Percentage (0–100, rounded) of the meaningful profile fields that are filled.
 * Read-only display — no backend write.
 */
export function profileCompletion(profile: ProfileForCompletion): number {
  const filled = COMPLETION_FIELDS.filter((field) => isFilled(profile[field])).length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}
