import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import { flush, renderWithProviders } from '../../../../__tests__/testkit';
import { COMPLETE_POD_SETTLEMENT, DELETE } from '../queries';
import { buildCompleteInput } from '../complete-pod-dialog';
import PodsPage from '../PodsPage';

const harness = vi.hoisted(() => ({
  pod: {
    id: 'doc1',
    pod_id: 'DUN-POD-1',
    pod_title: 'Hackathon Night',
    club_id: 'club1',
    venue_id: 'venue1',
  },
  fetchCalls: [] as { rootField: string; options: unknown }[],
  lastPage: null as { rows: unknown[]; total: number } | null,
  tableRefetch: vi.fn(),
  pickerOpen: false,
  pickImage: vi.fn(),
  pickVideo: vi.fn(),
  settlePicker: vi.fn(),
}));

// The Hide / Show action is offered to a governor only — the page reads who is
// signed in to decide, and the harness mounts no UserProvider.
vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ user: { roles: ['SUPER_ADMIN'] } }),
}));

vi.mock('@duncit/table', () => ({
  useApolloTableFetch: (_client: unknown, _document: unknown, rootField: string, options: unknown) => {
    harness.fetchCalls.push({ rootField, options });
    return async () => ({ rows: [], total: 999 });
  },
}));

// `@duncit/dialogs`' ConfirmDialog imports `flattenCatalogue`/`SHELL_BUNDLE` from
// this module at load time, so it must stay a REAL module (via importOriginal)
// rather than a full replacement. `useTranslation` is left untouched too: with
// no LocaleProvider mounted in these tests it already falls back to the real
// shipped copy (e.g. "Club", "Include cancelled", "Saved"), which is what every
// text query below matches.
vi.mock('@duncit/app-settings', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    // `auto_pods` off, so New Pod opens the ordinary editor without first asking
    // which kind — the chooser has its own coverage in @duncit/auto-pods.
    useFeatureFlag: (key: string) => key !== 'auto_pods',
  };
});

vi.mock('@duncit/pod-form', () => ({
  useMediaPickerBridge: () => ({
    pickerOpen: harness.pickerOpen,
    pickImage: harness.pickImage,
    pickVideo: harness.pickVideo,
    settlePicker: harness.settlePicker,
    title: 'Pick a cover',
    accept: 'image/*',
  }),
}));

// The real select loads the category tree over GraphQL; one button standing in
// for "the author picked a Super Category" is all the page's scoping needs.
vi.mock('@duncit/category', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    AdminCategorySelect: (props: { onChange: (v: unknown) => void }) => (
      <button
        type="button"
        onClick={() => props.onChange({ super_id: 'super-none', category_id: '', sub_id: '' })}
      >
        pick-empty-super
      </button>
    ),
  };
});

vi.mock('../usePodPageData', () => ({
  default: () => ({
    clubs: [
      { id: 'club1', club_name: 'Alpha Club' },
      { id: 'club2', club_name: 'Beta Club' },
    ],
    locations: [],
    approvedVenues: [{ id: 'venue1', venue_name: 'Lotus Studio' }],
    inventoryProducts: [],
    users: [{ user_id: 'u1', full_name: 'Jane Doe' }],
    approvedHosts: [
      { user_id: 'u1', full_name: 'Jane Doe' },
      { user_id: 'u2', full_name: 'Raj Mehta' },
    ],
    finance: { currency_symbol: '₹' },
    clubName: (id: string) => `Club<${id}>`,
    locName: (id: string) => `Loc<${id}>`,
    venueName: (id: string) => `Venue<${id}>`,
  }),
}));

