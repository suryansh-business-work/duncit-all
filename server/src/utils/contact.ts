/**
 * Display phone from a user's optional `auth.phone` subdoc.
 *
 * The extension is stored as the user typed it — `extRegex` (/^\+?\d{1,5}$/)
 * accepts a bare `91` as readily as `+91` — so the dialling code is normalised
 * here rather than at every read site. A dialling code with no number is not a
 * phone number, so it yields null instead of a stray `+91`.
 */
export const contactNumber = (
  extension?: string | null,
  number?: string | null,
): string | null => {
  const num = (number ?? '').trim();
  if (!num) return null;
  const ext = (extension ?? '').trim();
  if (!ext) return num;
  const prefix = ext.startsWith('+') ? ext : `+${ext}`;
  return `${prefix} ${num}`;
};

/** `contactNumber` straight off a user document. */
export const userContactNumber = (user: any): string | null =>
  contactNumber(user?.auth?.phone?.extension, user?.auth?.phone?.number);
