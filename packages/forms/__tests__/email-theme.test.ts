import { describe, expect, it } from 'vitest';
import {
  EMAIL_THEME_COLOR_GROUPS,
  EMAIL_THEME_DARK_COLOR_FIELDS,
  EMAIL_THEME_FIELD_COPY,
  EMAIL_THEME_LIGHT_COLOR_FIELDS,
  emailThemeToValues,
  makeEmailThemeSchema,
  type EmailThemeSource,
  type EmailThemeValues,
} from '../src/schemas/email-theme';

/** The CRM email theme: the key is echoed, so each assertion names the message shown. */
const schema = makeEmailThemeSchema((key) => key);

const stored: EmailThemeSource & { __typename: string } = {
  __typename: 'CrmEmailTheme',
  primary_color: '#D92D2D',
  accent_color: '#F59E0B',
  heading_color: '#111827',
  text_color: '#374151',
  muted_color: '#6B7280',
  background_color: '#F3F4F6',
  card_color: '#FFFFFF',
  panel_color: '#FEF2F2',
  border_color: '#E5E7EB',
  body_font: 'inter',
  heading_font: 'poppins',
  base_font_size: 15,
  content_padding: 32,
  button_radius: 8,
  panel_radius: 12,
  color_mode: 'AUTO',
  dark_background_color: '#0B0F19',
  dark_card_color: '#111827',
  dark_heading_color: '#F9FAFB',
  dark_text_color: '#D1D5DB',
  dark_primary_color: '#F87171',
};
const valid = emailThemeToValues(stored);

const messages = (patch: Partial<Record<keyof EmailThemeValues, unknown>>) => {
  const result = schema.safeParse({ ...valid, ...patch });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('emailThemeToValues', () => {
  it('keeps every edited field and drops the rest', () => {
    expect(valid).not.toHaveProperty('__typename');
    expect(Object.keys(valid)).toHaveLength(
      EMAIL_THEME_LIGHT_COLOR_FIELDS.length + EMAIL_THEME_DARK_COLOR_FIELDS.length + 7,
    );
    expect(valid.dark_primary_color).toBe('#F87171');
    expect(valid.panel_radius).toBe(12);
  });

  it('keeps LIGHT and reads anything else as AUTO', () => {
    expect(emailThemeToValues({ ...stored, color_mode: 'LIGHT' }).color_mode).toBe('LIGHT');
    expect(emailThemeToValues({ ...stored, color_mode: 'AUTO' }).color_mode).toBe('AUTO');
    expect(emailThemeToValues({ ...stored, color_mode: 'SEPIA' }).color_mode).toBe('AUTO');
  });
});

describe('makeEmailThemeSchema', () => {
  it('accepts a saved theme as it is, trimming the spaces around a colour', () => {
    expect(schema.safeParse(valid).success).toBe(true);
    const result = schema.safeParse({ ...valid, primary_color: '  #fff ' });
    expect(result.success && result.data.primary_color).toBe('#fff');
  });

  it.each(['red', '#12345', '#GGGGGG', '123456', ''])('refuses "%s" as a colour, light or dark', (value) => {
    expect(messages({ accent_color: value })).toEqual(['crm.emailSettings.colorInvalid']);
    expect(messages({ dark_card_color: value })).toEqual(['crm.emailSettings.colorInvalid']);
  });

  it.each([
    ['base_font_size', 13, 18],
    ['content_padding', 16, 48],
    ['button_radius', 0, 28],
    ['panel_radius', 0, 28],
  ] as const)('keeps %s between %i and %i px, whole numbers only', (field, min, max) => {
    expect(messages({ [field]: min })).toEqual([]);
    expect(messages({ [field]: max })).toEqual([]);
    expect(messages({ [field]: min - 1 })).toEqual(['crm.emailSettings.rangeInvalid']);
    expect(messages({ [field]: max + 1 })).toEqual(['crm.emailSettings.rangeInvalid']);
    expect(messages({ [field]: min + 0.5 })).toEqual(['crm.emailSettings.rangeInvalid']);
  });

  it('asks for both fonts and knows only the AUTO and LIGHT colour modes', () => {
    expect(messages({ body_font: '' })).toEqual(['crm.emailSettings.fontRequired']);
    expect(messages({ heading_font: '' })).toEqual(['crm.emailSettings.fontRequired']);
    expect(messages({ color_mode: 'LIGHT' })).toEqual([]);
    expect(messages({ color_mode: 'DARK' })).toHaveLength(1);
  });
});

describe('theme field copy and colour groups', () => {
  it('names every field the form edits, with a hint for each light colour', () => {
    expect(Object.keys(EMAIL_THEME_FIELD_COPY).sort()).toEqual(Object.keys(valid).sort());
    expect(EMAIL_THEME_FIELD_COPY.primary_color).toEqual({
      labelKey: 'crm.emailSettings.primaryColor',
      hintKey: 'crm.emailSettings.primaryColorHint',
    });
    expect(EMAIL_THEME_FIELD_COPY.dark_card_color.hintKey).toBeUndefined();
  });

  it('groups every light colour once: brand, text, surfaces', () => {
    expect(EMAIL_THEME_COLOR_GROUPS.map((g) => g.titleKey)).toEqual([
      'crm.emailSettings.brandColors',
      'crm.emailSettings.textColors',
      'crm.emailSettings.surfaceColors',
    ]);
    expect(EMAIL_THEME_COLOR_GROUPS.flatMap((g) => g.fields).sort()).toEqual([...EMAIL_THEME_LIGHT_COLOR_FIELDS].sort());
  });
});