vi.mock('../PodsTable', () => ({
  default: (props: {
    refetchRef: { current: (() => void) | null };
    fetchRows: (query: unknown) => Promise<{ rows: unknown[]; total: number }>;
    toolbarActions: React.ReactNode;
    clubName: (id: string) => string;
    venueName: (id: string) => string;
    locName: (id: string) => string;
    onEdit: (p: unknown) => void;
    onQuickEdit: (p: unknown) => void;
    onDelete: (p: unknown) => void;
    onComplete: (p: unknown) => void;
    onMonitor: (p: unknown) => void;
    onView: (p: unknown) => void;
  }) => {
    props.refetchRef.current = harness.tableRefetch;
    return (
      <div data-testid="pods-table">
        <div data-testid="lookups">
          {props.clubName('club1')}|{props.venueName('venue1')}|{props.locName('loc1')}
        </div>
        {props.toolbarActions}
        <button
          type="button"
          onClick={() => {
            props.fetchRows({}).then((page) => {
              harness.lastPage = page;
            });
          }}
        >
          row-fetch
        </button>
        <button type="button" onClick={() => props.onView(harness.pod)}>
          row-view
        </button>
        <button type="button" onClick={() => props.onEdit(harness.pod)}>
          row-edit
        </button>
        <button type="button" onClick={() => props.onQuickEdit(harness.pod)}>
          row-quick-edit
        </button>
        <button type="button" onClick={() => props.onDelete(harness.pod)}>
          row-delete
        </button>
        <button type="button" onClick={() => props.onComplete(harness.pod)}>
          row-complete
        </button>
        <button type="button" onClick={() => props.onMonitor(harness.pod)}>
          row-monitor
        </button>
      </div>
    );
  },
}));

vi.mock('../complete-pod-dialog', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    default: (props: {
      open: boolean;
      pod: { pod_title?: string } | null;
      users: { user_id: string }[];
      onClose: () => void;
      onSubmit: (values: unknown) => void;
    }) => (
      <div data-testid="complete-dialog" data-open={String(props.open)}>
        <span data-testid="complete-pod-title">{props.pod?.pod_title ?? 'none'}</span>
        <span data-testid="complete-user-count">{props.users.length}</span>
        <button type="button" onClick={props.onClose}>
          complete-close
        </button>
        <button
          type="button"
          onClick={() =>
            props.onSubmit({
              host_user_id: 'u1',
              venue_bill_amount: '1500',
              venue_bill_media: 'https://cdn.test/bill.pdf',
              venue_extra_amount: '',
              venue_pax: '',
              overtime_hours: '',
              media_text: 'https://cdn.test/party.jpg',
              notes: '',
            })
          }
        >
          complete-submit
        </button>
      </div>
    ),
  };
});

vi.mock('../ReleaseSummaryDialog', () => ({
  default: (props: { summary: { currency_symbol: string } | null; onClose: () => void }) => (
    <div data-testid="release-summary" data-open={String(!!props.summary)}>
      <button type="button" onClick={props.onClose}>
        summary-close
      </button>
    </div>
  ),
}));

vi.mock('../QuickEditPodDialog', () => ({
  default: (props: { pod: { pod_title?: string } | null; onClose: () => void; onSaved: () => void }) => (
    <div data-testid="quick-edit" data-open={String(!!props.pod)}>
      <span data-testid="quick-edit-title">{props.pod?.pod_title ?? 'none'}</span>
      <button type="button" onClick={props.onClose}>
        quick-close
      </button>
      <button type="button" onClick={props.onSaved}>
        quick-saved
      </button>
    </div>
  ),
}));

// PodsPage renders the picker from `@duncit/media-picker`. The rest of that
// module stays real: the complete-pod dialog (kept real via importOriginal
// above) imports `MediaListField` from it at load time.
vi.mock('@duncit/media-picker', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    default: (props: {
      open: boolean;
      title: string;
      accept: string;
      onClose: () => void;
      onPicked: (u: string) => void;
    }) => (
      <div data-testid="media-picker" data-open={String(props.open)} data-title={props.title} data-accept={props.accept}>
        <button type="button" onClick={() => props.onPicked('https://cdn.test/picked.jpg')}>
          picker-pick
        </button>
        <button type="button" onClick={props.onClose}>
          picker-close
        </button>
      </div>
    ),
  };
});

function LocationProbe() {
  const location = useLocation();
  return (
    <>
      <span data-testid="search">{location.search}</span>
      <span data-testid="pathname">{location.pathname}</span>
    </>
  );
}

// The create/edit flows now navigate to the real admin routes (`/pods/new`,
// `/pods/:id/edit`) instead of opening an in-page dialog, so every route the
// page can send the browser to is registered here — each paired with the probe
// so a test can assert exactly where it landed.
const renderPage = (entry = '/pods') =>
  renderWithProviders(<></>, {
    initialEntries: [entry],
    routes: (
      <>
        <Route
          path="/pods"
          element={
            <>
              <PodsPage />
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/pods/:id"
          element={
            <>
              <div>POD DETAIL ROUTE</div>
              <LocationProbe />
            </>
          }
        />
        <Route path="/pods/new" element={<LocationProbe />} />
        <Route path="/pods/:id/edit" element={<LocationProbe />} />
      </>
    ),
  });

const renderPageWithMocks = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/pods'],
    routes: <Route path="/pods" element={<PodsPage />} />,
  });

