import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { formatMjml } from '@duncit/utils';

import * as docs from '@/graphql/emailTemplates';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { EmailTemplateEditorScreen } from '../email-templates/EmailTemplateEditorScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: { id: 't1' } }),
}));

/** CRM › Email Templates › editor: load, preview, save, Active, the MJML tools, test send and delete. */

const request = gqlRequest as jest.Mock;
const MJML =
  '<mjml><mj-body><mj-section><mj-column><mj-text>Hi {{ venue_name }}</mj-text></mj-column></mj-section></mj-body></mjml>';
const TEMPLATE = {
  template_id: 't1',
  slug: 'venue-welcome',
  name: 'Venue welcome',
  description: 'First touch',
  subject: 'Hi {{ venue_name }}',
  target: 'VENUE',
  mjml: MJML,
  is_active: true,
  variables: [{ key: 'venue_name', description: 'Venue display name', sample: 'Grand Hall' }],
  images: [{ url: 'https://ik.duncit.com/hero.png', name: 'hero.png' }],
  attachments: [{ url: 'https://ik.duncit.com/files/brochure.mp4', name: null }],
};
const rendered = (errors: string[] = []) => ({
  renderCrmEmailTemplate: {
    html: '<p>Hi Grand Hall</p>',
    errors,
    detected_variables: ['venue_name'],
  },
});
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppEmailTemplateDetailDocument) return { crmEmailTemplate: TEMPLATE };
    if (doc === docs.CrmAppEmailTemplateRenderDocument) return rendered();
    if (doc === docs.CrmAppEmailTemplateUpdateDocument)
      return { updateCrmEmailTemplate: { template_id: 't1' } };
    if (doc === docs.CrmAppEmailTemplateDeleteDocument) return { deleteCrmEmailTemplate: true };
    if (doc === docs.CrmAppEmailTemplateSendTestDocument)
      return { sendCrmTestEmail: { ok: true, message: 'Sent to qa@duncit.com' } };
    if (doc === docs.CrmAppEmailTemplateGenerateMjmlDocument)
      return { generateCrmEmailMjml: '<mjml>AI</mjml>' };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));
