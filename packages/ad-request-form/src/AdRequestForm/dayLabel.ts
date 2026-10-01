import type { Translate } from '../i18n/useTranslation';

/**
 * A day count in the words a person would use.
 *
 * The old marks said "1 month" for 30, which was true only while 30 was the
 * ceiling. Now that the ceiling is a setting, the label has to be derived or it
 * will one day sit under a 90.
 */
export function dayLabel(days: number, t: Translate): string {
  if (days > 1 && days % 30 === 0) return t('adRequest.months', { count: days / 30 });
  if (days > 1 && days % 7 === 0) return t('adRequest.weeks', { count: days / 7 });
  return t('adRequest.days', { count: days });
}