beforeEach(() => {
  harness.fetchCalls.length = 0;
  harness.pickerOpen = false;
  vi.clearAllMocks();
});

describe('PodsPage / club filter', () => {
  it('fetches without an extra filter when no club is selected', () => {
    renderPage('/pods');
    expect(harness.fetchCalls[0].rootField).toBe('podsTable');
    expect((harness.fetchCalls[0].options as { extraFilters?: unknown }).extraFilters).toBeUndefined();
  });

  it('turns the ?club_id deep-link into a server-side club filter', () => {
    renderPage('/pods?club_id=club2');
    expect(harness.fetchCalls[0].options).toEqual({
      extraFilters: [{ field: 'club_id', op: 'eq', value: 'club2' }],
      // Cancelled pods stay out of the list until the toggle asks for them, and
      // no lifecycle stage is picked until the status select is touched.
      extraVariables: { include_deleted: false, lifecycle: null },
    });
  });

  it('asks the server for cancelled pods when "Include cancelled" is switched on', async () => {
    renderPage('/pods');
    fireEvent.click(screen.getByRole('switch', { name: /include cancelled/i }));
    await waitFor(() =>
      expect(
        (harness.fetchCalls.at(-1)?.options as { extraVariables?: { include_deleted?: boolean } })
          .extraVariables?.include_deleted,
      ).toBe(true),
    );
  });

  it('preselects the club from the URL in the toolbar', () => {
    renderPage('/pods?club_id=club2');
    expect(screen.getByRole('combobox', { name: 'Club' })).toHaveTextContent('Beta Club');
  });

  it('writes the chosen club back into the URL', async () => {
    renderPage('/pods');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Club' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Alpha Club'));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('club_id=club1'));
  });

  it('clears the URL filter when "All clubs" is chosen again', async () => {
    renderPage('/pods?club_id=club1');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Club' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('All clubs'));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(''));
    expect(screen.getByTestId('search').textContent).toBe('');
  });

  it('asks the server for one lifecycle stage and reloads when the status select changes', async () => {
    renderPage('/pods');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Upcoming'));
    await waitFor(() =>
      expect(
        (harness.fetchCalls.at(-1)?.options as { extraVariables?: { lifecycle?: string | null } })
          .extraVariables?.lifecycle,
      ).toBe('UPCOMING'),
    );
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Upcoming');
    await waitFor(() => expect(harness.tableRefetch).toHaveBeenCalled());
  });

  it('switches "Include cancelled" on by itself when the status select asks for Cancelled', async () => {
    renderPage('/pods');
    expect(screen.getByRole('switch', { name: /include cancelled/i })).not.toBeChecked();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Cancelled'));
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: /include cancelled/i })).toBeChecked(),
    );
    expect(
      (harness.fetchCalls.at(-1)?.options as { extraVariables?: { lifecycle?: string | null } })
        .extraVariables?.lifecycle,
    ).toBe('CANCELLED');
  });

  it('opens already filtered when the link carries ?lifecycle= (the brief tiles)', () => {
    renderPage('/pods?lifecycle=UPCOMING');
    expect(harness.fetchCalls[0].options).toEqual({
      extraVariables: { include_deleted: false, lifecycle: 'UPCOMING' },
    });
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Upcoming');
  });

  it('ignores a ?lifecycle= value the status select does not offer', () => {
    renderPage('/pods?lifecycle=SOMEDAY');
    expect(
      (harness.fetchCalls[0].options as { extraVariables?: { lifecycle?: string | null } })
        .extraVariables?.lifecycle,
    ).toBeNull();
  });

  it('switches "Include cancelled" on when the link asks for the cancelled bucket', () => {
    renderPage('/pods?lifecycle=CANCELLED');
    expect(screen.getByRole('switch', { name: /include cancelled/i })).toBeChecked();
    expect(harness.fetchCalls[0].options).toEqual({
      extraVariables: { include_deleted: true, lifecycle: 'CANCELLED' },
    });
  });

  it('writes the chosen stage into the URL without dropping the club', async () => {
    renderPage('/pods?club_id=club1');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Completed'));
    await waitFor(() =>
      expect(screen.getByTestId('search')).toHaveTextContent('?club_id=club1&lifecycle=COMPLETED'),
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('All Pods'));
    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe('?club_id=club1'));
  });

  it('answers a category with no clubs with an empty page instead of asking the server', async () => {
    renderPage('/pods');
    const before = harness.fetchCalls.length;
    expect(
      (harness.fetchCalls[before - 1].options as { extraFilters?: unknown }).extraFilters,
    ).toBeUndefined();
    fireEvent.click(screen.getByText('pick-empty-super'));
    await waitFor(() =>
      expect(
        (harness.fetchCalls.at(-1)?.options as { extraFilters?: unknown }).extraFilters,
      ).toEqual([{ field: 'club_id', op: 'in', values: [] }]),
    );
    // The page hands the table its own empty answer, not the Apollo fetcher.
    await waitFor(() => expect(harness.tableRefetch).toHaveBeenCalled());
    fireEvent.click(screen.getByText('row-fetch'));
    await waitFor(() => expect(harness.lastPage).toEqual({ rows: [], total: 0 }));
  });

  it('reloads the grid when the club filter changes', async () => {
    renderPage('/pods');
    expect(harness.tableRefetch).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Club' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Alpha Club'));
    await waitFor(() => expect(harness.tableRefetch).toHaveBeenCalled());
  });
});

