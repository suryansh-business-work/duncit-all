import { z } from 'zod';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';

/** The server keeps an operator note of up to 2000 characters. */
export const NOTE_MAX = 2000;

/** Mirrors `storeAddOrderNote(text)`. */
export const makeOrderNoteSchema = (t: Translate) => z.object({ text: makeRules(t).requiredText(NOTE_MAX) });

export type OrderNoteValues = z.infer<ReturnType<typeof makeOrderNoteSchema>>;
