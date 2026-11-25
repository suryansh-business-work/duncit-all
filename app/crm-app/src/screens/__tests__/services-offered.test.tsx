import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import * as docs from '@/graphql/servicesOffered';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { ServicesOfferedScreen } from '../services-offered/ServicesOfferedScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: {} }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

/** CRM › Data › Services Offered: the portal's table as a list of cards — search, sort, pages, edit, delete. */

const request = gqlRequest as jest.Mock;
const noTargets = {
  applies_to_venue: false,
  applies_to_host: false,
  applies_to_ecomm: false,
  applies_to_creator: false,
  applies_to_community: false,
};
const SOUND = {
  id: 's1',
  title: 'Sound System',
  super_category_name: 'Events',
  category_name: 'Audio',
  sub_category_name: 'Speakers',
  ...noTargets,
  applies_to_venue: true,
  applies_to_host: true,
  is_active: true,
  created_at: '2026-03-09T08:00:00.000Z',
};
const CATERING = {
  id: 's2',
  title: 'Catering',
  super_category_name: 'Food',
  category_name: null,
  sub_category_name: '  ',
  applies_to_venue: true,
  applies_to_host: true,
  applies_to_ecomm: true,
  applies_to_creator: true,
  applies_to_community: true,
  is_active: false,
  created_at: null,
};
const COACHING = {
  ...CATERING,
  id: 's3',
  title: 'Coaching',
  super_category_name: null,
  ...noTargets,
  is_active: true,
};
type Handler = (vars: Record<string, unknown>) => unknown;
const page = (rows: unknown[], total = rows.length) => ({
  crmServicesOfferedTable: { total, rows },
});
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppServicesOfferedTableDocument) return page([SOUND, CATERING, COACHING]);
    if (doc === docs.CrmAppDeleteServiceOfferedDocument) return { deleteCrmServiceOffered: true };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const lastQuery = () => callsTo(docs.CrmAppServicesOfferedTableDocument).at(-1)?.[1];

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('ServicesOfferedScreen — the list', () => {
  it('shows each service as its table row: title, active, slot, lead types and when it was added', async () => {
    renderWithTheme(<ServicesOfferedScreen />);
    expect(await screen.findByText('Sound System')).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Services Offered' });
    expect(screen.getByText(/Service titles filed under Super/)).toBeOnTheScreen();
    expect(lastQuery()).toEqual({
      query: { search: null, page: 1, page_size: 25, sort_by: null, sort_dir: 'asc' },
    });
    // The two kinds that are on, every kind as "All lead types", none as a dash.
    expect(screen.getByText('Venue')).toBeOnTheScreen();
    expect(screen.getByText('Host')).toBeOnTheScreen();
    expect(screen.getByText('All lead types')).toBeOnTheScreen();
    expect(within(screen.getByTestId('service-s1')).getByText('Active')).toBeOnTheScreen();
    expect(within(screen.getByTestId('service-s2')).getByText('Inactive')).toBeOnTheScreen();
    expect(screen.getByText('Speakers')).toBeOnTheScreen();
    // Coaching: no super; Catering: no category and a blank sub; Coaching: no lead type.
    expect(screen.getAllByText('—')).toHaveLength(6);
    expect(screen.getAllByText(/^Created: .+/)).toHaveLength(1);
    expect(screen.getByLabelText('Edit Sound System')).toBeOnTheScreen();
    expect(screen.getByLabelText('Delete Catering')).toBeOnTheScreen();
  });

  it('searches on the server and says when nothing matches', async () => {
    renderWithTheme(<ServicesOfferedScreen />);
    await screen.findByText('Sound System');
    serve(new Map<unknown, Handler>([[docs.CrmAppServicesOfferedTableDocument, () => page([])]]));
    fireEvent.changeText(screen.getByTestId('services-search'), '  pa system ');
    expect(await screen.findByText('No matches for your search.')).toBeOnTheScreen();
    expect(lastQuery()).toEqual({
      query: { search: 'pa system', page: 1, page_size: 25, sort_by: null, sort_dir: 'asc' },
    });
  });

  it('sorts by a column, flips it on a second tap, and goes back to the portal order', async () => {
    renderWithTheme(<ServicesOfferedScreen />);
    await screen.findByText('Sound System');
    expect(screen.getByText('Sort by')).toBeOnTheScreen();
    expect(screen.getByLabelText('Order, sorted ascending')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('service-sort-title'));
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ query: { sort_by: 'title', sort_dir: 'asc' } }),
    );
    expect(screen.getByLabelText('Title, sorted ascending')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('service-sort-title'));
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ query: { sort_by: 'title', sort_dir: 'desc' } }),
    );
    expect(screen.getByLabelText('Title, sorted descending')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('service-sort-created_at'));
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ query: { sort_by: 'created_at', sort_dir: 'asc' } }),
    );

    fireEvent.press(screen.getByTestId('service-sort-sort_order'));
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ query: { sort_by: null, sort_dir: 'asc' } }),
    );
    fireEvent.press(screen.getByTestId('service-sort-sort_order'));
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ query: { sort_by: 'sort_order', sort_dir: 'desc' } }),
    );
  });

  it('reads the next page at the end of the list', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppServicesOfferedTableDocument,
          (vars) =>
            (vars.query as { page: number }).page === 1
              ? page([SOUND], 2)
              : new Promise(() => undefined),
        ],
      ]),
    );
    renderWithTheme(<ServicesOfferedScreen />);
    await screen.findByText('Sound System');
    // The first page is read on focus and again once the search box settles.
    await waitFor(() => expect(callsTo(docs.CrmAppServicesOfferedTableDocument)).toHaveLength(2));
    await act(async () => undefined);
    fireEvent(screen.getByTestId('services-list'), 'onEndReached');
    await waitFor(() => expect(lastQuery()).toMatchObject({ query: { page: 2 } }));
    // The next page is on its way under the rows already shown.
    expect(screen.getByText('Loading…')).toBeOnTheScreen();
  });

  it('opens add, and edit with the row it was tapped on', async () => {
    renderWithTheme(<ServicesOfferedScreen />);
    fireEvent.press(await screen.findByTestId('services-add'));
    expect(mockNav.navigate).toHaveBeenCalledWith('ServiceOfferedEditor', {});
    fireEvent.press(screen.getByTestId('service-edit-s1'));
    expect(mockNav.navigate).toHaveBeenLastCalledWith('ServiceOfferedEditor', {
      service: {
        id: 's1',
        title: 'Sound System',
        is_active: true,
        ...noTargets,
        applies_to_venue: true,
        applies_to_host: true,
      },
    });
  });
});

