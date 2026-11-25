import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as docs from '@/graphql/emailTemplates';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { EmailTemplateCreateScreen } from '../email-templates/EmailTemplateCreateScreen';
import { EmailTemplatesScreen } from '../email-templates/EmailTemplatesScreen';

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
  useRoute: () => ({ params: undefined }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
  StackActions: {
    replace: (name: string, params: object) => ({ type: 'REPLACE', payload: { name, params } }),
  },
}));

/** CRM › Email Templates: the templates list, and creating a template. */

const request = gqlRequest as jest.Mock;
const STARTER =
  '<mjml><mj-body><mj-section><mj-column><mj-text>Duncit starter</mj-text></mj-column></mj-section></mj-body></mjml>';
const ROWS = [
  {
    template_id: 't1',
    slug: 'venue-welcome',
    name: 'Venue welcome',
    subject: 'Welcome to Duncit',
    target: 'VENUE',
    is_active: true,
    updated_at: '2026-11-20T10:00:00.000Z',
  },
  {
    template_id: 't2',
    slug: 'footer',
    name: 'Footer',
    subject: 'Our footer',
    target: 'STATIC',
    is_active: false,
    updated_at: null,
  },
  {
    template_id: 't3',
    slug: 'legacy',
    name: 'Legacy',
    subject: 'Old one',
    target: 'LEGACY',
    is_active: true,
    updated_at: null,
  },
];
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppEmailTemplateListDocument)
      return { crmEmailTemplatesTable: { total: ROWS.length, rows: ROWS } };
    if (doc === docs.CrmAppEmailTemplateDeleteDocument) return { deleteCrmEmailTemplate: true };
    if (doc === docs.CrmAppEmailTemplateStarterDocument) return { crmEmailStarterMjml: STARTER };
    if (doc === docs.CrmAppEmailTemplateCreateDocument)
      return { createCrmEmailTemplate: { template_id: 't9' } };
    if (doc === docs.CrmAppEmailTemplateGenerateMjmlDocument)
      return { generateCrmEmailMjml: '<mjml>AI</mjml>' };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('EmailTemplatesScreen', () => {
  it('lists the templates by name with slug, audience, subject and state, and opens them', async () => {
    renderWithTheme(<EmailTemplatesScreen />);
    expect(await screen.findByText('Venue welcome')).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Email Templates' });
    expect(callsTo(docs.CrmAppEmailTemplateListDocument)[0]?.[1].query).toMatchObject({
      search: null,
      sort_by: 'name',
      sort_dir: 'asc',
    });
    expect(screen.getByText('venue-welcome')).toBeOnTheScreen();
    expect(screen.getByText('Welcome to Duncit')).toBeOnTheScreen();
    expect(screen.getByText('Venue')).toBeOnTheScreen();
    expect(screen.getByText('Static')).toBeOnTheScreen();
    expect(screen.getByText('LEGACY')).toBeOnTheScreen();
    expect(screen.getByText('Inactive')).toBeOnTheScreen();
    expect(screen.getByText(/^Updated /)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('template-row-t1'));
    expect(mockNav.navigate).toHaveBeenCalledWith('EmailTemplateEditor', { id: 't1' });
    fireEvent.press(screen.getByTestId('templates-new'));
    expect(mockNav.navigate).toHaveBeenCalledWith('EmailTemplateCreate');
    fireEvent.press(screen.getByTestId('templates-settings'));
    expect(mockNav.navigate).toHaveBeenCalledWith('EmailTemplateSettings', undefined);
  });

  it('searches by what is typed', async () => {
    renderWithTheme(<EmailTemplatesScreen />);
    await screen.findByText('Venue welcome');
    fireEvent.changeText(screen.getByTestId('templates-search'), ' diwali ');
    await waitFor(() =>
      expect(callsTo(docs.CrmAppEmailTemplateListDocument).at(-1)?.[1].query.search).toBe('diwali'),
    );
  });

  it('says when there are no templates yet', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppEmailTemplateListDocument,
          () => ({ crmEmailTemplatesTable: { total: 0, rows: [] } }),
        ],
      ]),
    );
    renderWithTheme(<EmailTemplatesScreen />);
    expect(
      await screen.findByText('No templates yet. Click "New template" to create your first one.'),
    ).toBeOnTheScreen();
  });

  it('deletes a template only after confirming, then says so', async () => {
    renderWithTheme(<EmailTemplatesScreen />);
    await screen.findByText('Venue welcome');
    fireEvent.press(screen.getByTestId('template-delete-t1'));
    expect(screen.getByText('Delete "Venue welcome"? This cannot be undone.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('template-delete-dialog-cancel'));
    expect(callsTo(docs.CrmAppEmailTemplateDeleteDocument)).toHaveLength(0);
    fireEvent.press(screen.getByTestId('template-delete-t1'));
    await press('template-delete-dialog-confirm');
    expect(callsTo(docs.CrmAppEmailTemplateDeleteDocument)[0]?.[1]).toEqual({ id: 't1' });
    expect(await screen.findByText('Template deleted')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('templates-deleted-close'));
    expect(screen.queryByText('Template deleted')).toBeNull();
  });

  it('keeps the dialog open with the reason when a delete fails', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppEmailTemplateDeleteDocument,
          () => Promise.reject(new Error('Template is in use')),
        ],
      ]),
    );
    renderWithTheme(<EmailTemplatesScreen />);
    await screen.findByText('Footer');
    fireEvent.press(screen.getByTestId('template-delete-t2'));
    await press('template-delete-dialog-confirm');
    expect(await screen.findByText('Template is in use')).toBeOnTheScreen();
    expect(screen.queryByText('Template deleted')).toBeNull();
  });
});

