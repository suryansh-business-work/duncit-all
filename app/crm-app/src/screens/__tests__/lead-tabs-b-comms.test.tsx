import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import type { Lead } from '@/features/leads/useLead';
import { CrmAppVerifyEmailDocument } from '@/graphql/emailVerification';
import * as tabsA from '@/graphql/leadTabs';
import * as docs from '@/graphql/leadTabsB';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { LeadActivity } from '../lead/LeadActivity';
import { CommsTab } from '../lead/tabs/CommsTab';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

/** Lead › Communications: filter and search the calls and emails, and each call's transcript and AI summary. */

const request = gqlRequest as jest.Mock;
const NONE = {
  status: 'NONE',
  text: '',
  key_points: [],
  sentiment: null,
  outcome: '',
  follow_ups: [],
  reminder_id: null,
  error: '',
};
const item = (over: Record<string, unknown>) => ({
  id: 'x',
  type: 'CALL',
  direction: 'OUTBOUND',
  status: 'COMPLETED',
  subject: null,
  provider_name: null,
  contact_name: null,
  contact_value: '9811000001',
  error_message: null,
  duration_seconds: 0,
  recording_url: null,
  transcript: null,
  transcript_status: 'NONE',
  from_number: null,
  created_at: '2026-11-24T10:00:00.000Z',
  transcript_segments: [],
  summary: NONE,
  ...over,
});
const ITEMS = [
  item({
    id: 'e1',
    type: 'EMAIL',
    status: 'FAILED',
    subject: '',
    provider_name: 'Zoho SMTP',
    contact_name: 'Rohit',
    contact_value: 'rohit@cafe.in',
    error_message: 'Mailbox full',
  }),
  item({
    id: 'c1',
    direction: 'INBOUND',
    from_number: '+911140000000',
    recording_url: 'https://cdn.duncit.com/c1.m4a',
    transcript_status: 'READY',
    transcript_segments: [
      { seq: 1, speaker: 'AGENT', text: 'Hello', at: '2026-11-24T10:00:05.000Z' },
      { seq: 2, speaker: 'LEAD', text: 'Hi there', at: null },
    ],
    summary: {
      ...NONE,
      status: 'READY',
      text: 'Wants Sunday slots',
      key_points: ['Budget 5k'],
      sentiment: 'POSITIVE',
      outcome: 'Booked a visit',
      follow_ups: ['Send menu'],
      reminder_id: 'r1',
    },
  }),
  item({ id: 'c2', status: 'NO_ANSWER', recording_url: 'https://cdn.duncit.com/c2.m4a' }),
  item({
    id: 'c4',
    transcript_status: 'READY',
    transcript: 'Agent: hi',
    summary: { ...NONE, status: 'FAILED', error: 'Quota' },
  }),
];
const LEAD: Lead = {
  id: 'v1',
  name: 'Smash Arena',
  city: 'Pune',
  lead_status: 'New',
  priority: 'Medium',
  assigned_to: null,
  next_follow_up_date: null,
  contacts: [],
  activity_log: [],
};

