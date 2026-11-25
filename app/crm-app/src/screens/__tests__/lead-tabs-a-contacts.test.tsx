import { Linking } from 'react-native';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import type { LeadKind } from '@/features/leads/leadKinds';
import type { Lead } from '@/features/leads/useLead';
import { CrmAppVerifyEmailDocument } from '@/graphql/emailVerification';
import * as docs from '@/graphql/leadTabs';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { LeadContactsTab } from '../lead/tabs/LeadContactsTab';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), push: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));

/** The lead page's Contacts tab and the email composer behind its Email actions. */

const request = gqlRequest as jest.Mock;
const lead: Lead = {
  id: 'v1',
  name: 'Grand Hall',
  city: 'Pune',
  lead_status: 'New',
  priority: 'Low',
  assigned_to: null,
  next_follow_up_date: null,
  contacts: [
    {
      name: 'Meera',
      role: 'Owner',
      mobile_number: '9812345678',
      whatsapp_number: '+91 98123 45678',
      email: 'Meera@GrandHall.in',
    },
    { name: null, role: null, mobile_number: null, whatsapp_number: null, email: null },
    {
      name: null,
      role: null,
      mobile_number: null,
      whatsapp_number: null,
      email: 'bookings@grandhall.in',
    },
  ],
  activity_log: [],
};
const template = {
  template_id: 't1',
  name: 'Venue intro',
  subject: 'Hello {{ venue_name }}',
  target: 'VENUE',
  mjml: '<mj-text>Hi {{ contact_name }}, {{ offer }}</mj-text>',
  is_active: true,
  variables: [{ key: 'offer', sample: '10% off' }],
  attachments: [{ url: 'https://cdn.duncit.com/deck.pdf', name: 'Deck' }],
};

type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppContactEmailStatusesDocument)
      return {
        crmEmailStatuses: [
          {
            email: 'meera@grandhall.in',
            status: 'INVALID',
            checked_at: '2026-11-01T10:00:00.000Z',
            suggestion: 'meera@grandhall.com',
          },
        ],
      };
    if (doc === docs.CrmAppComposeProvidersDocument)
      return {
        commsProviderOptions: [
          { id: 'p1', name: 'Zoho', is_default: false },
          { id: 'p2', name: 'SES', is_default: true },
        ],
      };
    if (doc === docs.CrmAppComposeTemplatesDocument)
      return {
        crmEmailTemplates: [
          template,
          { ...template, template_id: 't2', name: 'Host intro', target: 'HOST' },
        ],
      };
    if (doc === docs.CrmAppComposeRenderDocument)
      return {
        renderCrmEmailTemplate: {
          html: '<p>Hi Meera, 10% off {{ left }}</p>',
          errors: ['Unknown tag mj-foo'],
        },
      };
    if (doc === docs.CrmAppComposeVenueEmailDocument)
      return { emailVenueLeadContact: { ok: true, message: 'Email sent' } };
    if (doc === docs.CrmAppComposeHostEmailDocument)
      return { emailHostLeadContact: { ok: true, message: null } };
    if (doc === docs.CrmAppComposeEcommEmailDocument)
      return { emailEcommLeadContact: { ok: false, message: 'SMTP refused' } };
    if (doc === docs.CrmAppComposeProspectEmailDocument)
      return { emailCrmLeadContact: { ok: true, message: 'Queued' } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const renderTab = (kind: LeadKind = 'VENUE_LEAD', cardLead: Lead = lead) =>
  renderWithTheme(<LeadContactsTab kind={kind} id="v1" lead={cardLead} onChanged={jest.fn()} />);
const openCompose = async () => {
  fireEvent.press(await screen.findByTestId('lead-contact-0-compose'));
  return screen.findByTestId('compose-email');
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  serve();
});

