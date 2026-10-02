import { Level, FormState } from '../queries';

/** Mirrors the server's MIN_CO_HOSTS..MAX_CO_HOSTS bounds. */
export const CO_HOST_LIMITS = [1, 2, 3, 4, 5];

/** Mirrors the server bounds on Category.min_pax (0 = no minimum set). */
export const MIN_PAX_FLOOR = 0;
export const MIN_PAX_CEILING = 50;

/** A number input hands back a string and permits anything typed; keep the
 * stored value a whole number inside the bounds the server will accept, so the
 * admin cannot save something it would reject. */
export const clampMinPax = (raw: string): number => {
  const value = Math.trunc(Number(raw));
  if (!Number.isFinite(value)) return MIN_PAX_FLOOR;
  return Math.min(MIN_PAX_CEILING, Math.max(MIN_PAX_FLOOR, value));
};

export interface DialogState {
  open: boolean;
  level: Level;
  parentId: string | null;
  form: FormState;
}

export const levelLabel = (level?: Level) => {
  if (level === 'SUPER') return 'Super Category';
  if (level === 'CATEGORY') return 'Category';
  return 'Sub-Category';
};
