import { z } from 'zod';
import { PUBLIC_URL_PATTERN } from '@duncit/forms';
import type { Translator } from '@duncit/app-settings';

/**
 * The platform default header image — one public link.
 *
 * Blank is allowed on purpose and means "clear the default": the same
 * mutation that sets it clears it, exactly as the per-row media dialog does.
 * A filled value has to be a link AiSensy can fetch, which is the rule every
 * media field on this page shares (`PUBLIC_URL_PATTERN`) — a link only this
 * browser can open fails once per recipient, fifty scenarios wide.
 */
export const defaultMediaSchema = (t: Translator['t']) =>
  z.object({
    url: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || PUBLIC_URL_PATTERN.test(value),
        t('marketingWhatsapp.defaultMedia.errorUrl')
      ),
  });

export type DefaultMediaValues = z.infer<ReturnType<typeof defaultMediaSchema>>;

export interface DefaultMediaFormProps {
  /** What the server holds now; '' when no default is set. */
  savedUrl: string;
  busy: boolean;
  onSubmit: (values: DefaultMediaValues) => Promise<void>;
}
