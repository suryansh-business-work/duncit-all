/**
 * Safely read a nested value from an object using a dotted/bracketed path
 * (e.g. "contacts.0.mobile_number" or "contacts[0].mobile_number"). Returns
 * undefined when any segment is missing. Used to surface Formik errors that
 * live below the top-level keys without depending on lodash.
 */
export function getNested(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}
