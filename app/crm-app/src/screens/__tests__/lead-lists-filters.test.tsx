import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';

import * as editorDocs from '@/graphql/leadEditor';
import * as docs from '@/graphql/leadLists';
import { gqlRequest } from '@/services/graphql.client';
import { pressHeaderRight, renderWithTheme } from '@/test-utils';
import { LeadListScreen } from '../leads/LeadListScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), setOptions: jest.fn() };

const openTool = (key: string) => {
  pressHeaderRight(mockNav.setOptions);
  fireEvent.press(screen.getByTestId(`lead-list-tools-${key}`));
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: { kind: 'HOST_LEAD' } }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

/** Leads › one kind › Filters (order and every column filter) and Nearby leads. */

const request = gqlRequest as jest.Mock;
const WAIT = { timeout: 3000 };
const ROW = {
  id: 'h1',
  name: 'Pune Runners',
  extra: 'Club',
  city: 'Pune',
  lead_status: 'New',
  priority: 'Low',
  assigned_to: null,
  next_follow_up_date: null,
  created_at: null,
  super_category: null,
  contacts: [{ mobile_number: '9811000002', email: null }],
  is_duplicate: false,
  distance_km: 1.24,
  geo_precision: 'AREA',
  quality: null,
  matched_user: { platforms_used: [], last_activity_at: '2026-11-20T10:00:00.000Z' },
};
let failNearby = false;
const serve = () =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    if (doc === docs.CrmAppHostLeadsTableDocument) {
      if (vars.near && failNearby) throw new Error('Nearby search is down');
      return { hostLeadsTable: { total: 3, unplaced: vars.near ? 2 : null, rows: [ROW] } };
    }
    if (doc === docs.CrmAppNearbyLocationsDocument)
      return {
        locations: [
          { id: 'l1', city: 'Mumbai', location_zones: [{ zone_name: 'Bandra' }] },
          { id: 'l2', city: 'Pune', location_zones: null },
        ],
      };
    if (doc === editorDocs.CrmAppLeadOptionsDocument)
      return {
        crmLeadConfig: {
          venue_types: [],
          venue_lead_statuses: [],
          host_lead_statuses: ['New', 'Won'],
          priorities: ['Low', 'High'],
        },
        categories: [{ id: 'sc1', name: 'Sports', is_active: true }],
      };
    if (doc === editorDocs.CrmAppAssignableUsersDocument)
      return { crmAssignableUsers: [{ id: 'u1', name: 'Asha' }] };
    throw new Error('unexpected operation');
  });
const lastVars = () =>
  request.mock.calls.filter(([d]) => d === docs.CrmAppHostLeadsTableDocument).at(-1)?.[1];
const open = async () => {
  renderWithTheme(<LeadListScreen />);
  await screen.findByText('Pune Runners', {}, WAIT);
};
const openFilters = async () => {
  fireEvent.press(screen.getByTestId('lead-list-filters'));
  await screen.findByTestId('filter-status-Won', {}, WAIT);
};
const pickDate = (date: Date) =>
  (DateTimePickerAndroid.open as jest.Mock).mockImplementationOnce(({ onChange }) =>
    onChange({ type: 'set' }, date),
  );

beforeEach(() => {
  jest.clearAllMocks();
  failNearby = false;
  serve();
  (Location.requestForegroundPermissionsAsync as jest.Mock)
    .mockReset()
    .mockResolvedValue({ granted: false });
  (Location.getCurrentPositionAsync as jest.Mock).mockReset();
});

