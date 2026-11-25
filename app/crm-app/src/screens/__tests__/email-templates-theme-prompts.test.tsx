import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as docs from '@/graphql/emailTemplates';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { EmailTemplateSettingsScreen } from '../email-templates/EmailTemplateSettingsScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
let mockParams: Record<string, unknown> | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockParams }),
}));

/** CRM › Email Templates › Settings › Theme Configuration and Prompt Injection. */

const request = gqlRequest as jest.Mock;
const THEME = {
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
  base_font_size: 18,
  content_padding: 32,
  button_radius: 0,
  panel_radius: 12,
  color_mode: 'AUTO',
  dark_background_color: '#0B0F19',
  dark_card_color: '#111827',
  dark_heading_color: '#F9FAFB',
  dark_text_color: '#D1D5DB',
  dark_primary_color: '#F87171',
};
const settingsDoc = (theme: Record<string, unknown> = THEME) => ({
  assets: [],
  primary_logo_id: null,
  theme,
  defaults: { ...THEME, primary_color: '#4F46E5' },
  fonts: [
    { key: 'inter', label: 'Inter' },
    { key: 'poppins', label: 'Poppins' },
  ],
});
const PROMPTS = [
  {
    id: 'p1',
    key: 'crm.email_mjml',
    role: 'SYSTEM',
    content: 'Write MJML for {{instruction}} from {{current_mjml}}',
    variables: [
      { name: 'instruction', label: 'Instruction', description: 'What to write', required: true },
      { name: 'current_mjml', label: 'Current MJML', description: '', required: true },
      { name: 'images', label: 'Images', description: null, required: false },
    ],
  },
  {
    id: 'p2',
    key: 'crm.email_mjml.user',
    role: 'USER',
    content: 'Request: {{instruction}}',
    variables: [],
  },
  { id: 'p3', key: null, role: 'USER', content: 'Unaddressable', variables: [] },
];
type Handler = (vars: Record<string, unknown>) => unknown;
let settings: Record<string, unknown> = settingsDoc();
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppEmailTemplateSettingsDocument) return { crmEmailSettings: settings };
    if (doc === docs.CrmAppEmailTemplateThemePreviewDocument)
      return {
        renderCrmEmailThemePreview: {
          html: `<p>${String((vars.theme as { primary_color: string }).primary_color)}</p>`,
          errors: [],
        },
      };
    if (doc === docs.CrmAppEmailTemplateUpdateThemeDocument)
      return { updateCrmEmailTheme: settingsDoc(vars.input as Record<string, unknown>) };
    if (doc === docs.CrmAppEmailTemplateAiPromptsDocument) return { crmEmailAiPrompts: PROMPTS };
    if (doc === docs.CrmAppEmailTemplateUpdateAiPromptDocument)
      return { updateCrmEmailAiPrompt: { id: 'p1' } };
    if (doc === docs.CrmAppEmailTemplateResetAiPromptDocument)
      return { resetCrmEmailAiPrompt: { id: 'p1' } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));
const SLOW = { timeout: 3000 };
const openTab = async (tab: 'theme' | 'prompts') => {
  mockParams = { tab };
  renderWithTheme(<EmailTemplateSettingsScreen />);
};

beforeEach(() => {
  jest.clearAllMocks();
  settings = settingsDoc();
  serve();
});

