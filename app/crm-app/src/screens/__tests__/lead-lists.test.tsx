import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as editorDocs from '@/graphql/leadEditor';
import * as docs from '@/graphql/leadLists';
import { CrmAppLeadSearchDocument } from '@/graphql/leads';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { LeadListScreen } from '../leads/LeadListScreen';
import { LeadsScreen } from '../leads/LeadsScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), setOptions: jest.fn(), setParams: jest.fn() };
let mockParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

/** Leads › one kind: the portal's per-kind listing on the phone. */

const request = gqlRequest as jest.Mock;
const WAIT = { timeout: 3000 };
const ROW = {
  id: 'v1',
  name: 'Smash Arena',
  extra: null,
  city: 'Pune',
  lead_status: 'New',
  priority: 'High',
  assigned_to: 'Asha',
  next_follow_up_date: '2026-12-01T00:00:00.000Z',
  created_at: '2026-11-01T00:00:00.000Z',
  super_category: { name: 'Sports' },
  contacts: [{ mobile_number: '9811000001', email: 'hello@smash.example' }],
  is_duplicate: true,
  distance_km: null,
  geo_precision: null,
  quality: {
    score: 72.4,
    classification_label: 'Warm',
    tone: 'warning',
    qualification: 'QUALIFIED',
  },
  matched_user: { platforms_used: ['WEB', 'ANDROID'], last_activity_at: null },
};
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppVenueLeadsTableDocument)
      return { venueLeadsTable: { total: 1, unplaced: null, rows: [ROW] } };
    if (doc === docs.CrmAppCreatorLeadsTableDocument)
      return { creatorLeadsTable: { total: 0, unplaced: null, rows: [] } };
    if (doc === docs.CrmAppDeleteVenueLeadDocument) return { deleteVenueLead: true };
    if (doc === editorDocs.CrmAppLeadOptionsDocument)
      return {
        crmLeadConfig: {
          venue_types: [],
          venue_lead_statuses: ['New', 'Won'],
          host_lead_statuses: ['New'],
          priorities: ['Low', 'High'],
        },
        categories: [{ id: 'sc1', name: 'Sports', is_active: true }],
      };
    if (doc === editorDocs.CrmAppAssignableUsersDocument)
      return { crmAssignableUsers: [{ id: 'u1', name: 'Asha' }] };
    if (doc === docs.CrmAppRecalculateLeadScoresDocument)
      return { recalculateCrmLeadQualityScores: { job_id: 'j1', total: 12 } };
    throw new Error('unexpected operation');
  });
const tableCalls = () =>
  request.mock.calls.filter(([d]) => d === docs.CrmAppVenueLeadsTableDocument);
const lastQuery = () => tableCalls().at(-1)?.[1];

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { kind: 'VENUE_LEAD' };
});