describe('LeadContactsTab', () => {
  it("shows every contact, the primary first, with each one's details and email status", async () => {
    renderTab();
    const first = screen.getByTestId('lead-contact-0');
    expect(within(first).getByText('Meera')).toBeOnTheScreen();
    expect(within(first).getByText('Owner')).toBeOnTheScreen();
    expect(within(first).getByText('Primary')).toBeOnTheScreen();
    expect(within(screen.getByTestId('lead-contact-1')).getByText('Contact 2')).toBeOnTheScreen();
    expect(await within(first).findByText('Invalid')).toBeOnTheScreen();
    expect(within(screen.getByTestId('lead-contact-2')).getByText('Not checked')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppContactEmailStatusesDocument)[0]?.[1]).toEqual({
      emails: ['meera@grandhall.in', 'bookings@grandhall.in'],
    });
  });

  it('calls on the CRM call line and opens WhatsApp; a contact without details has the actions off', async () => {
    renderTab();
    fireEvent.press(screen.getByTestId('lead-contact-0-mobile'));
    expect(mockNav.navigate).toHaveBeenCalledWith('Call', {
      kind: 'VENUE_LEAD',
      id: 'v1',
      to: '9812345678',
      leadName: 'Grand Hall',
      contactName: 'Meera',
    });
    fireEvent.press(screen.getByTestId('lead-contact-0-whatsapp'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/919812345678');
    expect(within(screen.getByTestId('lead-contact-1')).getByText('No number')).toBeOnTheScreen();
    expect(within(screen.getByTestId('lead-contact-1')).getByText('No email')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('lead-contact-1-call'));
    fireEvent.press(screen.getByTestId('lead-contact-1-compose'));
    expect(mockNav.navigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('compose-email')).toBeNull();
  });

  it('checks an email again from its badge, and says when the check failed', async () => {
    let attempt = 0;
    serve(
      new Map<unknown, Handler>([
        [
          CrmAppVerifyEmailDocument,
          () => {
            attempt += 1;
            if (attempt === 1)
              return {
                crmVerifyEmail: {
                  email: 'meera@grandhall.in',
                  status: 'VERIFIED',
                  created_at: '2026-11-25T10:00:00.000Z',
                  suggestion: '',
                },
              };
            return Promise.reject(new Error('Reacher is down'));
          },
        ],
      ]),
    );
    renderTab();
    await act(async () => fireEvent.press(await screen.findByTestId('email-status-invalid')));
    expect(await screen.findByTestId('email-status-verified')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('email-status-verified')));
    expect(await screen.findByTestId('lead-contacts-verify-error')).toHaveTextContent(
      'Reacher is down',
      { exact: false },
    );
    expect(screen.getByTestId('email-status-verified')).toBeOnTheScreen();
  });

  it('says when there are no contacts, and shows nothing when the status lookup fails', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppContactEmailStatusesDocument, () => Promise.reject(new Error('down'))],
      ]),
    );
    const { unmount } = renderTab('VENUE_LEAD', { ...lead, contacts: [] });
    expect(screen.getByTestId('lead-contacts-empty')).toHaveTextContent('No contacts on file yet.');
    unmount();
    const warn = jest.spyOn(logs.mobileApp, 'warn').mockImplementation(() => undefined);
    renderTab();
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('crm-app/useEmailStatuses', 'lookup', { error: 'down' }),
    );
    expect(screen.getByText('Meera@GrandHall.in')).toBeOnTheScreen();
    expect(screen.queryByTestId('email-status-invalid')).toBeNull();
    expect(screen.queryByTestId('email-status-not_checked')).toBeNull();
  });
});

