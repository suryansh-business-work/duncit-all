import { z } from 'zod';
import { HEX_COLOR } from '@duncit/regex';
import type { CrmEmailTheme } from '../../api/emailSettings.gql';
import type { Translate } from './email-theme.types';

/** Pixel ranges — the same ones the server enforces (crmEmailTheme.ts CRM_EMAIL_RANGES). */
export const EMAIL_THEME_RANGES = {
  base_font_size: { min: 13, max: 18 },
  content_padding: { min: 16, max: 48 },
  button_radius: { min: 0, max: 28 },
  panel_radius: { min: 0, max: 28 },
} as const;

export const LIGHT_COLOR_FIELDS = [
  'primary_color',
  'accent_color',
  'heading_color',
  'text_color',
  'muted_color',
  'background_color',
  'card_color',
  'panel_color',
  'border_color',
] as const;

export const DARK_COLOR_FIELDS = [
  'dark_background_color',
  'dark_card_color',
  'dark_heading_color',
  'dark_text_color',
  'dark_primary_color',
] as const;

type ColorField = (typeof LIGHT_COLOR_FIELDS)[number] | (typeof DARK_COLOR_FIELDS)[number];
type RangeField = keyof typeof EMAIL_THEME_RANGES;

export const emailThemeSchema = (t: Translate) => {
  const color = z.string().trim().regex(HEX_COLOR, t('crm.emailSettings.colorInvalid'));
  const range = (field: RangeField) => {
    const { min, max } = EMAIL_THEME_RANGES[field];
    const message = t('crm.emailSettings.rangeInvalid', { vars: { min, max } });
    return z.number().int(message).min(min, message).max(max, message);
  };
  const colors = Object.fromEntries(
    [...LIGHT_COLOR_FIELDS, ...DARK_COLOR_FIELDS].map((field) => [field, color])
  ) as Record<ColorField, typeof color>;
  return z.object({
    ...colors,
    body_font: z.string().min(1, t('crm.emailSettings.fontRequired')),
    heading_font: z.string().min(1, t('crm.emailSettings.fontRequired')),
    base_font_size: range('base_font_size'),
    content_padding: range('content_padding'),
    button_radius: range('button_radius'),
    panel_radius: range('panel_radius'),
    color_mode: z.enum(['AUTO', 'LIGHT']),
  });
};

export type EmailThemeFormValues = z.infer<ReturnType<typeof emailThemeSchema>>;

/** A stored theme as form values (drops any field the form does not edit, e.g. __typename). */
export const themeToForm = (theme: CrmEmailTheme): EmailThemeFormValues => ({
  ...Object.fromEntries([...LIGHT_COLOR_FIELDS, ...DARK_COLOR_FIELDS].map((f) => [f, theme[f]])),
  body_font: theme.body_font,
  heading_font: theme.heading_font,
  base_font_size: theme.base_font_size,
  content_padding: theme.content_padding,
  button_radius: theme.button_radius,
  panel_radius: theme.panel_radius,
  color_mode: theme.color_mode,
}) as EmailThemeFormValues;
