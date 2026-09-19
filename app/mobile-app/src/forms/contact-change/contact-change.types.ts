import type { ContactChannel, ContactSnapshot } from '@duncit/utils';
import {
  makeContactOtpSchema,
  makeContactValueSchema as makeSharedContactValueSchema,
  type Translate,
} from '@duncit/forms/schemas';

import { fallbackT } from '@/i18n/fallback';

export type { ContactOtpValues, ContactValueValues } from '@duncit/forms/schemas';

/** Per-channel rules, defaulted to the app's bundled English so a caller with no
 * live translator (a test, a module-level parse) still reads real sentences. */
export const makeContactValueSchema = (
  channel: ContactChannel,
  t: Translate = fallbackT,
  current?: Readonly<ContactSnapshot>,
) => makeSharedContactValueSchema(channel, t, current);

export const contactOtpSchema = makeContactOtpSchema(fallbackT);