const SLOW = { timeout: 3000 };
const open = async () => {
  renderWithTheme(<EmailTemplateEditorScreen />);
  return screen.findByTestId('template-name');
};

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('EmailTemplateEditorScreen', () => {
  it('opens the template with its fields and a live preview from the default values', async () => {
    expect((await open()).props.value).toBe('Venue welcome');
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Venue welcome' });
    expect(screen.getByTestId('template-slug')).toHaveTextContent('venue-welcome');
    expect(screen.getByText('Used by code; cannot be edited.')).toBeOnTheScreen();
    expect(screen.getByTestId('template-subject').props.value).toBe('Hi {{ venue_name }}');
    expect(screen.getByTestId('mjml-source').props.value).toBe(MJML);
    await waitFor(
      () =>
        expect(screen.getByTestId('preview-frame').props.source.html).toBe('<p>Hi Grand Hall</p>'),
      SLOW,
    );
    expect(callsTo(docs.CrmAppEmailTemplateRenderDocument)[0]?.[1]).toEqual({
      mjml: MJML,
      vars: '{"venue_name":"Grand Hall"}',
    });
    expect(screen.getByTestId('template-save')).toBeDisabled();
    expect(screen.queryByTestId('template-unsaved')).toBeNull();
  });

  it('saves what was changed, with the template as the portal sends it', async () => {
    await open();
    fireEvent.changeText(screen.getByTestId('template-name'), 'Venue hello');
    fireEvent(screen.getByTestId('template-active'), 'onCheckedChange', false);
    expect(screen.getByText('Unsaved changes')).toBeOnTheScreen();
    await press('template-save');
    expect(callsTo(docs.CrmAppEmailTemplateUpdateDocument)[0]?.[1]).toEqual({
      id: 't1',
      input: {
        name: 'Venue hello',
        description: 'First touch',
        subject: 'Hi {{ venue_name }}',
        mjml: MJML,
        variables: [{ key: 'venue_name', description: 'Venue display name', sample: 'Grand Hall' }],
        images: [{ url: 'https://ik.duncit.com/hero.png', name: 'hero.png' }],
        attachments: [{ url: 'https://ik.duncit.com/files/brochure.mp4', name: null }],
        is_active: false,
      },
    });
    expect(await screen.findByText('Template saved')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppEmailTemplateDetailDocument)).toHaveLength(2);
    fireEvent.press(screen.getByTestId('editor-status-close'));
    expect(screen.queryByText('Template saved')).toBeNull();
  });

  it('shows why a save failed and keeps the change', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateUpdateDocument, () => Promise.reject(new Error('Name taken'))],
      ]),
    );
    await open();
    fireEvent.changeText(screen.getByTestId('template-subject'), 'Hello');
    await press('template-save');
    expect(await screen.findByText('Name taken')).toBeOnTheScreen();
    expect(screen.getByText('Unsaved changes')).toBeOnTheScreen();
  });

  it('verifies the MJML: good, with issues, or when the render fails', async () => {
    const answers = [
      () => rendered(),
      () => rendered(['Bad tag', 'Bad attr', 'Bad end', 'Bad more']),
      () => Promise.reject(new Error('Render down')),
    ];
    await open();
    await waitFor(
      () => expect(callsTo(docs.CrmAppEmailTemplateRenderDocument)).toHaveLength(1),
      SLOW,
    );
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateRenderDocument, () => answers.shift()?.() ?? rendered()],
      ]),
    );
    await press('mjml-verify');
    expect(await screen.findByText('MJML looks good')).toBeOnTheScreen();
    await press('mjml-verify');
    expect(await screen.findByText('4 MJML issues')).toBeOnTheScreen();
    expect(screen.getByText('Bad tag · Bad attr · Bad end')).toBeOnTheScreen();
    await press('mjml-verify');
    expect(await screen.findByText('1 MJML issue')).toBeOnTheScreen();
    expect(screen.getByText('Render down')).toBeOnTheScreen();
  });

  it('tidies the MJML and takes what the AI wrote', async () => {
    await open();
    fireEvent.changeText(
      screen.getByTestId('mjml-source'),
      '<mjml><mj-body>  <mj-text>x</mj-text></mj-body></mjml>',
    );
    fireEvent.press(screen.getByTestId('mjml-format'));
    expect(screen.getByTestId('mjml-source').props.value).toBe(
      formatMjml('<mjml><mj-body>  <mj-text>x</mj-text></mj-body></mjml>'),
    );
    fireEvent.press(screen.getByTestId('mjml-ai'));
    fireEvent.changeText(screen.getByTestId('email-ai-prompt'), 'Make it festive');
    await press('email-ai-dialog-submit');
    expect(callsTo(docs.CrmAppEmailTemplateGenerateMjmlDocument)[0]?.[1].input).toMatchObject({
      prompt: 'Make it festive',
      target: 'VENUE',
    });
    expect(screen.getByTestId('mjml-source').props.value).toBe('<mjml>AI</mjml>');
    expect(screen.getByText('Unsaved changes')).toBeOnTheScreen();
  });

  it('shows the preview full screen, named after the template', async () => {
    await open();
    fireEvent.press(screen.getByTestId('preview-fullscreen'));
    expect(screen.getByText('Preview · Venue welcome')).toBeOnTheScreen();
    expect(screen.getByTestId('preview-frame-fullscreen')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('preview-fullscreen-close'));
    expect(screen.queryByText('Preview · Venue welcome')).toBeNull();
  });

  it('sends a test to a valid address with the default values, and says how it went', async () => {
    const answers: Handler[] = [
      () => ({ sendCrmTestEmail: { ok: false, message: null } }),
      () => Promise.reject(new Error('SMTP down')),
    ];
    await open();
    fireEvent.press(screen.getByTestId('template-send-test'));
    expect(screen.getByText('Uses the sample JSON from the Variables tab.')).toBeOnTheScreen();
    await press('send-test-dialog-submit');
    expect(screen.getByText('Enter a valid email')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('send-test-to'), 'qa@duncit.com');
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateSendTestDocument, (v) => answers.shift()?.(v)],
      ]),
    );
    await press('send-test-dialog-submit');
    expect(screen.getByText('Failed')).toBeOnTheScreen();
    await press('send-test-dialog-submit');
    expect(await screen.findByText('SMTP down')).toBeOnTheScreen();
    serve();
    await press('send-test-dialog-submit');
    expect(callsTo(docs.CrmAppEmailTemplateSendTestDocument).at(-1)?.[1]).toEqual({
      id: 't1',
      to: 'qa@duncit.com',
      vars: '{"venue_name":"Grand Hall"}',
    });
    expect(await screen.findByText('Sent to qa@duncit.com')).toBeOnTheScreen();
    expect(screen.queryByTestId('send-test-to')).toBeNull();
  });

  it('says Sent when the server gives no words, and cancels a test', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppEmailTemplateSendTestDocument,
          () => ({ sendCrmTestEmail: { ok: true, message: '' } }),
        ],
      ]),
    );
    await open();
    fireEvent.press(screen.getByTestId('template-send-test'));
    fireEvent.press(screen.getByTestId('send-test-dialog-cancel'));
    expect(screen.queryByTestId('send-test-to')).toBeNull();
    fireEvent.press(screen.getByTestId('template-send-test'));
    fireEvent.changeText(screen.getByTestId('send-test-to'), 'qa@duncit.com');
    await press('send-test-dialog-submit');
    expect(await screen.findByText('Sent')).toBeOnTheScreen();
  });

  it('deletes the template after confirming and goes back, or says why it could not', async () => {
    const answers: Handler[] = [
      () => Promise.reject(new Error('In use')),
      () => ({ deleteCrmEmailTemplate: true }),
    ];
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateDeleteDocument, (v) => answers.shift()?.(v)],
      ]),
    );
    await open();
    fireEvent.press(screen.getByTestId('template-delete'));
    expect(screen.getByText('Delete "Venue welcome"? This cannot be undone.')).toBeOnTheScreen();
    await press('editor-delete-dialog-confirm');
    expect(await screen.findByText('In use')).toBeOnTheScreen();
    expect(mockNav.goBack).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('editor-delete-dialog-cancel'));
    fireEvent.press(screen.getByTestId('template-delete'));
    await press('editor-delete-dialog-confirm');
    expect(callsTo(docs.CrmAppEmailTemplateDeleteDocument).at(-1)?.[1]).toEqual({ id: 't1' });
    expect(mockNav.goBack).toHaveBeenCalled();
  });

  it('says when the template is gone or cannot be read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateDetailDocument, () => ({ crmEmailTemplate: null })],
      ]),
    );
    const { unmount } = renderWithTheme(<EmailTemplateEditorScreen />);
    expect(await screen.findByText('Template not found.')).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Email Templates' });
    unmount();
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateDetailDocument, () => Promise.reject(new Error('Not allowed'))],
      ]),
    );
    renderWithTheme(<EmailTemplateEditorScreen />);
    expect(await screen.findByText('Not allowed')).toBeOnTheScreen();
  });
});