describe('EmailTemplateCreateScreen', () => {
  const fill = (name: string, subject: string) => {
    fireEvent.changeText(screen.getByTestId('template-create-name'), name);
    fireEvent.changeText(screen.getByTestId('template-create-subject'), subject);
  };

  it('asks who the template is for first, and keeps what was typed when that changes', async () => {
    renderWithTheme(<EmailTemplateCreateScreen />);
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'New email template' });
    expect(screen.getByText('Who is this template for?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('template-target-HOST'));
    expect(screen.getByText('Host lead emails')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('template-create-name'), 'Host intro');
    fireEvent.press(screen.getByTestId('template-create-change'));
    expect(screen.getByText('Ecomm lead emails')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('template-target-VENUE'));
    expect(screen.getByTestId('template-create-name').props.value).toBe('Host intro');
    expect(screen.getByText('Venue lead emails')).toBeOnTheScreen();
  });

  it('creates on the shared starter with a slug from the name, then opens the editor', async () => {
    renderWithTheme(<EmailTemplateCreateScreen />);
    fireEvent.press(screen.getByTestId('template-target-VENUE'));
    expect(screen.getByTestId('template-create-submit')).toBeDisabled();
    expect(screen.getByTestId('template-create-slug').props.placeholder).toBe('welcome-email');
    fill('  Diwali Offer 2026 ', 'Festive rates inside');
    expect(screen.getByTestId('template-create-slug').props.placeholder).toBe('diwali-offer-2026');
    await waitFor(() => expect(screen.getByTestId('template-create-submit')).not.toBeDisabled());
    await press('template-create-submit');
    expect(callsTo(docs.CrmAppEmailTemplateCreateDocument)[0]?.[1]).toEqual({
      input: {
        slug: 'diwali-offer-2026',
        name: 'Diwali Offer 2026',
        subject: 'Festive rates inside',
        target: 'VENUE',
        mjml: STARTER,
      },
    });
    expect(mockNav.dispatch).toHaveBeenCalledWith({
      type: 'REPLACE',
      payload: { name: 'EmailTemplateEditor', params: { id: 't9' } },
    });
  });

  it('asks for a usable name when it yields no slug, and shows why a create failed', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppEmailTemplateCreateDocument,
          () => Promise.reject(new Error('Slug already exists')),
        ],
      ]),
    );
    renderWithTheme(<EmailTemplateCreateScreen />);
    fireEvent.press(screen.getByTestId('template-target-ECOMM'));
    fill('***', 'Hello');
    await waitFor(() => expect(screen.getByTestId('template-create-submit')).not.toBeDisabled());
    await press('template-create-submit');
    expect(screen.getByText('Pick a type and fill name + subject.')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppEmailTemplateCreateDocument)).toHaveLength(0);
    fireEvent.changeText(screen.getByTestId('template-create-slug'), 'promo');
    await press('template-create-submit');
    expect(callsTo(docs.CrmAppEmailTemplateCreateDocument)[0]?.[1].input).toMatchObject({
      slug: 'promo',
      target: 'ECOMM',
    });
    expect(await screen.findByText('Slug already exists')).toBeOnTheScreen();
    expect(mockNav.dispatch).not.toHaveBeenCalled();
  });

  it('seeds the body with the AI writer, and the template is created with it', async () => {
    renderWithTheme(<EmailTemplateCreateScreen />);
    fireEvent.press(screen.getByTestId('template-target-HOST'));
    await waitFor(() => expect(callsTo(docs.CrmAppEmailTemplateStarterDocument)).toHaveLength(1));
    fireEvent.press(screen.getByTestId('template-create-ai'));
    expect(screen.getByText('Create / update MJML with AI')).toBeOnTheScreen();
    await press('email-ai-dialog-submit');
    expect(screen.getByText('The prompt cannot be empty')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('email-ai-prompt'), ' A host welcome ');
    await press('email-ai-dialog-submit');
    expect(callsTo(docs.CrmAppEmailTemplateGenerateMjmlDocument)[0]?.[1]).toEqual({
      input: { prompt: 'A host welcome', current_mjml: STARTER, target: 'HOST' },
    });
    fill('Host welcome', 'Hi there');
    await press('template-create-submit');
    expect(callsTo(docs.CrmAppEmailTemplateCreateDocument)[0]?.[1].input.mjml).toBe(
      '<mjml>AI</mjml>',
    );
  });

  it('says when the AI wrote nothing or failed, and closes on cancel', async () => {
    const answers = [
      () => ({ generateCrmEmailMjml: '' }),
      () => Promise.reject(new Error('AI is busy')),
    ];
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppEmailTemplateGenerateMjmlDocument, () => answers.shift()?.()],
      ]),
    );
    renderWithTheme(<EmailTemplateCreateScreen />);
    fireEvent.press(screen.getByTestId('template-target-STATIC'));
    fireEvent.press(screen.getByTestId('template-create-ai'));
    fireEvent.changeText(screen.getByTestId('email-ai-prompt'), 'Footer');
    await press('email-ai-dialog-submit');
    expect(screen.getByText('AI did not return MJML')).toBeOnTheScreen();
    await press('email-ai-dialog-submit');
    expect(await screen.findByText('AI is busy')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('email-ai-dialog-cancel'));
    expect(screen.queryByText('AI is busy')).toBeNull();
  });

  it('cannot create while the starter could not be loaded, and goes back on cancel', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppEmailTemplateStarterDocument,
          () => Promise.reject(new Error('Starter unavailable')),
        ],
      ]),
    );
    renderWithTheme(<EmailTemplateCreateScreen />);
    expect(await screen.findByText('Starter unavailable')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('template-target-VENUE'));
    fill('Welcome', 'Hello');
    expect(screen.getByTestId('template-create-submit')).toBeDisabled();
    fireEvent.press(screen.getByTestId('template-create-cancel'));
    expect(mockNav.goBack).toHaveBeenCalled();
  });
});
