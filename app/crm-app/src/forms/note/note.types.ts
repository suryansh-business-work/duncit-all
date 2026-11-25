import { z } from 'zod';

import type { Translate } from '@/i18n/fallback';

export const NOTE_SUMMARY_MAX = 200;
export const NOTE_BODY_MAX = 5000;

/** A manual log on a lead: an optional one-line summary and the note itself. */
export const makeNoteSchema = (t: Translate) =>
  z.object({
    summary: z
      .string()
      .trim()
      .max(NOTE_SUMMARY_MAX, t('crmApp.note.tooLong', { vars: { max: NOTE_SUMMARY_MAX } })),
    body: z
      .string()
      .trim()
      .min(1, t('crmApp.note.bodyRequired'))
      .max(NOTE_BODY_MAX, t('crmApp.note.tooLong', { vars: { max: NOTE_BODY_MAX } })),
  });

export type NoteValues = z.infer<ReturnType<typeof makeNoteSchema>>;

export const noteDefaults: NoteValues = { summary: '', body: '' };

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * The portal stores a manual log as HTML (its editor is rich text). A note
 * typed on the phone is plain text: escaped, one paragraph per line, so it
 * renders as typed and can never inject markup into the portal.
 */
export function noteToHtml(text: string): string {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => `<p>${line.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c)}</p>`)
    .join('');
}
