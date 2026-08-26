import { z } from 'zod';
import { PUBLIC_URL_PATTERN } from '@duncit/forms';
import type { Translator } from '@duncit/app-settings';
import type {
  AisensyButtonInput,
  AisensyMediaInput,
  AisensyTemplate,
  AisensyTemplateButton,
} from '../queries';

/**
 * The three things a send carries BECAUSE of the template behind it: the body's
 * variables, the header asset, and a value for every CTA link with a {{n}}.
 *
 * Shared by the campaign form and the test form, which send through the same
 * server path and are refused by the same gate — two copies of these rules
 * would be two ways to reach `Media URL Missing` from the same screen.
 */

/** AiSensy says FILE where WhatsApp draws a DOCUMENT; both mean the header the
 * recipient sees a file name on. */
const DOCUMENT_FORMATS = new Set(['FILE', 'DOCUMENT']);

export interface TemplateFieldValues {
  template_params: { value: string }[];
  buttons: { index: number; value: string }[];
  /** Set from the template, not by the operator: whether the header asset is
   * mandatory. It lives in the form so the schema can require the URL without
   * the schema having to know what a template is. */
  media_required: boolean;
  media_url: string;
  media_filename: string;
}

/** The Zod fields both send forms mix into their own object. */
export const templateFieldsShape = (t: Translator['t']) => ({
  template_params: z.array(
    z.object({ value: z.string().trim().min(1, t('marketingWhatsapp.errorParamRequired')) })
  ),
  buttons: z.array(
    z.object({
      index: z.number().int(),
      value: z.string().trim().min(1, t('marketingWhatsapp.errorButtonValue')),
    })
  ),
  media_required: z.boolean(),
  media_url: z.string().trim(),
  media_filename: z.string().trim(),
});

export const emptyTemplateFields = (): TemplateFieldValues => ({
  template_params: [],
  buttons: [],
  media_required: false,
  media_url: '',
  media_filename: '',
});

/**
 * The header asset, checked here so the send is never spent finding out.
 *
 * A missing asset is the failure this whole screen was rebuilt for; a
 * non-public URL is the same failure one step later, at AiSensy's own fetch.
 */
export function refineTemplateFields(
  values: TemplateFieldValues,
  ctx: z.RefinementCtx,
  t: Translator['t']
): void {
  if (values.media_required && !values.media_url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['media_url'],
      message: t('marketingWhatsapp.errorMediaRequired'),
    });
    return;
  }
  // AiSensy fetches the asset itself at send time, so nothing but an absolute
  // public link can ever work: a relative path or a blob: URL is refused.
  if (values.media_url && !PUBLIC_URL_PATTERN.test(values.media_url)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['media_url'],
      message: t('marketingWhatsapp.errorMediaUrl'),
    });
  }
}

/** Null rather than an empty object: the server reads "no media here" as "use
 * whatever the campaign was built with", which is the common case. */
export const toMediaInput = (values: TemplateFieldValues): AisensyMediaInput | null =>
  values.media_url ? { url: values.media_url.trim(), filename: values.media_filename.trim() } : null;

export const toButtonInputs = (values: TemplateFieldValues): AisensyButtonInput[] =>
  values.buttons.map((button) => ({ index: button.index, value: button.value.trim() }));

/** A CTA button the operator has to fill, carrying the position the send
 * addresses it by — its index in `cta_buttons`, not the {{n}} in its link. */
export interface DynamicButton extends AisensyTemplateButton {
  position: number;
}

export const dynamicButtons = (template: AisensyTemplate | null): DynamicButton[] =>
  (template?.cta_buttons ?? [])
    .map((button, position) => ({ ...button, position }))
    .filter((button) => button.url_param > 0);

/** Only a document shows its file name to the recipient; an image or a video
 * never does, so asking for one there is noise. */
export const isDocumentHeader = (template: AisensyTemplate | null): boolean =>
  DOCUMENT_FORMATS.has(template?.header_format ?? '');
