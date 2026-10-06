import { z } from 'zod';
import type { FontValues } from '../../design-form/design.types';

type Translate = (key: string) => string;

/** What a Google family is added with: which of ITS weights, italics, a role. */
export const googleFontSchema = (t: Translate) =>
  z.object({
    weights: z.array(z.number().int()).min(1, t('websiteApp.cms.fonts.errWeights')),
    italic: z.boolean(),
    role: z.enum(['HEADING', 'BODY', 'ACCENT', 'NONE']),
  });

export type GoogleFontFormValues = z.input<ReturnType<typeof googleFontSchema>>;
export type GoogleFontFormOutput = z.output<ReturnType<typeof googleFontSchema>>;

/** Regular and bold when the family has them, else its first weight. */
export function defaultWeights(available: number[]): number[] {
  const picked = available.filter((weight) => weight === 400 || weight === 700);
  return picked.length ? picked : available.slice(0, 1);
}

const FALLBACK_BY_CATEGORY: Record<string, string> = {
  serif: 'serif',
  monospace: 'monospace',
  handwriting: 'cursive',
  display: 'sans-serif',
  'sans-serif': 'sans-serif',
};

export const toGoogleFont = (family: string, category: string, values: GoogleFontFormOutput): FontValues => ({
  family,
  source: 'GOOGLE',
  weights: [...values.weights].sort((a, b) => a - b),
  italic: values.italic,
  role: values.role,
  variable: '',
  fallback: FALLBACK_BY_CATEGORY[category] ?? 'sans-serif',
  files: [],
});
