import { z } from 'zod';
import { fallbackT, type Translate } from '../../i18n/fallback';
import { formatDate } from '../../utils/dateFormat';

/**
 * The comment field's rules, built with the reader's `t` so the messages are in
 * their language. Schemas are parsed outside React, so the bundled English is
 * the default — a module-level import still produces real copy, never a key.
 */
export const makeCommentSchema = (t: Translate = fallbackT) =>
  z.object({
    text: z
      .string()
      .trim()
      .min(1, t('mweb.podDetails.validation.commentRequired'))
      .max(1000, t('mweb.podDetails.validation.commentMax')),
  });

export const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return formatDate(d);
};
