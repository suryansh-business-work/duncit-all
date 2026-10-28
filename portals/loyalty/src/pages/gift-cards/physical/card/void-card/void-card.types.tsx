import { z } from 'zod';
import type { Translator } from '@duncit/app-settings';

/** The longest reason the server stores. */
export const REASON_MAX = 300;

export interface VoidCardValues {
  reason: string;
}

export interface VoidCardFormProps {
  open: boolean;
  busy: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: VoidCardValues) => Promise<void> | void;
}

/** Cancelling a card always says why — the reason is what the history explains. */
export const makeVoidCardSchema = (t: Translator['t']) =>
  z.object({
    reason: z
      .string()
      .trim()
      .min(1, t('loyalty.physical.voidReasonRequired'))
      .max(REASON_MAX, t('loyalty.physical.voidReasonMax', { vars: { max: REASON_MAX } })),
  });