describe('EmailComposeModal', () => {
  it('sends a plain-text email with the default provider and shows the server answer', async () => {
    renderTab();
    const sheet = await openCompose();
    expect(within(sheet).getByText('Email · Meera')).toBeOnTheScreen();
    expect(screen.getByTestId('compose-to').props.value).toBe('Meera@GrandHall.in');
    expect(screen.getByTestId('compose-subject').props.value).toBe('Regarding Meera');
    expect(await screen.findByText('SES · default')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('compose-send')));
    expect(screen.getByText('Write a message.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('compose-subject'), ' ');
    fireEvent.changeText(screen.getByTestId('compose-to'), '');
    await act(async () => fireEvent.press(screen.getByTestId('compose-send')));
    expect(screen.getByText('Enter the email address to send it to.')).toBeOnTheScreen();
    expect(screen.getByText('Enter a subject.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('compose-to'), ' meera@grandhall.in ');
    fireEvent.changeText(screen.getByTestId('compose-subject'), 'Weekend slots');
    fireEvent.changeText(screen.getByTestId('compose-message'), 'Hi Meera,\nAre <weekends> free?');
    await act(async () => fireEvent.press(screen.getByTestId('compose-send')));
    expect(callsTo(docs.CrmAppComposeVenueEmailDocument)[0]?.[1]).toEqual({
      id: 'v1',
      contact_email: 'meera@grandhall.in',
      subject: 'Weekend slots',
      body: 'Hi Meera,<br/>Are &lt;weekends&gt; free?',
      provider_id: 'p2',
      attachments: [],
    });
    expect(screen.queryByTestId('compose-email')).toBeNull();
    expect(screen.getByTestId('compose-result')).toHaveTextContent('Email sent');
  });

  it('sends a template filled from the contact, with its attachments', async () => {
    renderTab();
    await openCompose();
    fireEvent.press(screen.getByTestId('compose-mode-template'));
    expect(await screen.findByText('Pick a saved template.')).toBeOnTheScreen();
    expect(screen.queryByTestId('compose-template-t2')).toBeNull();
    await act(async () => fireEvent.press(screen.getByTestId('compose-send')));
    expect(screen.getByText('Pick a template.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('compose-template-t1'));
    expect(screen.getByTestId('compose-var-offer').props.value).toBe('10% off');
    expect(screen.getByTestId('compose-var-contact_name').props.value).toBe('Meera');
    expect(screen.getByTestId('compose-var-venue_name').props.value).toBe('Meera');
    expect(screen.getByText('1 attachment(s) will be sent.')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('compose-send')));
    expect(
      screen.getByText('The template is still being prepared. Try Send again in a moment.'),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('compose-var-venue_name'), 'Grand Hall');
    expect(
      await screen.findByTestId('compose-render-errors', {}, { timeout: 3000 }),
    ).toHaveTextContent('Unknown tag mj-foo');
    await act(async () => fireEvent.press(screen.getByTestId('compose-send')));
    expect(callsTo(docs.CrmAppComposeRenderDocument).at(-1)?.[1]).toEqual({
      mjml: template.mjml,
      vars: JSON.stringify({ contact_name: 'Meera', offer: '10% off', venue_name: 'Grand Hall' }),
    });
    expect(callsTo(docs.CrmAppComposeVenueEmailDocument)[0]?.[1]).toMatchObject({
      subject: 'Hello Grand Hall',
      body: '<p>Hi Meera, 10% off </p>',
      attachments: [{ url: 'https://cdn.duncit.com/deck.pdf', name: 'Deck' }],
    });
  });

  it("uses each kind's own send, and says when it did not go", async () => {
    const send = async (kind: LeadKind) => {
      const view = renderTab(kind);
      await openCompose();
      fireEvent.changeText(screen.getByTestId('compose-message'), 'Hello');
      await act(async () => fireEvent.press(screen.getByTestId('compose-send')));
      return view;
    };
    (await send('HOST_LEAD')).unmount();
    expect(callsTo(docs.CrmAppComposeHostEmailDocument)).toHaveLength(1);
    const ecomm = await send('ECOMM_LEAD');
    expect(screen.getByTestId('compose-result')).toHaveTextContent('SMTP refused');
    ecomm.unmount();
    await send('COMMUNITY_LEAD');
    expect(callsTo(docs.CrmAppComposeProspectEmailDocument)[0]?.[1]).toMatchObject({
      entity_type: 'COMMUNITY_LEAD',
      id: 'v1',
    });
    expect(screen.getByTestId('compose-result')).toHaveTextContent('Queued');
  });

  it('keeps the sheet open with the reason when sending fails, and with no providers', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppComposeProvidersDocument, () => ({ commsProviderOptions: [] })],
        [docs.CrmAppComposeVenueEmailDocument, () => Promise.reject(new Error('Mailbox full'))],
      ]),
    );
    renderTab();
    await openCompose();
    expect(await screen.findByTestId('compose-no-providers')).toHaveTextContent(
      'No active providers — configure in Tech portal',
    );
    fireEvent.changeText(screen.getByTestId('compose-message'), 'Hello');
    await act(async () => fireEvent.press(screen.getByTestId('compose-send')));
    expect(callsTo(docs.CrmAppComposeVenueEmailDocument)[0]?.[1]).toMatchObject({
      provider_id: null,
    });
    expect(screen.getByTestId('compose-error')).toHaveTextContent('Mailbox full', { exact: false });
    fireEvent.press(screen.getByTestId('compose-email-close'));
    expect(screen.queryByTestId('compose-email')).toBeNull();
  });
});