describe('Theme Configuration', () => {
  it('previews a real email under the saved theme, and again as a colour changes', async () => {
    await openTab('theme');
    expect(await screen.findByTestId('theme-primary_color')).toBeOnTheScreen();
    expect(screen.getByText(/The theme is applied when an email is rendered/)).toBeOnTheScreen();
    await waitFor(
      () =>
        expect(screen.getByTestId('theme-preview-frame').props.source.html).toBe('<p>#D92D2D</p>'),
      SLOW,
    );
    expect(screen.getByTestId('theme-swatch-primary_color')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('theme-primary_color'), ' #0A7D4F ');
    await waitFor(
      () =>
        expect(screen.getByTestId('theme-preview-frame').props.source.html).toBe('<p>#0A7D4F</p>'),
      SLOW,
    );
    fireEvent.changeText(screen.getByTestId('theme-primary_color'), 'red');
    expect(await screen.findByText('Enter a hex colour like #D92D2D')).toBeOnTheScreen();
    expect(screen.queryByTestId('theme-swatch-primary_color')).toBeNull();
  });

  it('steps pixel values within their range, and hides the dark palette when always light', async () => {
    await openTab('theme');
    await screen.findByTestId('theme-primary_color');
    expect(screen.getByTestId('theme-base_font_size-up')).toBeDisabled();
    expect(screen.getByTestId('theme-button_radius-down')).toBeDisabled();
    fireEvent.press(screen.getByTestId('theme-base_font_size-down'));
    expect(screen.getByTestId('theme-base_font_size-value')).toHaveTextContent('17 px');
    fireEvent.press(screen.getByTestId('theme-button_radius-up'));
    expect(screen.getByTestId('theme-button_radius-value')).toHaveTextContent('1 px');
    expect(screen.getByTestId('theme-dark_card_color')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('theme-color_mode-LIGHT'));
    expect(
      screen.getByText('Emails stay light even when the reader uses dark mode.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('theme-dark_card_color')).toBeNull();
    fireEvent.press(screen.getByTestId('theme-body_font-poppins'));
    await press('email-theme-save');
    expect(callsTo(docs.CrmAppEmailTemplateUpdateThemeDocument)[0]?.[1].input).toMatchObject({
      base_font_size: 17,
      button_radius: 1,
      color_mode: 'LIGHT',
      body_font: 'poppins',
    });
    expect(await screen.findByText('Theme saved. CRM emails now use it.')).toBeOnTheScreen();
    expect(screen.getByTestId('email-theme-save')).toBeDisabled();
    fireEvent.press(screen.getByTestId('theme-saved-close'));
  });

  it('fills the Duncit defaults without saving them, and shows why a save failed', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppEmailTemplateUpdateThemeDocument,
          () => Promise.reject(new Error('Theme locked')),
        ],
      ]),
    );
    await openTab('theme');
    await screen.findByTestId('theme-primary_color');
    expect(screen.getByTestId('email-theme-save')).toBeDisabled();
    fireEvent.press(screen.getByTestId('email-theme-defaults'));
    expect(screen.getByTestId('theme-primary_color').props.value).toBe('#4F46E5');
    expect(callsTo(docs.CrmAppEmailTemplateUpdateThemeDocument)).toHaveLength(0);
    await press('email-theme-save');
    expect(await screen.findByText('Theme locked')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('theme-error-close'));
    expect(screen.queryByText('Theme locked')).toBeNull();
  });

  it('refuses to save a pixel value outside its range', async () => {
    settings = settingsDoc({ ...THEME, base_font_size: 40 });
    await openTab('theme');
    await screen.findByTestId('theme-primary_color');
    fireEvent.changeText(screen.getByTestId('theme-accent_color'), '#000000');
    await press('email-theme-save');
    expect(await screen.findByText('Use a whole number from 13 to 18')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppEmailTemplateUpdateThemeDocument)).toHaveLength(0);
  });

  it('shows what the preview render reported, or why it failed', async () => {
    const answers: Handler[] = [
      () => ({ renderCrmEmailThemePreview: { html: '<p>x</p>', errors: ['Unknown font'] } }),
      () => Promise.reject(new Error('Preview down')),
    ];
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateThemePreviewDocument, (v) => answers.shift()?.(v)],
      ]),
    );
    await openTab('theme');
    expect(await screen.findByText('Unknown font', {}, SLOW)).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('theme-primary_color'), '#123456');
    expect(await screen.findByText('Preview down', {}, SLOW)).toBeOnTheScreen();
  });

  it('drops a preview that answers after the theme changed again', async () => {
    const late: { resolve: (v: unknown) => void; reject: (e: Error) => void }[] = [];
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppEmailTemplateThemePreviewDocument,
          () => new Promise((resolve, reject) => late.push({ resolve, reject })),
        ],
      ]),
    );
    await openTab('theme');
    await waitFor(() => expect(late).toHaveLength(1), SLOW);
    expect(screen.getByTestId('theme-preview-loading')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('theme-primary_color'), '#123456');
    await waitFor(() => expect(late).toHaveLength(2), SLOW);
    fireEvent.changeText(screen.getByTestId('theme-primary_color'), '#654321');
    await act(async () => {
      late[0]?.resolve({ renderCrmEmailThemePreview: { html: '<p>old</p>', errors: [] } });
      late[1]?.reject(new Error('Old preview failed'));
    });
    expect(screen.getByTestId('theme-preview-frame').props.source.html).toBe('');
    expect(screen.queryByText('Old preview failed')).toBeNull();
  });
});

