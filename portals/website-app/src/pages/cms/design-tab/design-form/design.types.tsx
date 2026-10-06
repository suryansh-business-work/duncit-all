import { z } from 'zod';
import type { CmsDesign, CmsDesignInput } from '@duncit/gql-types';
import { isCssVariable, isFontFamily } from '@duncit/regex';
import { httpsOrBlank } from '../../lib/rules';

type Translate = (key: string) => string;

/** A token value is written into a :root{} rule; these would break out of it. */
const UNSAFE_CHARS = [';', '{', '}', '<', '>'];
const isSafeValue = (value: string) => !UNSAFE_CHARS.some((char) => value.includes(char));

const FONT_ROLES = ['HEADING', 'BODY', 'ACCENT', 'NONE'] as const;

export const fontSchema = (t: Translate) =>
  z.object({
    family: z.string().trim().refine(isFontFamily, t('websiteApp.cms.fonts.errFamily')),
    source: z.enum(['GOOGLE', 'CUSTOM']),
    weights: z.array(z.number().int()).min(1, t('websiteApp.cms.fonts.errWeights')),
    italic: z.boolean(),
    role: z.enum(FONT_ROLES),
    variable: z
      .string()
      .trim()
      .toLowerCase()
      .refine((value) => value === '' || isCssVariable(value), t('websiteApp.cms.fonts.errVariable')),
    fallback: z.string().trim().max(120).refine(isSafeValue, t('websiteApp.cms.fonts.errFallback')),
    files: z.array(z.object({ weight: z.number().int(), style: z.enum(['normal', 'italic']), url: z.string() })),
  });

export const designSchema = (t: Translate) =>
  z.object({
    tokens: z.array(
      z.object({
        name: z.string().trim().toLowerCase().refine(isCssVariable, t('websiteApp.cms.design.errTokenName')),
        value: z
          .string()
          .trim()
          .min(1, t('websiteApp.cms.design.errTokenValue'))
          .max(400, t('websiteApp.cms.design.errTokenValue'))
          .refine(isSafeValue, t('websiteApp.cms.design.errTokenValue')),
        group: z.string().trim().max(40),
      }),
    ),
    fonts: z.array(fontSchema(t)),
    font_urls: z.array(z.object({ url: httpsOrBlank(t('websiteApp.cms.design.errUrl')) })),
    base_css: z.string(),
  });

export type DesignFormValues = z.input<ReturnType<typeof designSchema>>;
export type DesignFormOutput = z.output<ReturnType<typeof designSchema>>;
export type FontValues = z.input<ReturnType<typeof fontSchema>>;

export const toDesignFormValues = (design: CmsDesign | null): DesignFormValues => ({
  tokens: design?.tokens.map((token) => ({ name: token.name, value: token.value, group: token.group })) ?? [],
  fonts:
    design?.fonts.map((font) => ({
      family: font.family,
      source: font.source,
      weights: font.weights,
      italic: font.italic,
      role: font.role,
      variable: font.variable,
      fallback: font.fallback,
      files: font.files.map((file) => ({ weight: file.weight, style: file.style === 'italic' ? 'italic' : 'normal', url: file.url })),
    })) ?? [],
  font_urls: design?.font_urls.map((url) => ({ url })) ?? [],
  base_css: design?.base_css ?? '',
});

export const toDesignInput = (values: DesignFormOutput): CmsDesignInput => ({
  tokens: values.tokens.map((token) => ({ name: token.name, value: token.value, group: token.group || 'color' })),
  fonts: values.fonts,
  font_urls: values.font_urls.map((font) => font.url).filter(Boolean),
  base_css: values.base_css,
});