describe('LeadListScreen', () => {
  it('reads the kind’s table next follow-up first and shows each card as the portal row does', async () => {
    serve();
    renderWithTheme(<LeadListScreen />);
    expect(await screen.findByText('Smash Arena', {}, WAIT)).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Venue Leads' });
    expect(lastQuery()).toEqual({
      query: {
        search: null,
        page: 1,
        page_size: 25,
        sort_by: 'next_follow_up_date',
        sort_dir: 'asc',
        filters: [],
      },
      near: null,
    });
    expect(screen.getByTestId('lead-duplicate-chip')).toHaveTextContent('Duplicate');
    expect(screen.getByText('72 · Warm')).toBeOnTheScreen();
    expect(screen.getByText('Qualified')).toBeOnTheScreen();
    expect(screen.getByText('Pune · hello@smash.example')).toBeOnTheScreen();
    expect(screen.getByText(/^Assigned To: Asha · Follow-up: /)).toBeOnTheScreen();
    expect(
      screen.getByText('Devices: Android, Web · Last activity: Not recorded yet'),
    ).toBeOnTheScreen();
    expect(screen.getByText('1 lead')).toBeOnTheScreen();
  });

  it('opens, edits and adds leads of its kind', async () => {
    serve();
    renderWithTheme(<LeadListScreen />);
    fireEvent.press(await screen.findByText('Smash Arena', {}, WAIT));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadDetail', { kind: 'VENUE_LEAD', id: 'v1' });
    fireEvent.press(screen.getByTestId('lead-list-more-v1'));
    fireEvent.press(screen.getByTestId('lead-list-actions-edit'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadEditor', { kind: 'VENUE_LEAD', id: 'v1' });
    // A long press opens the same sheet: log a note or schedule a follow-up from the list.
    fireEvent(screen.getByTestId('lead-list-row-v1'), 'onLongPress');
    fireEvent.press(screen.getByTestId('lead-list-actions-note'));
    expect(mockNav.navigate).toHaveBeenCalledWith('AddNote', {
      kind: 'VENUE_LEAD',
      id: 'v1',
      name: 'Smash Arena',
    });
    fireEvent.press(screen.getByTestId('lead-list-more-v1'));
    fireEvent.press(screen.getByTestId('lead-list-actions-follow-up'));
    expect(mockNav.navigate).toHaveBeenCalledWith('AddReminder', {
      kind: 'VENUE_LEAD',
      id: 'v1',
      name: 'Smash Arena',
    });
    fireEvent.press(screen.getByTestId('lead-list-more-v1'));
    fireEvent.press(screen.getByTestId('lead-list-actions-open'));
    expect(mockNav.navigate).toHaveBeenLastCalledWith('LeadDetail', {
      kind: 'VENUE_LEAD',
      id: 'v1',
    });
    fireEvent.press(screen.getByTestId('lead-list-call-v1'));
    expect(mockNav.navigate).toHaveBeenLastCalledWith('Call', {
      kind: 'VENUE_LEAD',
      id: 'v1',
      to: '9811000001',
      leadName: 'Smash Arena',
      contactName: 'Smash Arena',
    });
    fireEvent.press(screen.getByTestId('lead-list-new'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadEditor', { kind: 'VENUE_LEAD' });
    fireEvent.press(screen.getByTestId('lead-list-services'));
    expect(mockNav.navigate).toHaveBeenCalledWith('ServicesOffered');
  });

  it('searches on the server', async () => {
    serve();
    renderWithTheme(<LeadListScreen />);
    await screen.findByText('Smash Arena', {}, WAIT);
    fireEvent.changeText(screen.getByTestId('lead-list-search'), ' smash ');
    await waitFor(() => expect(lastQuery()?.query.search).toBe('smash'), WAIT);
  });

  it('deletes a lead after a confirm, and keeps the dialog open with the reason when it fails', async () => {
    let fail = true;
    serve(
      new Map([
        [
          docs.CrmAppDeleteVenueLeadDocument,
          () => {
            if (fail) throw new Error('Not allowed');
            return { deleteVenueLead: true };
          },
        ],
      ]),
    );
    renderWithTheme(<LeadListScreen />);
    fireEvent.press(await screen.findByTestId('lead-list-more-v1', {}, WAIT));
    fireEvent.press(screen.getByTestId('lead-list-actions-delete'));
    expect(screen.getByText('Delete "Smash Arena"? This cannot be undone.')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('lead-list-delete-dialog-confirm')));
    expect(screen.getByTestId('lead-list-delete-dialog-error')).toHaveTextContent('Not allowed');
    fail = false;
    await act(async () => fireEvent.press(screen.getByTestId('lead-list-delete-dialog-confirm')));
    expect(request).toHaveBeenCalledWith(docs.CrmAppDeleteVenueLeadDocument, { id: 'v1' });
    expect(screen.getByTestId('lead-list-status')).toHaveTextContent('Venue lead deleted');
    fireEvent.press(screen.getByTestId('lead-list-more-v1'));
    fireEvent.press(screen.getByTestId('lead-list-actions-delete'));
    fireEvent.press(screen.getByTestId('lead-list-delete-dialog-cancel'));
    expect(screen.queryByTestId('lead-list-delete-dialog-error')).toBeNull();
  });

  it('recalculates every score of the kind, and says when there is nothing or it failed', async () => {
    const answers = [
      () => ({ recalculateCrmLeadQualityScores: { job_id: 'j1', total: 12 } }),
      () => ({ recalculateCrmLeadQualityScores: { job_id: null, total: 0 } }),
      () => {
        throw new Error('busy');
      },
    ];
    serve(new Map([[docs.CrmAppRecalculateLeadScoresDocument, () => answers.shift()?.()]]));
    renderWithTheme(<LeadListScreen />);
    await screen.findByText('Smash Arena', {}, WAIT);
    const run = async () => {
      fireEvent.press(screen.getByTestId('lead-quality-recalculate-all'));
      await act(async () => fireEvent.press(screen.getByTestId('recalculate-dialog-confirm')));
    };
    await run();
    expect(request).toHaveBeenCalledWith(docs.CrmAppRecalculateLeadScoresDocument, {
      entity_type: 'VENUE_LEAD',
    });
    expect(screen.getByTestId('lead-list-status')).toHaveTextContent(
      'Rescoring 12 leads. Follow the progress in the header.',
    );
    await run();
    expect(screen.getByTestId('lead-list-status')).toHaveTextContent(
      'There are no leads of this type to score.',
    );
    await run();
    expect(screen.getByTestId('recalculate-dialog-error')).toHaveTextContent(
      'The recalculation could not be started: busy',
    );
    fireEvent.press(screen.getByTestId('recalculate-dialog-cancel'));
    expect(screen.queryByTestId('recalculate-dialog-error')).toBeNull();
  });

  it('shows the kind’s own empty text, and no Fill with AI, import or devices for creator leads', async () => {
    mockParams = { kind: 'CREATOR_LEAD' };
    serve();
    renderWithTheme(<LeadListScreen />);
    expect(
      await screen.findByText(
        'No creator leads yet. Click "New Creator Lead" to add the first one.',
        {},
        WAIT,
      ),
    ).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Creators Leads' });
    expect(screen.queryByTestId('lead-list-ai')).toBeNull();
    expect(screen.queryByTestId('lead-list-import')).toBeNull();
    expect(screen.queryByTestId('lead-list-services')).toBeNull();
  });

  it('shows a failed read with a retry', async () => {
    let fail = true;
    serve(
      new Map([
        [
          docs.CrmAppVenueLeadsTableDocument,
          () => {
            if (fail) throw new Error('offline');
            return {
              venueLeadsTable: {
                total: 1,
                unplaced: null,
                rows: [
                  { ...ROW, is_duplicate: false, quality: null, matched_user: null, contacts: [] },
                ],
              },
            };
          },
        ],
      ]),
    );
    renderWithTheme(<LeadListScreen />);
    expect(await screen.findByText('offline', {}, WAIT)).toBeOnTheScreen();
    fail = false;
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(await screen.findByText('Smash Arena', {}, WAIT)).toBeOnTheScreen();
    expect(screen.queryByTestId('lead-duplicate-chip')).toBeNull();
    expect(screen.getByText('Not scored yet')).toBeOnTheScreen();
    expect(screen.getByText('Devices: Not on Duncit')).toBeOnTheScreen();
  });
});

describe('LeadsScreen › one kind', () => {
  it('opens the kind’s full listing from the Leads tab', async () => {
    mockParams = { kind: 'HOST_LEAD' };
    request.mockResolvedValue({ searchCrmLeads: { total: 0, page: 1, page_size: 25, rows: [] } });
    renderWithTheme(<LeadsScreen />);
    await waitFor(
      () => expect(request).toHaveBeenCalledWith(CrmAppLeadSearchDocument, expect.anything()),
      WAIT,
    );
    fireEvent.press(screen.getByTestId('leads-open-list'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadList', { kind: 'HOST_LEAD' });
  });

  it('offers no full listing while every kind is shown', async () => {
    mockParams = {};
    request.mockResolvedValue({ searchCrmLeads: { total: 0, page: 1, page_size: 25, rows: [] } });
    renderWithTheme(<LeadsScreen />);
    await waitFor(() => expect(request).toHaveBeenCalled(), WAIT);
    expect(screen.queryByTestId('leads-open-list')).toBeNull();
  });
});
