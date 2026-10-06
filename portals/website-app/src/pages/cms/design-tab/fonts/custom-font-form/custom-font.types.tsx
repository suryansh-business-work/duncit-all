import { z } from 'zod';
import { isFontFamily } from '@duncit/regex';
import type { FontValues } from '../../design-form/design.types';

type Translate = (key: string) => string;

export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

/** A family uploaded file by file — one weight + style per file. */
export const customFontSchema = (t: Translate) =>
  z.object({
    family: z.string().trim().refine(isFontFamily, t('websiteApp.cms.fonts.errFamily')),
    role: z.enum(['HEADING', 'BODY', 'ACCENT', 'NONE']),
    fallback: z.string().trim().max(120),
    files: z
      .array(
        z.object({
          weight: z.number().int(),
          style: z.enum(['normal', 'italic']),
          url: z.string().min(1, t('websiteApp.cms.fonts.errFile')),
        }),
      )
      .min(1, t('websiteApp.cms.fonts.errFiles')),
  });

export type CustomFontFormValues = z.input<ReturnType<typeof customFontSchema>>;
export type CustomFontFormOutput = z.output<ReturnType<typeof customFontSchema>>;

export const blankCustomFont = (): CustomFontFormValues => ({
  family: '',
  role: 'HEADING',
  fallback: 'sans-serif',
  files: [{ weight: 400, style: 'normal', url: '' }],
});

export const toCustomFont = (values: CustomFontFormOutput): FontValues => ({
  family: values.family,
  source: 'CUSTOM',
  weights: [...new Set(values.files.map((file) => file.weight))].sort((a, b) => a - b),
  italic: values.files.some((file) => file.style === 'italic'),
  role: values.role,
  variable: '',
  fallback: values.fallback || 'sans-serif',
  files: values.files,
});