describe('Prompt Injection', () => {
  it('lists the two prompts with their placeholders and length, and saves an edit', async () => {
    await openTab('prompts');
    expect(await screen.findByText('Instructions for the AI')).toBeOnTheScreen();
    expect(screen.getByText('Request format')).toBeOnTheScreen();
    expect(screen.getByText('{{instruction}}')).toBeOnTheScreen();
    expect(screen.queryByText('Unaddressable')).toBeNull();
    expect(screen.getByText('52 / 8000 characters')).toBeOnTheScreen();
    expect(screen.getByTestId('email-prompt-save-crm.email_mjml')).toBeDisabled();
    fireEvent.changeText(
      screen.getByTestId('email-prompt-input-crm.email_mjml'),
      'Write MJML for {{instruction}}',
    );
    expect(
      await screen.findByText('Keep {{current_mjml}} in the prompt; the CRM fills them in.'),
    ).toBeOnTheScreen();
    fireEvent.changeText(
      screen.getByTestId('email-prompt-input-crm.email_mjml'),
      'Write {{ instruction }} on {{current_mjml}}',
    );
    await press('email-prompt-save-crm.email_mjml');
    expect(callsTo(docs.CrmAppEmailTemplateUpdateAiPromptDocument)[0]?.[1]).toEqual({
      key: 'crm.email_mjml',
      content: 'Write {{ instruction }} on {{current_mjml}}',
    });
    expect(await screen.findByText('Prompt saved')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppEmailTemplateAiPromptsDocument)).toHaveLength(2);
    fireEvent.press(screen.getByTestId('prompts-done-close'));
  });

  it('resets a prompt only after confirming, and shows why a change failed', async () => {
    const answers: Handler[] = [
      () => Promise.reject(new Error('Reset failed')),
      () => ({ resetCrmEmailAiPrompt: { id: 'p2' } }),
    ];
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateResetAiPromptDocument, (v) => answers.shift()?.(v)],
      ]),
    );
    await openTab('prompts');
    fireEvent.press(await screen.findByTestId('email-prompt-reset-crm.email_mjml.user'));
    expect(
      screen.getByText('Your edits to this prompt are replaced with the shipped default.'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('prompt-reset-dialog-cancel'));
    expect(callsTo(docs.CrmAppEmailTemplateResetAiPromptDocument)).toHaveLength(0);
    fireEvent.press(screen.getByTestId('email-prompt-reset-crm.email_mjml.user'));
    await press('prompt-reset-dialog-confirm');
    expect(await screen.findByText('Reset failed')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('prompts-error-close'));
    fireEvent.press(screen.getByTestId('email-prompt-reset-crm.email_mjml.user'));
    await press('prompt-reset-dialog-confirm');
    expect(callsTo(docs.CrmAppEmailTemplateResetAiPromptDocument).at(-1)?.[1]).toEqual({
      key: 'crm.email_mjml.user',
    });
    expect(await screen.findByText('Prompt reset to default')).toBeOnTheScreen();
  });

  it('says when the prompts are not set up, or cannot be read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateAiPromptsDocument, () => ({ crmEmailAiPrompts: [] })],
      ]),
    );
    const { unmount } = renderWithTheme(<EmailTemplateSettingsScreen />);
    fireEvent.press(screen.getByTestId('email-settings-tab-prompts'));
    expect(
      await screen.findByText(
        'The CRM email prompts are not set up on this server yet. Try again in a minute.',
      ),
    ).toBeOnTheScreen();
    unmount();
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateAiPromptsDocument, () => Promise.reject(new Error('No access'))],
      ]),
    );
    await openTab('prompts');
    expect(await screen.findByText('No access')).toBeOnTheScreen();
  });
});
