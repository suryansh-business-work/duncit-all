import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import LocationsPage from '../LocationsPage';
import { CREATE_LOCATION, DELETE_LOCATION, LOCATIONS_TABLE, UPDATE_LOCATION } from '../queries';
import type { LocForm } from '../types';

/** Grid stub with a fetch that round-trips through the suite's MockedProvider. */
vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('../../location-subscriptions/__tests__/table-mock');
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

/** The real fields load the country/state/city datasets; the stub picks a place the way they would. */
vi.mock('../LocationHierarchyFields', () => ({
  default: ({ form, setForm }: { form: LocForm; setForm: (next: LocForm) => void }) => (
    <div>
      <span data-testid="hierarchy">{`${form.country}/${form.state}/${form.city}`}</span>
      <button
        type="button"
        onClick={() =>
          setForm({ ...form, state: 'Karnataka', state_code: 'KA', city: 'Bengaluru', location_name: 'Bengaluru' })
        }
      >
        pick-bengaluru
      </button>
    </div>
  ),
}));

vi.mock('../../../components/MediaPickerField', () => ({
  default: ({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) => (
    <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const zone = (name: string, pincode: string | null) => ({ __typename: 'LocationZone', zone_name: name, pincode });

const locationRow = (over: Record<string, unknown>) => ({
  __typename: 'Location',
  id: 'loc-blr',
  location_name: 'Bengaluru',
  country: 'India',
  country_code: 'IN',
  state: 'Karnataka',
  state_code: 'KA',
  city: 'Bengaluru',
  location_image: 'https://cdn.duncit.com/cities/blr.jpg',
  location_zones: [zone('Koramangala', '560034'), zone('Indiranagar', '560038'), zone('HSR Layout', '560102')],
  is_active: true,
  is_launched: true,
  launch_target: 2000,
  whatsapp_group_url: '',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

const BENGALURU = locationRow({});
/** A city created before `city` and `state` were stored: both blank, no areas yet. */
const OLD_NAGPUR = locationRow({
  id: 'loc-ngp',
  location_name: 'Old Nagpur',
  state: '',
  state_code: '',
  city: '',
  location_image: '',
  location_zones: [],
});

const tableMock = (rows: unknown[]): MockedResponse => ({
  request: { query: LOCATIONS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { locationsTable: { __typename: 'LocationsTablePage', total: rows.length, rows } } },
});

const capture = (query: MockedResponse['request']['query'], data: Record<string, unknown>, sent: unknown[]): MockedResponse => ({
  request: { query, variables: () => true },
  result: (variables: Record<string, unknown>) => {
    sent.push(variables);
    return { data };
  },
});

const rowOf = (name: string) =>
  screen.getAllByTestId('table-row').find((row) => within(row).queryAllByText(name).length > 0) as HTMLElement;

const rowsShown = async (count: number) => {
  await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(count));
};

beforeAll(() => {
  // jsdom has no layout engine, so scrollIntoView is not implemented.
  Element.prototype.scrollIntoView = vi.fn();
});

describe('LocationsPage — the table', () => {
  it('shows each city with its picture, state, first areas and how many more there are', async () => {
    renderWithProviders(<LocationsPage />, { mocks: [tableMock([BENGALURU, OLD_NAGPUR])] });
    await rowsShown(2);

    const blr = rowOf('Bengaluru');
    expect(blr.querySelector('img')).toHaveAttribute('src', 'https://cdn.duncit.com/cities/blr.jpg');
    expect(within(blr).getByTestId('value-state')).toHaveTextContent('Karnataka');
    expect(within(blr).getByText('Koramangala · 560034')).toBeInTheDocument();
    expect(within(blr).getByText('Indiranagar · 560038')).toBeInTheDocument();
    expect(within(blr).getByText('+1 more')).toBeInTheDocument();
    expect(within(blr).getByTestId('value-country')).toHaveTextContent('India');

    const nagpur = rowOf('Old Nagpur');
    expect(within(nagpur).getByTestId('value-city')).toHaveTextContent('Old Nagpur');
    expect(within(nagpur).getByTestId('value-state')).toHaveTextContent('—');
    expect(within(nagpur).getByText('No areas')).toBeInTheDocument();
    expect(within(nagpur).getByText('O')).toBeInTheDocument();
  });

  it('labels an area that has no PIN code by its name alone', async () => {
    renderWithProviders(<LocationsPage />, {
      mocks: [tableMock([locationRow({ location_zones: [zone('Whitefield', null)] })])],
    });
    await rowsShown(1);
    expect(within(rowOf('Bengaluru')).getByTestId('value-zones')).toHaveTextContent('Whitefield');
    expect(within(rowOf('Bengaluru')).queryByText('+1 more')).toBeNull();
  });
});

describe('LocationsPage — editing', () => {
  it('opens a city prefilled and saves it with its active flag', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<LocationsPage />, {
      mocks: [tableMock([BENGALURU]), capture(UPDATE_LOCATION, { updateLocation: { __typename: 'Location', id: 'loc-blr' } }, sent)],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Bengaluru')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('hierarchy')).toHaveTextContent('India/Karnataka/Bengaluru');
    expect(within(dialog).getAllByLabelText('Locality / Area')).toHaveLength(3);

    fireEvent.change(within(dialog).getAllByLabelText('Locality / Area')[0], { target: { value: 'Koramangala 5th Block' } });
    fireEvent.click(within(dialog).getAllByTestId('RemoveCircleOutlinedIcon')[2].closest('button') as HTMLElement);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(sent[0]).toMatchObject({
      id: 'loc-blr',
      input: {
        city: 'Bengaluru',
        is_active: true,
        location_zones: [
          { zone_name: 'Koramangala 5th Block', pincode: '560034' },
          { zone_name: 'Indiranagar', pincode: '560038' },
        ],
      },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refuses to save an area that came back without a PIN code', async () => {
    renderWithProviders(<LocationsPage />, {
      mocks: [tableMock([locationRow({ location_zones: [zone('Whitefield', null)] })])],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Bengaluru')).getByRole('button', { name: 'Edit' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('PIN code is required for every locality / area')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens a city with no areas on one blank area row, and closes from Cancel', async () => {
    renderWithProviders(<LocationsPage />, { mocks: [tableMock([OLD_NAGPUR])] });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Old Nagpur')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const areas = within(dialog).getAllByLabelText('Locality / Area');
    expect(areas).toHaveLength(1);
    expect(areas[0]).toHaveValue('');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('LocationsPage — creating', () => {
  it('creates a new city from the picked place, its image and one area', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<LocationsPage />, {
      mocks: [tableMock([]), capture(CREATE_LOCATION, { createLocation: { __typename: 'Location', id: 'loc-new' } }, sent)],
    });

    fireEvent.click(await screen.findByRole('button', { name: 'New Location' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'pick-bengaluru' }));
    fireEvent.change(within(dialog).getByLabelText('Location image URL'), {
      target: { value: 'https://cdn.duncit.com/cities/blr.jpg' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Area' }));
    const [first, second] = within(dialog).getAllByLabelText('Locality / Area');
    fireEvent.change(first, { target: { value: 'Jayanagar' } });
    fireEvent.change(within(dialog).getAllByLabelText('PIN code')[0], { target: { value: '560011' } });
    expect(second).toHaveValue('');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(sent[0]).toMatchObject({
      input: {
        location_name: 'Bengaluru',
        state: 'Karnataka',
        location_pincode: '560011',
        location_zones: [{ zone_name: 'Jayanagar', pincode: '560011' }],
      },
    });
  });
});

describe('LocationsPage — deleting', () => {
  it('deletes a city once confirmed, and the toast goes away on Escape', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<LocationsPage />, {
      mocks: [tableMock([BENGALURU]), capture(DELETE_LOCATION, { deleteLocation: true }, sent)],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Bengaluru')).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog');
    expect(within(confirm).getByText('Delete location "Bengaluru"?')).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Deleted')).toBeInTheDocument();
    expect(sent).toEqual([{ id: 'loc-blr' }]);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Deleted')).not.toBeInTheDocument());
  });

  it('keeps the city when the confirmation is cancelled', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<LocationsPage />, {
      mocks: [tableMock([BENGALURU]), capture(DELETE_LOCATION, { deleteLocation: true }, sent)],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Bengaluru')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toEqual([]);
  });

  it('reports a delete the server refused', async () => {
    renderWithProviders(<LocationsPage />, {
      mocks: [
        tableMock([BENGALURU]),
        { request: { query: DELETE_LOCATION, variables: { id: 'loc-blr' } }, error: new Error('City still has clubs') },
      ],
    });
    await rowsShown(1);

    fireEvent.click(within(rowOf('Bengaluru')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('City still has clubs')).toBeInTheDocument();
  });
});
