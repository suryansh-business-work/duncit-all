import { z } from 'zod';
import { PUBLIC_URL_PATTERN } from '@duncit/forms';
import type { Translator } from '@duncit/app-settings';

/**
 * Which platform default this form edits.
 *
 * One per header kind an operator can set, because a single picture cannot
 * stand in for a document header — 54 of the project's templates carry an image
 * header and 5 carry a file one, and before the second default those five
 * failed every send with "Media URL Missing".
 */
export type DefaultMediaKind = 'IMAGE' | 'DOCUMENT';

/**
 * One platform default header asset — a public link, and the name WhatsApp
 * shows beside a document.
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
    filename: z.string().trim(),
  });

export type DefaultMediaValues = z.infer<ReturnType<typeof defaultMediaSchema>>;

export interface DefaultMediaFormProps {
  kind: DefaultMediaKind;
  /** What the server holds now; '' when no default is set. */
  savedUrl: string;
  savedFilename: string;
  busy: boolean;
  onSubmit: (values: DefaultMediaValues) => Promise<void>;
}