describe('PodsPage / row actions', () => {
  // Create and edit are their own routed pages now (`/pods/new`,
  // `/pods/:id/edit`) rather than a dialog PodsPage owns — see
  // `pod-editor-page/index.tsx`. These assert the navigation the toolbar and
  // the grid rows wire up to.
  it('navigates to the new-pod route from the New Pod toolbar action', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /new pod/i }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/pods/new');
  });

  it('routes a row view to the pod detail page', () => {
    renderPage();
    fireEvent.click(screen.getByText('row-view'));
    expect(screen.getByText('POD DETAIL ROUTE')).toBeInTheDocument();
  });

  it("routes a row edit to the pod's edit page", () => {
    renderPage();
    fireEvent.click(screen.getByText('row-edit'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/pods/doc1/edit');
  });

  it('passes the name lookups down to the grid columns', () => {
    renderPage();
    expect(screen.getByTestId('lookups')).toHaveTextContent('Club<club1>|Venue<venue1>|Loc<loc1>');
  });

  it('carries the club filter into the new-pod route', () => {
    renderPage('/pods?club_id=club2');
    fireEvent.click(screen.getByRole('button', { name: /new pod/i }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/pods/new');
    expect(screen.getByTestId('search')).toHaveTextContent('?club_id=club2');
  });

  it('carries the club filter into the edit route', () => {
    renderPage('/pods?club_id=club2');
    fireEvent.click(screen.getByText('row-edit'));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/pods/doc1/edit');
    expect(screen.getByTestId('search')).toHaveTextContent('?club_id=club2');
  });

  it('redirects a legacy ?edit= bookmark to the pod edit page', () => {
    renderPage('/pods?edit=doc9');
    expect(screen.getByTestId('pathname')).toHaveTextContent('/pods/doc9/edit');
    expect(screen.queryByTestId('pods-table')).not.toBeInTheDocument();
  });
});

describe('PodsPage / AI monitoring trail', () => {
  it("opens the pod's activity dialog from the row and closes it again", async () => {
    renderPageWithMocks([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('row-monitor'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Hackathon Night');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('PodsPage / delete a pod', () => {
  it('asks for confirmation naming the pod before deleting', async () => {
    renderPageWithMocks([]);
    fireEvent.click(screen.getByText('row-delete'));
    expect(await screen.findByText('Delete pod "Hackathon Night"?')).toBeInTheDocument();
  });

  it('deletes nothing when the confirmation is dismissed', async () => {
    renderPageWithMocks([]);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Delete pod "Hackathon Night"?')).not.toBeInTheDocument(),
    );
    expect(harness.tableRefetch).not.toHaveBeenCalled();
  });

  it('deletes the pod, toasts and reloads the grid once confirmed', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: DELETE, variables: { id: 'doc1' } },
        result: { data: { deletePod: true } },
      },
    ];
    renderPageWithMocks(mocks);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Deleted')).toBeInTheDocument();
    await waitFor(() => expect(harness.tableRefetch).toHaveBeenCalled());
  });

  it('reports the server error and keeps the grid as it was when the delete fails', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: DELETE, variables: { id: 'doc1' } },
        error: new Error('Pod has confirmed bookings'),
      },
    ];
    renderPageWithMocks(mocks);
    fireEvent.click(screen.getByText('row-delete'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Pod has confirmed bookings')).toBeInTheDocument();
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
    expect(harness.tableRefetch).not.toHaveBeenCalled();
  });
});

