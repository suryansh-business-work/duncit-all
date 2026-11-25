import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as docs from '@/graphql/leadResearch';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { ApiError } from '@/utils/errors';
import { CandidateScreen } from '../lead-research/CandidateScreen';
import { LeadDiscoveryScreen } from '../lead-research/LeadDiscoveryScreen';
import { LeadResearchScreen } from '../lead-research/LeadResearchScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
let mockParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

const request = gqlRequest as jest.Mock;
const CANDIDATE = {
  id: 'k1',
  lead_type: 'VENUE_LEAD',
  origin: 'DISCOVERY',
  name: 'Board Game Cafe',
  city: 'Pune',
  area: 'Baner',
  address: '12 Main Rd',
  category: 'Cafe',
  description: 'Games night every Friday',
  phones: ['9811000001'],
  emails: [],
  website: 'https://bgc.in',
  instagram_handle: null,
  instagram_url: null,
  score: 78.4,
  qualification: 'QUALIFIED',
  classification_label: 'Hot',
  missing_evidence: ['Opening hours'],
  status: 'NEW',
  crm_lead_id: null,
  decided_at: null,
  decision_note: null,
  duplicates: [
    { entity_type: 'HOST_LEAD', lead_id: 'h1', lead_name: 'Game Hosts', match: 'phone' },
  ],
  sources: [{ kind: 'GOOGLE_MAPS', url: 'https://maps.example/bgc', title: 'BGC on Maps' }],
};
const JOB = {
  id: 'j1',
  status: 'RUNNING',
  label: 'Cafes in Pune',
  total: 20,
  succeeded: 5,
  failed: 0,
  error_message: '',
  created_at: '2026-11-25T10:00:00.000Z',
  finished_at: null,
  lead_type: 'VENUE_LEAD',
  city: 'Pune',
  locality: null,
  category: 'Cafe',
  stats: { found: 30, saved: 12, qualifying: 5, duplicates: 2 },
};

type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadCandidatesDocument)
      return { crmLeadCandidatesTable: { total: 1, rows: [CANDIDATE] } };
    if (doc === docs.CrmAppLeadCandidateDocument) return { crmLeadCandidate: CANDIDATE };
    if (doc === docs.CrmAppDiscoveryJobsDocument)
      return {
        crmLeadDiscoveryJobs: [
          JOB,
          { ...JOB, id: 'j2', status: 'FAILED', error_message: 'Search quota used up' },
        ],
      };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  serve();
});

describe('LeadResearchScreen', () => {
  it('lists candidates newest first, filters by status, and opens one', async () => {
    renderWithTheme(<LeadResearchScreen />);
    expect(await screen.findByText('Board Game Cafe', {}, { timeout: 2000 })).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('queue-status-ADDED'));
    await waitFor(
      () =>
        expect(callsTo(docs.CrmAppLeadCandidatesDocument).at(-1)?.[1].query).toMatchObject({
          sort_by: 'created_at',
          sort_dir: 'desc',
          filters: [{ field: 'status', op: 'eq', value: 'ADDED' }],
        }),
      { timeout: 2000 },
    );
    fireEvent.press(screen.getByTestId('candidate-row-k1'));
    expect(mockNav.navigate).toHaveBeenCalledWith('Candidate', { id: 'k1' });
  });

  it('shows discoveries with progress, cancels a running one, retries a failed one, and narrows the queue to a job', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppCancelDiscoveryDocument,
          () => ({ cancelCrmLeadDiscovery: { id: 'j1', status: 'CANCELLED' } }),
        ],
        [
          docs.CrmAppRetryDiscoveryDocument,
          () => ({ retryCrmLeadDiscovery: { id: 'j2', status: 'RUNNING' } }),
        ],
      ]),
    );
    renderWithTheme(<LeadResearchScreen />);
    fireEvent.press(screen.getByTestId('research-tab-discoveries'));
    expect(await screen.findByText('5 of 20 qualifying leads found')).toBeOnTheScreen();
    expect(screen.getByText('Search quota used up')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('job-cancel-j1')));
    expect(callsTo(docs.CrmAppCancelDiscoveryDocument)[0]?.[1]).toEqual({ id: 'j1' });
    await act(async () => fireEvent.press(screen.getByTestId('job-retry-j2')));
    expect(callsTo(docs.CrmAppRetryDiscoveryDocument)[0]?.[1]).toEqual({ id: 'j2' });
    fireEvent.press(screen.getByTestId('discover-leads'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadDiscovery');
    fireEvent.press(screen.getByTestId('job-show-j1'));
    expect(await screen.findByTestId('job-filter')).toBeOnTheScreen();
    await waitFor(
      () =>
        expect(callsTo(docs.CrmAppLeadCandidatesDocument).at(-1)?.[1].query.filters).toEqual([
          { field: 'job_id', op: 'eq', value: 'j1' },
        ]),
      { timeout: 2000 },
    );
    fireEvent.press(screen.getByTestId('job-filter-clear'));
    expect(screen.queryByTestId('job-filter')).toBeNull();
  });

  it('says a forbidden cancel in the portal’s words', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppCancelDiscoveryDocument,
          () => {
            throw new ApiError('no', 403, { code: 'FORBIDDEN' });
          },
        ],
      ]),
    );
    renderWithTheme(<LeadResearchScreen />);
    fireEvent.press(screen.getByTestId('research-tab-discoveries'));
    await act(async () => fireEvent.press(await screen.findByTestId('job-cancel-j1')));
    expect(screen.getByTestId('discovery-action-error')).toBeOnTheScreen();
  });
});

