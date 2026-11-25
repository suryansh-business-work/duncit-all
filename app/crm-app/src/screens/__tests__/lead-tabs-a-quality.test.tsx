import { act, fireEvent, screen, within } from '@testing-library/react-native';

import type { Lead } from '@/features/leads/useLead';
import * as docs from '@/graphql/leadTabs';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { ApiError } from '@/utils/errors';
import { LeadQualityTab } from '../lead/tabs/LeadQualityTab';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));

/** The lead page's Quality Score tab: summary, recalculation, breakdown, evidence and history. */

const request = gqlRequest as jest.Mock;
const lead: Lead = {
  id: 'v1',
  name: 'Grand Hall',
  city: 'Pune',
  lead_status: 'New',
  priority: 'Low',
  assigned_to: null,
  next_follow_up_date: null,
  contacts: [],
  activity_log: [],
};
const details = {
  scored_version: 3,
  published_version: 3,
  stale: false,
  scored_at: '2026-11-20T10:00:00.000Z',
  result: {
    score: 62.5,
    max_score: 100,
    classification_label: 'Good',
    tone: 'warning',
    qualification: 'PENDING_VERIFICATION',
    verification: 'IN_PROGRESS',
    min_qualification_score: 60,
    potential_score: 80,
    verified_items: 2,
    pending_items: 1,
    failed_items: 0,
    gates: [
      { key: 'maps', name: 'Google Maps', state: 'PASSED' },
      { key: 'ig', name: 'Instagram', state: 'SKIPPED' },
    ],
    criteria: [
      {
        key: 'presence',
        name: 'Online presence',
        max: 40,
        earned: 22.5,
        status: 'PARTIAL',
        mandatory: true,
        items: [
          {
            key: 'presence.maps',
            name: 'Maps listing',
            points: 20,
            earned: 20,
            status: 'VERIFIED',
            mandatory: true,
            auto_check: 'GOOGLE_MAPS_LISTING',
            threshold: null,
            guidance: 'Search the venue name',
          },
          {
            key: 'presence.ig',
            name: 'IG followers',
            points: 20,
            earned: 2.5,
            status: 'PENDING',
            mandatory: false,
            auto_check: 'INSTAGRAM_FOLLOWERS_MIN',
            threshold: 1000,
            guidance: null,
          },
        ],
      },
    ],
  },
  evidence: [
    {
      item_key: 'presence.maps',
      status: 'VERIFIED',
      evidence: 'Listed with 120 reviews',
      source_url: 'https://maps.google.com/x',
      notes: 'Checked',
      via: 'MANUAL',
      decided_at: '2026-11-19T10:00:00.000Z',
      actor: { name: 'Priya' },
    },
  ],
};
const events = [
  {
    id: 'e1',
    kind: 'SCORE',
    trigger: 'RECALCULATE',
    score_before: 50,
    score_after: 62.5,
    classification: 'Good',
    item_key: '',
    status_before: '',
    status_after: '',
    evidence: '',
    source_url: '',
    via: 'SYSTEM',
    created_at: '2026-11-20T10:00:00.000Z',
    actor: { name: 'System' },
  },
  {
    id: 'e2',
    kind: 'EVIDENCE',
    trigger: 'EVIDENCE',
    score_before: null,
    score_after: null,
    classification: '',
    item_key: 'presence.maps',
    status_before: 'PENDING',
    status_after: 'VERIFIED',
    evidence: 'Listed',
    source_url: 'https://maps.google.com/x',
    via: 'MANUAL',
    created_at: '2026-11-19T10:00:00.000Z',
    actor: { name: 'Priya' },
  },
];

type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadQualityDocument) return { crmLeadQuality: details };
    if (doc === docs.CrmAppLeadQualityHistoryDocument) return { crmLeadQualityHistory: events };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const renderTab = () =>
  renderWithTheme(<LeadQualityTab kind="VENUE_LEAD" id="v1" lead={lead} onChanged={jest.fn()} />);
