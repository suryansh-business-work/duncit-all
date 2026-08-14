import { z } from 'zod';
import { templateParamCount } from '@duncit/communication';
import type { Translator } from '@duncit/app-settings';
import type { CreateAisensyTemplateInput } from '../../queries';

/** The three categories `CreateAisensyTemplateInput.category` accepts. SERVICE
 * is in Meta's vocabulary too, but Meta assigns it — it is never submitted, so
 * `WA_TEMPLATE_CATEGORIES` is not the list a create form offers. */
export const TEMPLATE_CATEGORIES = ['UTILITY', 'MARKETING', 'AUTHENTICATION'] as const;

/** TEXT is a plain template; the other three declare a media header whose asset
 * is supplied per send as a URL, never at submission. */
export const TEMPLATE_TYPES = ['TEXT', 'IMAGE', 'VIDEO', 'FILE'] as const;

/** What AiSensy accepts as a name, and what a campaign then binds to. */
const NAME_PATTERN = /^[a-z0-9_]+$/;
const NAME_MAX = 120;
const LANGUAGE_MAX = 40;
const BODY_MAX = 1024;
const LINE_MAX = 60;

/**
 * A template as Meta will review it.
 *
 * Built from `t` rather than written in English because every message here is a
 * shipped key (rule 38), and a Zod schema is where a form's copy actually
 * reaches the reader.
 */
export function createTemplateSchema(t: Translator['t']) {
  const required = (field: string) => t('marketingWhatsapp.errorRequired', { vars: { field } });
  const tooLong = (field: string) => t('marketingWhatsapp.errorTooLong', { vars: { field } });
  const name = t('marketingWhatsapp.nameLabel');
  const language = t('marketingWhatsapp.languageLabel');
  const body = t('marketingWhatsapp.bodyLabel');
  const sample = t('marketingWhatsapp.sampleLabel');
  const headerText = t('marketingWhatsapp.headerTextLabel');
  const footerText = t('marketingWhatsapp.footerTextLabel');

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, required(name))
      .max(NAME_MAX, tooLong(name))
      .regex(NAME_PATTERN, t('marketingWhatsapp.errorNameFormat')),
    category: z.enum(TEMPLATE_CATEGORIES),
    language: z.string().trim().min(1, required(language)).max(LANGUAGE_MAX, tooLong(language)),
    type: z.enum(TEMPLATE_TYPES),
    body: z.string().trim().min(1, required(body)).max(BODY_MAX, tooLong(body)),
    // Meta reviews the SAMPLE, and it reviews it as a finished message: every
    // {{n}} the body declares has to be a real example value here, or the
    // submission comes back rejected with nothing said about why.
    sample: z
      .string()
      .trim()
      .min(1, required(sample))
      .max(BODY_MAX, tooLong(sample))
      .refine(
        (value) => templateParamCount(value) === 0,
        t('marketingWhatsapp.errorSamplePlaceholders')
      ),
    header_text: z.string().trim().max(LINE_MAX, tooLong(headerText)),
    footer_text: z.string().trim().max(LINE_MAX, tooLong(footerText)),
  });
}

export type CreateTemplateValues = z.infer<ReturnType<typeof createTemplateSchema>>;

export const emptyValues = (): CreateTemplateValues => ({
  name: '',
  category: 'UTILITY',
  language: '',
  type: 'TEXT',
  body: '',
  sample: '',
  header_text: '',
  footer_text: '',
});

/** A blank optional line is omitted rather than sent empty — AiSensy reads an
 * empty `header_text` as a header made of nothing and rejects the template. */
export const toCreateInput = (values: CreateTemplateValues): CreateAisensyTemplateInput => ({
  name: values.name,
  category: values.category,
  language: values.language,
  type: values.type,
  body: values.body,
  sample: values.sample,
  header_text: values.header_text || undefined,
  footer_text: values.footer_text || undefined,
});