describe('PodsPage / quick edit', () => {
  it('opens the quick-edit dialog with the clicked pod and closes it again', () => {
    renderPage();
    expect(screen.getByTestId('quick-edit')).toHaveAttribute('data-open', 'false');
    fireEvent.click(screen.getByText('row-quick-edit'));
    expect(screen.getByTestId('quick-edit')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('quick-edit-title')).toHaveTextContent('Hackathon Night');
    fireEvent.click(screen.getByText('quick-close'));
    expect(screen.getByTestId('quick-edit')).toHaveAttribute('data-open', 'false');
  });

  it('closes, toasts and reloads the grid after a quick-edit save', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-quick-edit'));
    fireEvent.click(screen.getByText('quick-saved'));
    expect(screen.getByTestId('quick-edit')).toHaveAttribute('data-open', 'false');
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(harness.tableRefetch).toHaveBeenCalled();
  });
});

describe('PodsPage / toasts', () => {
  it('shows no toast before anything happens', () => {
    renderPage();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('dismisses the toast on escape', async () => {
    renderPage();
    fireEvent.click(screen.getByText('row-quick-edit'));
    fireEvent.click(screen.getByText('quick-saved'));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Saved')).not.toBeInTheDocument());
  });
});

describe('PodsPage / media picker', () => {
  it('keeps the picker closed until the bridge opens it', () => {
    renderPage();
    expect(screen.getByTestId('media-picker')).toHaveAttribute('data-open', 'false');
  });

  it('renders the picker with the bridge title and accept filter when open', () => {
    harness.pickerOpen = true;
    renderPage();
    const picker = screen.getByTestId('media-picker');
    expect(picker).toHaveAttribute('data-open', 'true');
    expect(picker).toHaveAttribute('data-title', 'Pick a cover');
    expect(picker).toHaveAttribute('data-accept', 'image/*');
  });

  it('settles the bridge promise with the picked url', () => {
    harness.pickerOpen = true;
    renderPage();
    fireEvent.click(screen.getByText('picker-pick'));
    expect(harness.settlePicker).toHaveBeenCalledWith('https://cdn.test/picked.jpg');
  });

  it('settles the bridge promise with nothing when the picker is dismissed', () => {
    harness.pickerOpen = true;
    renderPage();
    fireEvent.click(screen.getByText('picker-close'));
    expect(harness.settlePicker).toHaveBeenCalledWith(null);
  });
});

describe('PodsPage / complete a pod', () => {
  it('opens the complete dialog with the pod and the user list', () => {
    renderPage();
    expect(screen.getByTestId('complete-dialog')).toHaveAttribute('data-open', 'false');
    fireEvent.click(screen.getByText('row-complete'));
    expect(screen.getByTestId('complete-dialog')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('complete-pod-title')).toHaveTextContent('Hackathon Night');
    expect(screen.getByTestId('complete-user-count')).toHaveTextContent('1');
  });

  it('closes the complete dialog without submitting', () => {
    renderPage();
    fireEvent.click(screen.getByText('row-complete'));
    fireEvent.click(screen.getByText('complete-close'));
    expect(screen.getByTestId('complete-dialog')).toHaveAttribute('data-open', 'false');
  });

  it('submits the settlement, toasts, shows the release summary and reloads', async () => {
    const values = {
      host_user_id: 'u1',
      venue_bill_amount: '1500',
      venue_bill_media: 'https://cdn.test/bill.pdf',
      venue_extra_amount: '',
      venue_pax: '',
      overtime_hours: '',
      media_text: 'https://cdn.test/party.jpg',
      notes: '',
    };
    const mocks: MockedResponse[] = [
      {
        request: {
          query: COMPLETE_POD_SETTLEMENT,
          variables: { input: buildCompleteInput(values, 'doc1') },
        },
        result: {
          data: {
            completePodSettlement: {
              __typename: 'CompletePodResult',
              settlement: { __typename: 'PodSettlement', is_free: false, currency_symbol: '₹' },
              releases: [
                {
                  __typename: 'Release',
                  id: 'r1',
                  release_id: 'DUN-REL-1',
                  kind: 'HOST',
                  // Nothing is credited at completion — the release waits on Finance.
                  status: 'PENDING',
                  amount_requested: 454.58,
                },
              ],
            },
          },
        },
      },
    ];
    renderPageWithMocks(mocks);
    fireEvent.click(screen.getByText('row-complete'));
    fireEvent.click(screen.getByText('complete-submit'));

    expect(await screen.findByText('Pod completion submitted for approval')).toBeInTheDocument();
    expect(screen.getByTestId('complete-dialog')).toHaveAttribute('data-open', 'false');
    expect(screen.getByTestId('release-summary')).toHaveAttribute('data-open', 'true');
    await waitFor(() => expect(harness.tableRefetch).toHaveBeenCalled());

    fireEvent.click(screen.getByText('summary-close'));
    expect(screen.getByTestId('release-summary')).toHaveAttribute('data-open', 'false');
  });

  // A free pod asks Finance for nothing: no payout summary, no "for approval".
  const freeResult = (releases: unknown[]): MockedResponse[] => [
    {
      request: { query: COMPLETE_POD_SETTLEMENT, variables: () => true },
      result: {
        data: {
          completePodSettlement: {
            __typename: 'CompletePodResult',
            settlement: { __typename: 'PodSettlement', is_free: true, currency_symbol: '₹' },
            releases,
          },
        },
      },
    },
  ];

  it('completes a free pod with no release summary and no approval wording', async () => {
    renderPageWithMocks(freeResult([]));
    fireEvent.click(screen.getByText('row-complete'));
    fireEvent.click(screen.getByText('complete-submit'));

    expect(await screen.findByText('Pod completed.')).toBeInTheDocument();
    expect(screen.queryByText('Pod completion submitted for approval')).not.toBeInTheDocument();
    expect(screen.getByTestId('release-summary')).toHaveAttribute('data-open', 'false');
  });

  // Product sellers on a free pod are still owed their own sales.
  it('still lists the seller releases a free pod raised', async () => {
    renderPageWithMocks(
      freeResult([
        {
          __typename: 'Release',
          id: 'r9',
          release_id: 'DUN-REL-9',
          kind: 'ECOMM_PAYMENT',
          status: 'PENDING',
          amount_requested: 250,
        },
      ]),
    );
    fireEvent.click(screen.getByText('row-complete'));
    fireEvent.click(screen.getByText('complete-submit'));

    expect(await screen.findByText('Pod completed.')).toBeInTheDocument();
    expect(screen.getByTestId('release-summary')).toHaveAttribute('data-open', 'true');
  });

  it('ignores a submit when no pod was opened for completion', async () => {
    let requested = false;
    const mocks: MockedResponse[] = [
      {
        request: {
          query: COMPLETE_POD_SETTLEMENT,
          variables: () => {
            requested = true;
            return true;
          },
        },
        result: { data: { completePodSettlement: null } },
      },
    ];
    renderPageWithMocks(mocks);
    fireEvent.click(screen.getByText('complete-submit'));
    await flush();

    expect(requested).toBe(false);
    expect(screen.queryByText('Pod completion submitted for approval')).not.toBeInTheDocument();
  });

  it('toasts without a release summary when the server returns no settlement result', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: COMPLETE_POD_SETTLEMENT, variables: () => true },
        result: { data: { completePodSettlement: null } },
      },
    ];
    renderPageWithMocks(mocks);
    fireEvent.click(screen.getByText('row-complete'));
    fireEvent.click(screen.getByText('complete-submit'));

    expect(await screen.findByText('Pod completion submitted for approval')).toBeInTheDocument();
    expect(screen.getByTestId('complete-dialog')).toHaveAttribute('data-open', 'false');
    expect(screen.getByTestId('release-summary')).toHaveAttribute('data-open', 'false');
  });

  it('keeps the dialog open and shows no toast when the settlement fails', async () => {
    renderPageWithMocks([]);
    fireEvent.click(screen.getByText('row-complete'));
    fireEvent.click(screen.getByText('complete-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('complete-dialog')).toHaveAttribute('data-open', 'true'),
    );
    expect(screen.queryByText('Pod completion submitted for approval')).not.toBeInTheDocument();
    expect(screen.getByTestId('release-summary')).toHaveAttribute('data-open', 'false');
  });
});