describe('CandidateScreen', () => {
  beforeEach(() => {
    mockParams = { id: 'k1' };
  });

  it('shows the candidate, its duplicate, what is missing and where it was found', async () => {
    renderWithTheme(<CandidateScreen />);
    expect(await screen.findByText('Score 78.4 · Hot')).toBeOnTheScreen();
    expect(screen.getByText(/Game Hosts/)).toBeOnTheScreen();
    expect(screen.getByText('Opening hours')).toBeOnTheScreen();
    expect(screen.getByText('BGC on Maps')).toBeOnTheScreen();
  });

  it('adds it to the CRM, allowing an unqualified one when asked, and reports the outcome', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppApproveCandidatesDocument,
          () => ({
            approveCrmLeadCandidates: [
              {
                candidate_id: 'k1',
                name: 'Board Game Cafe',
                outcome: 'ADDED',
                crm_lead_id: 'v9',
                message: '',
              },
            ],
          }),
        ],
      ]),
    );
    renderWithTheme(<CandidateScreen />);
    fireEvent.press(await screen.findByTestId('candidate-approve'));
    fireEvent(screen.getByTestId('allow-unqualified'), 'onCheckedChange', true);
    await act(async () => fireEvent.press(screen.getByTestId('approve-dialog-confirm')));
    expect(callsTo(docs.CrmAppApproveCandidatesDocument)[0]?.[1]).toEqual({
      ids: ['k1'],
      allow_unqualified: true,
    });
    expect(screen.getByTestId('candidate-outcome')).toHaveTextContent(/Added/);
  });

  it('rejects with an optional reason, and keeps the dialog open with the reason it failed', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppRejectCandidatesDocument,
          () => {
            throw new Error('Already decided');
          },
        ],
      ]),
    );
    renderWithTheme(<CandidateScreen />);
    fireEvent.press(await screen.findByTestId('candidate-reject'));
    fireEvent.changeText(screen.getByTestId('reject-note'), ' Closed down ');
    await act(async () => fireEvent.press(screen.getByTestId('reject-dialog-confirm')));
    expect(callsTo(docs.CrmAppRejectCandidatesDocument)[0]?.[1]).toEqual({
      ids: ['k1'],
      note: 'Closed down',
    });
    expect(screen.getByTestId('reject-dialog-error')).toHaveTextContent('Already decided');
  });

  it('opens the CRM lead of an added candidate, and says when the candidate is gone', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppLeadCandidateDocument,
          () => ({ crmLeadCandidate: { ...CANDIDATE, status: 'ADDED', crm_lead_id: 'v9' } }),
        ],
      ]),
    );
    const { unmount } = renderWithTheme(<CandidateScreen />);
    fireEvent.press(await screen.findByTestId('candidate-open-lead'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadDetail', { kind: 'VENUE_LEAD', id: 'v9' });
    expect(screen.queryByTestId('candidate-approve')).toBeNull();
    unmount();
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadCandidateDocument, () => ({ crmLeadCandidate: null })],
      ]),
    );
    renderWithTheme(<CandidateScreen />);
    expect(await screen.findByText('This candidate was not found.')).toBeOnTheScreen();
  });
});

describe('LeadDiscoveryScreen', () => {
  it('refuses a missing city, then starts a discovery and goes back', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppStartDiscoveryDocument,
          () => ({ startCrmLeadDiscovery: { id: 'j9', label: 'Cafes in Pune' } }),
        ],
      ]),
    );
    renderWithTheme(<LeadDiscoveryScreen />);
    await act(async () => fireEvent.press(screen.getByTestId('discovery-start')));
    expect(screen.getByTestId('discovery-city-error')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('discovery-city'), 'Pune');
    fireEvent.changeText(screen.getByTestId('discovery-min-score'), '60');
    fireEvent.press(screen.getByTestId('discovery-sources-INSTAGRAM'));
    await act(async () => fireEvent.press(screen.getByTestId('discovery-start')));
    expect(callsTo(docs.CrmAppStartDiscoveryDocument)[0]?.[1]).toEqual({
      input: {
        lead_type: 'VENUE_LEAD',
        city: 'Pune',
        locality: null,
        category: null,
        keywords: null,
        target_count: 20,
        min_score: 60,
        sources: ['INSTAGRAM'],
        ai_evidence: true,
      },
    });
    expect(mockNav.goBack).toHaveBeenCalled();
  });

  it('refuses a target outside 1–100, and calls out a discovery that is not set up', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppStartDiscoveryDocument,
          () => {
            throw new ApiError('no key', 400, { code: 'NOT_CONFIGURED' });
          },
        ],
      ]),
    );
    renderWithTheme(<LeadDiscoveryScreen />);
    fireEvent.changeText(screen.getByTestId('discovery-city'), 'Pune');
    fireEvent.changeText(screen.getByTestId('discovery-target'), '');
    await act(async () => fireEvent.press(screen.getByTestId('discovery-start')));
    expect(screen.getByTestId('discovery-target-error')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('discovery-target'), '10');
    await act(async () => fireEvent.press(screen.getByTestId('discovery-start')));
    expect(screen.getByTestId('discovery-not-configured')).toBeOnTheScreen();
    expect(mockNav.goBack).not.toHaveBeenCalled();
  });
});