describe('ServicesOfferedScreen — delete and empty states', () => {
  it('deletes only after confirming, then reads the list again', async () => {
    renderWithTheme(<ServicesOfferedScreen />);
    fireEvent.press(await screen.findByTestId('service-delete-s1'));
    expect(screen.getByText('Delete service')).toBeOnTheScreen();
    expect(screen.getByText('Delete "Sound System"?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('service-delete-dialog-cancel'));
    expect(callsTo(docs.CrmAppDeleteServiceOfferedDocument)).toHaveLength(0);

    fireEvent.press(screen.getByTestId('service-delete-s1'));
    const before = callsTo(docs.CrmAppServicesOfferedTableDocument).length;
    await act(async () => fireEvent.press(screen.getByTestId('service-delete-dialog-confirm')));
    expect(callsTo(docs.CrmAppDeleteServiceOfferedDocument)[0]?.[1]).toEqual({ id: 's1' });
    await waitFor(() =>
      expect(callsTo(docs.CrmAppServicesOfferedTableDocument).length).toBeGreaterThan(before),
    );
    expect(screen.queryByText('Delete "Sound System"?')).toBeNull();
  });

  it('keeps the dialog open with the reason when the delete fails', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppDeleteServiceOfferedDocument, () => Promise.reject(new Error('In use'))],
      ]),
    );
    renderWithTheme(<ServicesOfferedScreen />);
    fireEvent.press(await screen.findByTestId('service-delete-s2'));
    await act(async () => fireEvent.press(screen.getByTestId('service-delete-dialog-confirm')));
    expect(await screen.findByText('In use')).toBeOnTheScreen();
    expect(screen.getByText('Delete "Catering"?')).toBeOnTheScreen();
  });

  it('says there are no services yet when the list is empty', async () => {
    serve(new Map<unknown, Handler>([[docs.CrmAppServicesOfferedTableDocument, () => page([])]]));
    renderWithTheme(<ServicesOfferedScreen />);
    expect(
      await screen.findByText(
        'No services yet. Click "Add Service Offered" to create your first one.',
      ),
    ).toBeOnTheScreen();
  });

  it('offers a retry when the list cannot be read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppServicesOfferedTableDocument, () => Promise.reject(new Error('Network down'))],
      ]),
    );
    renderWithTheme(<ServicesOfferedScreen />);
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
    await waitFor(() => expect(callsTo(docs.CrmAppServicesOfferedTableDocument)).toHaveLength(2));
    await act(async () => undefined);
    serve();
    await act(async () => fireEvent.press(screen.getByTestId('state-retry')));
    expect(await screen.findByText('Sound System')).toBeOnTheScreen();
  });
});