describe('LeadListScreen › Filters', () => {
  it('filters by the kind’s statuses, a person, devices, the extra column and an order', async () => {
    await open();
    await openFilters();
    fireEvent.press(screen.getByTestId('filter-status-Won'));
    fireEvent.press(screen.getByTestId('filter-assignee-u1'));
    fireEvent.press(screen.getByTestId('filter-platform-ANDROID'));
    fireEvent.changeText(screen.getByTestId('filter-extra'), ' Club ');
    fireEvent.press(screen.getByTestId('filter-sort-quality_score'));
    fireEvent.press(screen.getByTestId('filter-dir-desc'));
    await act(async () => fireEvent.press(screen.getByTestId('filter-apply')));
    await waitFor(() => expect(lastVars()?.query.sort_by).toBe('quality_score'), WAIT);
    expect(lastVars()?.query).toMatchObject({
      sort_dir: 'desc',
      filters: [
        { field: 'lead_status', op: 'in', values: ['Won'] },
        { field: 'assigned_to', op: 'in', values: ['u1'] },
        { field: 'duncit_platforms', op: 'in', values: ['ANDROID'] },
        { field: 'host_type', op: 'contains', value: 'Club' },
      ],
    });
    expect(screen.getByLabelText('Filters (4)')).toBeOnTheScreen();
    // The badge is visual only; the button's own label already says the count.
    expect(
      screen.getByTestId('lead-list-filter-count', { includeHiddenElements: true }),
    ).toHaveTextContent('4');
    await openFilters();
    await act(async () => fireEvent.press(screen.getByTestId('filter-clear')));
    await waitFor(
      () =>
        expect(lastVars()?.query).toMatchObject({ sort_by: 'next_follow_up_date', filters: [] }),
      WAIT,
    );
  });

  it('takes a score range and whole-day date ranges, refusing a score off the scale or a range the wrong way round', async () => {
    await open();
    await openFilters();
    fireEvent.changeText(screen.getByTestId('filter-score-min'), '120');
    await act(async () => fireEvent.press(screen.getByTestId('filter-apply')));
    expect(screen.getByText('Enter a score from 0 to 100')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('filter-score-min'), '80');
    fireEvent.changeText(screen.getByTestId('filter-score-max'), '40');
    await act(async () => fireEvent.press(screen.getByTestId('filter-apply')));
    expect(screen.getByText('The first value cannot be after the second')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('filter-score-max'), '');
    pickDate(new Date(2026, 10, 30, 15, 0));
    await act(async () => fireEvent.press(screen.getByTestId('filter-followUpFrom')));
    pickDate(new Date(2026, 11, 2, 9, 0));
    await act(async () => fireEvent.press(screen.getByTestId('filter-createdTo')));
    fireEvent.press(screen.getByTestId('filter-createdTo-clear'));
    pickDate(new Date(2026, 11, 5, 9, 0));
    await act(async () => fireEvent.press(screen.getByTestId('filter-createdTo')));
    await act(async () => fireEvent.press(screen.getByTestId('filter-apply')));
    await waitFor(() => expect(lastVars()?.query.filters).toHaveLength(3), WAIT);
    expect(lastVars()?.query.filters).toEqual([
      { field: 'quality_score', op: 'gte', value: '80' },
      {
        field: 'next_follow_up_date',
        op: 'gte',
        value: new Date(2026, 10, 30, 0, 0, 0, 0).toISOString(),
      },
      {
        field: 'created_at',
        op: 'lte',
        value: new Date(2026, 11, 5, 23, 59, 59, 999).toISOString(),
      },
    ]);
  });

  it('shows the options’ failed read with a retry, and closes without applying', async () => {
    let fail = true;
    const base = request.getMockImplementation();
    request.mockImplementation(async (doc: unknown, vars: Record<string, unknown>) => {
      if (doc === editorDocs.CrmAppLeadOptionsDocument && fail) throw new Error('Options are down');
      return base?.(doc, vars);
    });
    await open();
    fireEvent.press(screen.getByTestId('lead-list-filters'));
    expect(await screen.findByText('Options are down', {}, WAIT)).toBeOnTheScreen();
    fail = false;
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(await screen.findByTestId('filter-status-Won', {}, WAIT)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('filters-sheet-close'));
    expect(screen.queryByTestId('filter-status-Won')).toBeNull();
  });
});

