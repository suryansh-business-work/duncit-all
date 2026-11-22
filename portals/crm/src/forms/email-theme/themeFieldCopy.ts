import type { EmailThemeFormValues } from './email-theme.schema';

/**
 * Each theme field's label and hint keys, written out once as literals (the
 * translation gate finds keys by their quoted text, so a key is never built
 * from the field name at the call site).
 */
export const THEME_FIELD_COPY: Record<keyof EmailThemeFormValues, { labelKey: string; hintKey?: string }> = {
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
