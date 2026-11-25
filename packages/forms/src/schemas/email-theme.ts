import { z } from 'zod';
import { HEX_COLOR } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * CRM › Email Templates › Settings › Theme: the look every CRM email renders
 * with. Moved here from the CRM portal so the portal and the Duncit CRM app
 * refuse the same theme with the same sentence.
 */

/** Pixel ranges — the same ones the server enforces (crmEmailTheme.ts CRM_EMAIL_RANGES). */
export const EMAIL_THEME_RANGES = {
  base_font_size: { min: 13, max: 18 },
  content_padding: { min: 16, max: 48 },
  button_radius: { min: 0, max: 28 },
  panel_radius: { min: 0, max: 28 },
} as const;

export const EMAIL_THEME_LIGHT_COLOR_FIELDS = [
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

export const EMAIL_THEME_DARK_COLOR_FIELDS = [
  'dark_background_color',
  'dark_card_color',
  'dark_heading_color',
  'dark_text_color',
  'dark_primary_color',
] as const;

export type EmailThemeColorField =
  | (typeof EMAIL_THEME_LIGHT_COLOR_FIELDS)[number]
  | (typeof EMAIL_THEME_DARK_COLOR_FIELDS)[number];
export type EmailThemeRangeField = keyof typeof EMAIL_THEME_RANGES;

export const makeEmailThemeSchema = (t: Translate) => {
  const color = z.string().trim().regex(HEX_COLOR, t('crm.emailSettings.colorInvalid'));
  const range = (field: EmailThemeRangeField) => {
    const { min, max } = EMAIL_THEME_RANGES[field];
    const message = t('crm.emailSettings.rangeInvalid', { vars: { min, max } });
    return z.number().int(message).min(min, message).max(max, message);
  };
  const font = z.string().min(1, t('crm.emailSettings.fontRequired'));
  return z.object({
    primary_color: color,
    accent_color: color,
    heading_color: color,
    text_color: color,
    muted_color: color,
    background_color: color,
    card_color: color,
    panel_color: color,
    border_color: color,
    dark_background_color: color,
    dark_card_color: color,
    dark_heading_color: color,
    dark_text_color: color,
    dark_primary_color: color,
    body_font: font,
    heading_font: font,
    base_font_size: range('base_font_size'),
    content_padding: range('content_padding'),
    button_radius: range('button_radius'),
    panel_radius: range('panel_radius'),
    color_mode: z.enum(['AUTO', 'LIGHT']),
  });
};

export type EmailThemeValues = z.infer<ReturnType<typeof makeEmailThemeSchema>>;

/** A theme as the server stores it — any field the form does not edit (e.g. __typename) is ignored. */
export type EmailThemeSource = Record<EmailThemeColorField, string> & {
  body_font: string;
  heading_font: string;
  base_font_size: number;
  content_padding: number;
  button_radius: number;
  panel_radius: number;
  color_mode: string;
};

/** A stored theme as form values: the edited fields only, colour mode AUTO unless it is LIGHT. */
export const emailThemeToValues = (theme: EmailThemeSource): EmailThemeValues => ({
  primary_color: theme.primary_color,
  accent_color: theme.accent_color,
  heading_color: theme.heading_color,
  text_color: theme.text_color,
  muted_color: theme.muted_color,
  background_color: theme.background_color,
  card_color: theme.card_color,
  panel_color: theme.panel_color,
  border_color: theme.border_color,
  dark_background_color: theme.dark_background_color,
  dark_card_color: theme.dark_card_color,
  dark_heading_color: theme.dark_heading_color,
  dark_text_color: theme.dark_text_color,
  dark_primary_color: theme.dark_primary_color,
  body_font: theme.body_font,
  heading_font: theme.heading_font,
  base_font_size: theme.base_font_size,
  content_padding: theme.content_padding,
  button_radius: theme.button_radius,
  panel_radius: theme.panel_radius,
  color_mode: theme.color_mode === 'LIGHT' ? 'LIGHT' : 'AUTO',
});

/**
 * Each theme field's label and hint keys, written out once as literals (the
 * translation gate finds keys by their quoted text, so a key is never built
 * from the field name at the call site).
 */
export const EMAIL_THEME_FIELD_COPY: Readonly<Record<keyof EmailThemeValues, { labelKey: string; hintKey?: string }>> = {
  primary_color: { labelKey: 'crm.emailSettings.primaryColor', hintKey: 'crm.emailSettings.primaryColorHint' },
  accent_color: { labelKey: 'crm.emailSettings.accentColor', hintKey: 'crm.emailSettings.accentColorHint' },
  heading_color: { labelKey: 'crm.emailSettings.headingColor', hintKey: 'crm.emailSettings.headingColorHint' },
  text_color: { labelKey: 'crm.emailSettings.textColor', hintKey: 'crm.emailSettings.textColorHint' },
  muted_color: { labelKey: 'crm.emailSettings.mutedColor', hintKey: 'crm.emailSettings.mutedColorHint' },
  background_color: { labelKey: 'crm.emailSettings.backgroundColor', hintKey: 'crm.emailSettings.backgroundColorHint' },
  card_color: { labelKey: 'crm.emailSettings.cardColor', hintKey: 'crm.emailSettings.cardColorHint' },
  panel_color: { labelKey: 'crm.emailSettings.panelColor', hintKey: 'crm.emailSettings.panelColorHint' },
  border_color: { labelKey: 'crm.emailSettings.borderColor', hintKey: 'crm.emailSettings.borderColorHint' },
  heading_font: { labelKey: 'crm.emailSettings.headingFont' },
  body_font: { labelKey: 'crm.emailSettings.bodyFont' },
  base_font_size: { labelKey: 'crm.emailSettings.baseFontSize' },
  content_padding: { labelKey: 'crm.emailSettings.contentPadding' },
  button_radius: { labelKey: 'crm.emailSettings.buttonRadius' },
  panel_radius: { labelKey: 'crm.emailSettings.panelRadius' },
  color_mode: { labelKey: 'crm.emailSettings.colorMode' },
  dark_background_color: { labelKey: 'crm.emailSettings.darkBackgroundColor' },
  dark_card_color: { labelKey: 'crm.emailSettings.darkCardColor' },
  dark_heading_color: { labelKey: 'crm.emailSettings.darkHeadingColor' },
  dark_text_color: { labelKey: 'crm.emailSettings.darkTextColor' },
  dark_primary_color: { labelKey: 'crm.emailSettings.darkPrimaryColor' },
};

/** Light-mode colours, grouped as a reader sees them: brand, text, surfaces. */
export const EMAIL_THEME_COLOR_GROUPS: ReadonlyArray<{
  titleKey: string;
  fields: ReadonlyArray<(typeof EMAIL_THEME_LIGHT_COLOR_FIELDS)[number]>;
}> = [
  { titleKey: 'crm.emailSettings.brandColors', fields: ['primary_color', 'accent_color'] },
  { titleKey: 'crm.emailSettings.textColors', fields: ['heading_color', 'text_color', 'muted_color'] },
  { titleKey: 'crm.emailSettings.surfaceColors', fields: ['background_color', 'card_color', 'panel_color', 'border_color'] },
];
