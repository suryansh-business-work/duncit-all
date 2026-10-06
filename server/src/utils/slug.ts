/**
 * `Dry Food & Treats!` → `dry-food-treats`. Accents are folded first, so
 * `Café Meetups` becomes `cafe-meetups`, and splitting on non-alphanumerics
 * (instead of a replace with anchored trims) can never backtrack.
 */
export function slugify(value: string): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .filter(Boolean)
    .join('-')
    .slice(0, 120);
}
