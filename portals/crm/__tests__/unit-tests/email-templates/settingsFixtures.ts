import { vi } from 'vitest';
import type { DocumentNode } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import {
  CRM_EMAIL_AI_PROMPTS,
  CRM_EMAIL_SETTINGS,
  RENDER_CRM_EMAIL_THEME_PREVIEW,
  type CrmEmailAiPrompt,
  type CrmEmailBrandAsset,
  type CrmEmailSettings,
  type CrmEmailTheme,
} from '@/api/emailSettings.gql';

/** Email Templates › Settings fixtures: every field the settings and prompt operations select. */

export const savedTheme: CrmEmailTheme = {
  primary_color: '#D92D2D',
  accent_color: '#F5A623',
  heading_color: '#1A1A1A',
  text_color: '#333333',
  muted_color: '#777777',
  background_color: '#F4F4F4',
  card_color: '#FFFFFF',
  panel_color: '#FFF4F4',
  border_color: '#E5E5E5',
  body_font: 'inter',
  heading_font: 'inter',
  base_font_size: 15,
  content_padding: 32,
  button_radius: 8,
  panel_radius: 12,
  color_mode: 'AUTO',
  dark_background_color: '#111111',
  dark_card_color: '#1E1E1E',
  dark_heading_color: '#FAFAFA',
  dark_text_color: '#DDDDDD',
  dark_primary_color: '#FF5A5A',
};

/** The shared design tokens: deliberately different from the saved theme. */
export const duncitDefaults: CrmEmailTheme = {
  ...savedTheme,
  primary_color: '#E63946',
  heading_color: '#0B0B0B',
  body_font: 'georgia',
  base_font_size: 16,
  content_padding: 24,
  button_radius: 12,
  color_mode: 'LIGHT',
};

export const fonts = [
  { key: 'inter', label: 'Inter', stack: 'Inter, Arial, sans-serif' },
  { key: 'georgia', label: 'Georgia', stack: 'Georgia, serif' },
];

export const asset = (overrides: Partial<CrmEmailBrandAsset> & Pick<CrmEmailBrandAsset, 'id' | 'kind' | 'name'>): CrmEmailBrandAsset => ({
  url: `https://cdn.duncit.com/crm/email-brand/${overrides.id}.png`,
  mime_type: 'image/png',
  size_bytes: null,
  width: 300,
  height: 100,
  created_at: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

export const WORDMARK = asset({ id: 'logo-1', kind: 'LOGO', name: 'Acme wordmark' });
export const MONOGRAM = asset({ id: 'logo-2', kind: 'LOGO', name: 'Acme monogram' });
export const HERO_BANNER = asset({ id: 'banner-1', kind: 'BANNER', name: 'Hero banner', width: 1200, height: 400 });

export const settingsDoc = (overrides: Partial<CrmEmailSettings> = {}): CrmEmailSettings => ({
  assets: [WORDMARK, MONOGRAM, HERO_BANNER],
  primary_logo_id: WORDMARK.id,
  theme: savedTheme,
  defaults: duncitDefaults,
  fonts,
  updated_at: '2026-11-20T08:00:00.000Z',
  ...overrides,
});

/** Answers the settings query (first load and every refetch a mutation asks for). */
export const settingsMock = (doc: CrmEmailSettings | Error = settingsDoc(), uses = 10): MockedResponse => ({
  request: { query: CRM_EMAIL_SETTINGS },
  ...(doc instanceof Error ? { error: doc } : { result: { data: { crmEmailSettings: doc } } }),
  maxUsageCount: uses,
});

/** Answers every theme preview render the same way. */
export const themePreviewMock = (answer: { html?: string; errors?: string[] } | Error = {}, uses = 20): MockedResponse => ({
  request: { query: RENDER_CRM_EMAIL_THEME_PREVIEW, variables: () => true },
  ...(answer instanceof Error
    ? { error: answer }
    : { result: { data: { renderCrmEmailThemePreview: { html: answer.html ?? '<p>Themed starter</p>', errors: answer.errors ?? [] } } } }),
  maxUsageCount: uses,
});

export const SYSTEM_PROMPT: CrmEmailAiPrompt = {
  id: 'p-system',
  key: 'crm_email_system',
  role: 'SYSTEM',
  name: 'CRM email system',
  description: 'How the AI writes CRM emails',
  content: 'Write responsive MJML. Follow {{brand_rules}}.',
  variables: [{ name: 'brand_rules', label: 'Brand rules', description: 'The CRM theme rules', required: true }],
  updated_at: '2026-11-20T08:00:00.000Z',
};

export const USER_PROMPT: CrmEmailAiPrompt = {
  id: 'p-user',
  key: 'crm_email_user',
  role: 'USER',
  name: 'CRM email request',
  description: 'How a request reaches the AI',
  content: 'Request: {{ instruction }}\nCurrent: {{current_mjml}}',
  variables: [
    { name: 'instruction', label: 'Instruction', description: 'What the manager asked for', required: true },
    { name: 'current_mjml', label: 'Current MJML', description: '', required: false },
  ],
  updated_at: '2026-11-20T08:00:00.000Z',
};

/**
 * A mutation mock that answers `{ [field]: outcome }` (or fails with it) and
 * records the variables of each call on `answer`, so a test asserts what was sent.
 */
export const mutationMock = (query: DocumentNode, field: string, outcome: unknown) => {
  const answer = vi.fn(() => ({ data: { [field]: outcome } }));
  const mock: MockedResponse =
    outcome instanceof Error
      ? { request: { query, variables: () => true }, error: outcome }
      : { request: { query, variables: () => true }, result: answer };
  return { mock, answer };
};

export const promptsMock =(prompts: CrmEmailAiPrompt[] | Error, uses = 10): MockedResponse => ({
  request: { query: CRM_EMAIL_AI_PROMPTS },
  ...(prompts instanceof Error ? { error: prompts } : { result: { data: { crmEmailAiPrompts: prompts } } }),
  maxUsageCount: uses,
});