describe('LeadListScreen › Nearby leads', () => {
  it('searches around a picked city and area, nearest first, then lists every lead again', async () => {
    await open();
    openTool('nearby');
    fireEvent.press(screen.getByTestId('nearby-source-place'));
    await act(async () => fireEvent.press(screen.getByTestId('nearby-find')));
    expect(screen.getByText('Pick a city')).toBeOnTheScreen();
    fireEvent.press(await screen.findByTestId('nearby-city-Mumbai', {}, WAIT));
    fireEvent.press(screen.getByTestId('nearby-area-Bandra'));
    fireEvent.press(screen.getByTestId('nearby-radius-10'));
    fireEvent.press(screen.getByTestId('nearby-radius-add'));
    expect(screen.getByTestId('nearby-radius-value')).toHaveTextContent('10.5 km');
    await act(async () => fireEvent.press(screen.getByTestId('nearby-find')));
    expect(await screen.findByTestId('nearby-result', {}, WAIT)).toHaveTextContent(
      '3 leads within 10.5 km',
    );
    expect(screen.getByTestId('nearby-unplaced')).toHaveTextContent(
      '2 leads of this kind have no city we can place on the map, so no nearby search includes them.',
    );
    expect(lastVars()).toMatchObject({
      near: { city: 'Mumbai', area: 'Bandra', radius_km: 10.5 },
      query: { sort_by: 'distance_km', sort_dir: 'asc' },
    });
    fireEvent.press(screen.getByTestId('nearby-view'));
    expect(screen.getByText('Within 10.5 km of Bandra, Mumbai')).toBeOnTheScreen();
    expect(screen.getByTestId('lead-list-distance-h1')).toHaveTextContent('1.2 km · Area centre');
    fireEvent.press(screen.getByTestId('nearby-clear'));
    await waitFor(
      () =>
        expect(lastVars()).toMatchObject({ near: null, query: { sort_by: 'next_follow_up_date' } }),
      WAIT,
    );
    // Back to every lead: the nearby chip is gone.
    expect(screen.queryByTestId('nearby-chip')).toBeNull();
  });

  it('searches around the phone once location is allowed, and says why when it is not', async () => {
    await open();
    openTool('nearby');
    await act(async () => fireEvent.press(screen.getByTestId('nearby-find')));
    expect(
      within(await screen.findByTestId('nearby-error', {}, WAIT)).getByText(
        'Location access is off for Duncit CRM. Allow it in Settings, or pick a city or area instead.',
      ),
    ).toBeOnTheScreen();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: true,
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValueOnce(new Error('no fix'));
    fireEvent.press(screen.getByTestId('nearby-change'));
    await act(async () => fireEvent.press(screen.getByTestId('nearby-find')));
    expect(
      within(await screen.findByTestId('nearby-error', {}, WAIT)).getByText(
        'Your location could not be found. Try again, or pick a city or area instead.',
      ),
    ).toBeOnTheScreen();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: true,
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 18.5, longitude: 73.8 },
    });
    fireEvent.press(screen.getByTestId('nearby-change'));
    await act(async () => fireEvent.press(screen.getByTestId('nearby-find')));
    expect(await screen.findByTestId('nearby-result', {}, WAIT)).toHaveTextContent(
      '3 leads within 5 km',
    );
    expect(lastVars()?.near).toEqual({ lat: 18.5, lng: 73.8, radius_km: 5 });
    fireEvent.press(screen.getByTestId('nearby-sheet-close'));
    expect(screen.getByText('Within 5 km of you')).toBeOnTheScreen();
  });

  it('reports a failed nearby read in the sheet', async () => {
    failNearby = true;
    await open();
    openTool('nearby');
    fireEvent.press(screen.getByTestId('nearby-source-place'));
    fireEvent.press(await screen.findByTestId('nearby-city-Pune', {}, WAIT));
    await act(async () => fireEvent.press(screen.getByTestId('nearby-find')));
    expect(
      within(await screen.findByTestId('nearby-error', {}, WAIT)).getByText(
        'Nearby search is down',
      ),
    ).toBeOnTheScreen();
    expect(lastVars()?.near).toEqual({ city: 'Pune', radius_km: 5 });
  });
});