type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadCommsDocument)
      return { communicationLogs: { total: 4, items: ITEMS } };
    if (doc === tabsA.CrmAppContactEmailStatusesDocument)
      return {
        crmEmailStatuses: [
          {
            email: 'rohit@cafe.in',
            status: 'VERIFIED',
            checked_at: '2026-11-20T10:00:00.000Z',
            suggestion: '',
          },
        ],
      };
    if (doc === CrmAppVerifyEmailDocument)
      return {
        crmVerifyEmail: {
          id: 'v',
          email: 'rohit@cafe.in',
          status: 'RISKY',
          suggestion: '',
          created_at: '2026-11-25T10:00:00.000Z',
        },
      };
    if (doc === docs.CrmAppRequestTranscriptDocument)
      return { requestCommunicationTranscript: { id: vars.id, transcript_status: 'PENDING' } };
    if (doc === docs.CrmAppSummarizeCallDocument)
      return { summarizeCommunicationLog: { id: vars.id, summary: { status: 'READY' } } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
/** The filter the last read of the log asked with. */
const lastFilter = () => callsTo(docs.CrmAppLeadCommsDocument).at(-1)?.[1]?.filter;
const open = (id: string, title: string) =>
  fireEvent.press(within(screen.getByTestId(`comm-${id}`)).getByText(title));

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('LeadActivity (Communications)', () => {
  it('lists calls and emails with their counts, status, provider, contact, error and email check', async () => {
    renderWithTheme(<LeadActivity kind="VENUE_LEAD" id="v1" />);
    expect(await screen.findByText('(no subject)')).toBeOnTheScreen();
    expect(lastFilter()).toEqual({
      entity_type: 'VENUE_LEAD',
      entity_id: 'v1',
      type: null,
      search: null,
    });
    // The tab already names it: no in-page heading repeating it.
    expect(screen.queryByText('Communication Log')).toBeNull();
    expect(screen.getByText('All (4)')).toBeOnTheScreen();
    expect(screen.getByText('Email (1)')).toBeOnTheScreen();
    expect(screen.getByText('Call (3)')).toBeOnTheScreen();
    expect(screen.getByText('Zoho SMTP')).toBeOnTheScreen();
    expect(screen.getByText('Mailbox full')).toBeOnTheScreen();
    expect(screen.getByText(/^Rohit · rohit@cafe\.in · /)).toBeOnTheScreen();
    const badge = await screen.findByTestId('email-status-verified');
    await act(async () => fireEvent.press(badge));
    expect(callsTo(CrmAppVerifyEmailDocument)[0]?.[1]).toEqual({ email: 'rohit@cafe.in' });
    expect(await screen.findByTestId('email-status-risky')).toBeOnTheScreen();
  });

  it('filters by kind and searches once typing pauses', async () => {
    renderWithTheme(<LeadActivity kind="HOST_LEAD" id="h1" />);
    await screen.findByText('(no subject)');
    fireEvent.press(screen.getByTestId('crm-comms-filter-call'));
    await waitFor(() =>
      expect(lastFilter()).toMatchObject({ entity_type: 'HOST_LEAD', type: 'CALL' }),
    );
    fireEvent.changeText(screen.getByTestId('crm-comms-search'), ' sunday ');
    await waitFor(() => expect(lastFilter()).toMatchObject({ type: 'CALL', search: 'sunday' }));
    fireEvent.press(screen.getByTestId('crm-comms-filter-all'));
    await waitFor(() => expect(lastFilter()).toMatchObject({ type: null }));
  });

  it('opens a call to its caller ID, transcript by speaker and AI summary, and regenerates the summary', async () => {
    renderWithTheme(<LeadActivity kind="VENUE_LEAD" id="v1" />);
    await screen.findByText('(no subject)');
    open('c1', 'Incoming call');
    expect(screen.getByText('From +911140000000')).toBeOnTheScreen();
    expect(screen.getByText(/^You · /)).toBeOnTheScreen();
    expect(screen.getByText('Contact')).toBeOnTheScreen();
    expect(screen.getByText('Hi there')).toBeOnTheScreen();
    expect(screen.getByText('Wants Sunday slots')).toBeOnTheScreen();
    expect(screen.getByText('Positive')).toBeOnTheScreen();
    expect(screen.getByText('Follow-up reminder created')).toBeOnTheScreen();
    expect(screen.getByText('Outcome: Booked a visit')).toBeOnTheScreen();
    expect(screen.getByText('Budget 5k')).toBeOnTheScreen();
    expect(screen.getByText('Send menu')).toBeOnTheScreen();
    const reads = callsTo(docs.CrmAppLeadCommsDocument).length;
    await act(async () => fireEvent.press(screen.getByTestId('comm-resummarize')));
    expect(callsTo(docs.CrmAppSummarizeCallDocument)[0]?.[1]).toEqual({ id: 'c1' });
    await waitFor(() =>
      expect(callsTo(docs.CrmAppLeadCommsDocument).length).toBeGreaterThan(reads),
    );
  });

  it('asks for a recorded call’s transcript, and says why when it cannot', async () => {
    renderWithTheme(<LeadActivity kind="VENUE_LEAD" id="v1" />);
    await screen.findByText('(no subject)');
    open('c2', 'Outgoing call');
    expect(screen.getByText('Transcript not requested')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('comm-request-transcript')));
    expect(callsTo(docs.CrmAppRequestTranscriptDocument)[0]?.[1]).toEqual({ id: 'c2' });

    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppRequestTranscriptDocument,
          () => Promise.reject(new Error('No recording on Twilio')),
        ],
      ]),
    );
    await act(async () => fireEvent.press(screen.getByTestId('comm-request-transcript')));
    expect(await screen.findByText('No recording on Twilio')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('comm-error-close'));
    expect(screen.queryByText('No recording on Twilio')).toBeNull();
  });

  it('retries a failed summary', async () => {
    renderWithTheme(<LeadActivity kind="VENUE_LEAD" id="v1" />);
    await screen.findByText('(no subject)');
    open('c4', 'Outgoing call');
    expect(screen.getByText('Agent: hi')).toBeOnTheScreen();
    expect(screen.getByText('Summary failed · Quota')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('comm-summarize')));
    expect(callsTo(docs.CrmAppSummarizeCallDocument)[0]?.[1]).toEqual({ id: 'c4' });
  });

  it('says when there is nothing yet, and retries a failed read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadCommsDocument, () => Promise.reject(new Error('Network down'))],
      ]),
    );
    renderWithTheme(<CommsTab kind="VENUE_LEAD" id="v1" lead={LEAD} onChanged={jest.fn()} />);
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadCommsDocument, () => ({ communicationLogs: { total: 0, items: [] } })],
      ]),
    );
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(
      await screen.findByText(
        'No communication yet. Email or call from the actions above to start the log.',
      ),
    ).toBeOnTheScreen();
    expect(callsTo(tabsA.CrmAppContactEmailStatusesDocument)).toHaveLength(0);
  });
});