const openCriterion = async () => {
  fireEvent.press(await screen.findByTestId('lead-quality-toggle-presence'));
};

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('LeadQualityTab', () => {
  it('shows the score, qualification, gates, the breakdown and the history', async () => {
    renderTab();
    expect(await screen.findByTestId('lead-quality-classification')).toHaveTextContent('Good');
    expect(screen.getByText('Pending verification')).toBeOnTheScreen();
    expect(screen.getByText('Verification in progress')).toBeOnTheScreen();
    expect(screen.getByText('2 verified · 1 pending · 0 not met')).toBeOnTheScreen();
    expect(screen.getByText('Up to 80 if every pending item is verified')).toBeOnTheScreen();
    expect(
      screen.getByText('Qualifies at 60 or more once every gate has passed'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/with criteria version 3$/)).toBeOnTheScreen();
    expect(screen.getByText('Google Maps: Passed')).toBeOnTheScreen();
    expect(screen.getByText('Instagram: To verify')).toBeOnTheScreen();
    expect(screen.getByText('Online presence')).toBeOnTheScreen();
    expect(screen.getByText('Earned: 22.5/40')).toBeOnTheScreen();
    expect(screen.getByText('Partial')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('lead-quality-total')).getByText('Maximum: 100 · Earned: 62.5'),
    ).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppLeadQualityDocument)[0]?.[1]).toEqual({
      entity_type: 'VENUE_LEAD',
      lead_id: 'v1',
    });

    const history = screen.getByTestId('lead-quality-history');
    expect(await within(history).findByText('Score 50 → 62.5')).toBeOnTheScreen();
    expect(within(history).getByText(/^Recalculated · System · /)).toBeOnTheScreen();
    expect(within(history).getByText('Maps listing: Pending → Verified')).toBeOnTheScreen();
    expect(within(history).getByText(/^CRM team · Priya · /)).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppLeadQualityHistoryDocument)[0]?.[1]).toEqual({
      entity_type: 'VENUE_LEAD',
      lead_id: 'v1',
      limit: 50,
    });
  });

  it('opens a criterion to its items, how each is checked and the evidence behind it', async () => {
    renderTab();
    await openCriterion();
    const maps = screen.getByTestId('lead-quality-item-presence.maps');
    expect(within(maps).getByText('20 of 20 points')).toBeOnTheScreen();
    expect(within(maps).getByText('Google Maps listing')).toBeOnTheScreen();
    expect(within(maps).getByText('How to verify: Search the venue name')).toBeOnTheScreen();
    expect(within(maps).getByText('Listed with 120 reviews')).toBeOnTheScreen();
    expect(within(maps).getByText('Checked')).toBeOnTheScreen();
    expect(within(maps).getByText(/^CRM team · Priya · /)).toBeOnTheScreen();
    const ig = screen.getByTestId('lead-quality-item-presence.ig');
    expect(within(ig).getByText('Instagram followers · Threshold: 1000')).toBeOnTheScreen();
    expect(within(ig).getByText('No evidence recorded yet.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('lead-quality-toggle-presence'));
    expect(screen.queryByTestId('lead-quality-item-presence.ig')).toBeNull();
  });

  it('recalculates, lists the checks that could not run and reloads the history', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppRecalculateLeadQualityDocument,
          () => ({
            recalculateCrmLeadQuality: {
              skipped_checks: ['No Instagram account is connected'],
              details: { ...details, stale: true, scored_version: 2 },
            },
          }),
        ],
      ]),
    );
    renderTab();
    const leadQualityRecalculate = await screen.findByTestId('lead-quality-recalculate');
    await act(async () => fireEvent.press(leadQualityRecalculate));
    expect(callsTo(docs.CrmAppRecalculateLeadQualityDocument)[0]?.[1]).toEqual({
      entity_type: 'VENUE_LEAD',
      lead_id: 'v1',
      external: false,
    });
    expect(await screen.findByText('Quality score recalculated.')).toBeOnTheScreen();
    expect(screen.getByText('Some automatic checks could not run')).toBeOnTheScreen();
    expect(screen.getByText('No Instagram account is connected')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Scored with version 2 of the criteria, but version 3 is published now. Recalculate to update the score.',
      ),
    ).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppLeadQualityHistoryDocument).length).toBe(2);
  });

  it('says why a reverify failed', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppRecalculateLeadQualityDocument,
          () => Promise.reject(new Error('Serper key missing')),
        ],
      ]),
    );
    renderTab();
    const leadQualityReverify = await screen.findByTestId('lead-quality-reverify');
    await act(async () => fireEvent.press(leadQualityReverify));
    expect(callsTo(docs.CrmAppRecalculateLeadQualityDocument)[0]?.[1]).toMatchObject({
      external: true,
    });
    expect(
      await screen.findByText('The score could not be recalculated: Serper key missing'),
    ).toBeOnTheScreen();
  });

  it('records evidence once it says what proves it with a web source', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppRecordLeadEvidenceDocument,
          () => ({ recordCrmLeadEvidence: { skipped_checks: [], details } }),
        ],
      ]),
    );
    renderTab();
    await openCriterion();
    fireEvent.press(screen.getByTestId('lead-quality-record-presence.ig'));
    expect(screen.getByText('IG followers · 20 points')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('evidence-save')));
    expect(screen.getByText('Say what proves it (at least 3 characters).')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('evidence-text'), '1.2k followers');
    fireEvent.changeText(screen.getByTestId('evidence-source'), 'instagram profile');
    await act(async () => fireEvent.press(screen.getByTestId('evidence-save')));
    expect(
      screen.getByText('Enter a full http(s) link, e.g. https://instagram.com/name.'),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('evidence-source'), '');
    await act(async () => fireEvent.press(screen.getByTestId('evidence-save')));
    expect(callsTo(docs.CrmAppRecordLeadEvidenceDocument)[0]?.[1]).toEqual({
      entity_type: 'VENUE_LEAD',
      lead_id: 'v1',
      decisions: [
        {
          item_key: 'presence.ig',
          status: 'VERIFIED',
          evidence: '1.2k followers',
          source_url: null,
          notes: null,
        },
      ],
    });
    expect(screen.queryByTestId('evidence-sheet')).toBeNull();
    expect(await screen.findByText('Evidence saved and the score recalculated.')).toBeOnTheScreen();
  });

  it('keeps the sheet open with the server refusals, and clears a decision', async () => {
    let attempt = 0;
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppRecordLeadEvidenceDocument,
          () => {
            attempt += 1;
            if (attempt === 1)
              return Promise.reject(
                new ApiError('Bad input', 400, { errors: ['Quote the public source'] }),
              );
            if (attempt === 2) return Promise.reject(new Error('Network error'));
            return { recordCrmLeadEvidence: { skipped_checks: [], details } };
          },
        ],
      ]),
    );
    renderTab();
    await openCriterion();
    fireEvent.press(screen.getByTestId('lead-quality-record-presence.maps'));
    expect(screen.getByTestId('evidence-text').props.value).toBe('Listed with 120 reviews');
    await act(async () => fireEvent.press(screen.getByTestId('evidence-save')));
    expect(screen.getByTestId('evidence-refused')).toHaveTextContent(
      'The evidence was not saved:Quote the public source',
    );
    await act(async () => fireEvent.press(screen.getByTestId('evidence-save')));
    expect(screen.getByTestId('evidence-refused')).toHaveTextContent(
      'The evidence was not saved:Network error',
    );
    fireEvent.press(screen.getByTestId('evidence-status-PENDING'));
    expect(screen.getByTestId('evidence-clear-hint')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('evidence-save')));
    expect(callsTo(docs.CrmAppRecordLeadEvidenceDocument)[2]?.[1]).toMatchObject({
      decisions: [{ item_key: 'presence.maps', status: 'PENDING' }],
    });
    expect(screen.queryByTestId('evidence-sheet')).toBeNull();
  });

  it('says when the lead is not scored yet and the history is empty', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppLeadQualityDocument,
          () => ({
            crmLeadQuality: {
              ...details,
              result: null,
              stale: true,
              scored_at: null,
              evidence: [],
            },
          }),
        ],
        [docs.CrmAppLeadQualityHistoryDocument, () => ({ crmLeadQualityHistory: [] })],
      ]),
    );
    renderTab();
    expect(await screen.findByTestId('lead-quality-classification')).toHaveTextContent(
      'Not scored yet',
    );
    expect(
      screen.getByText(
        'This lead has not been scored yet. Recalculate to score it with the published criteria.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('lead-quality-stale')).toBeNull();
    expect(screen.queryByTestId('lead-quality-breakdown')).toBeNull();
    expect(await screen.findByText('No changes recorded yet.')).toBeOnTheScreen();
  });

  it('shows why the score could not be loaded, and retries', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadQualityDocument, () => Promise.reject(new Error('Forbidden'))],
      ]),
    );
    renderTab();
    expect(await screen.findByText('Forbidden')).toBeOnTheScreen();
    serve();
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(await screen.findByTestId('lead-quality-tab')).toBeOnTheScreen();
  });
});
