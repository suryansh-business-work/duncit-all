import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router-dom';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import { COMPLETE_POD_SETTLEMENT } from '../queries';
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
  nativeParityCalls: [] as unknown[],
  featureFlagKeys: [] as string[],
  productsFlag: true,
  tableRefetch: vi.fn(),
  editor: {
    open: false,
    editingPod: null as unknown,
    initialValues: { pod_title: '' },
    busy: false,
    opError: null as string | null,
    openCreate: vi.fn(),
    openEdit: vi.fn(),
    close: vi.fn(),
    submit: vi.fn(),
    remove: vi.fn(),
  },
  onChanged: null as null | ((message: string) => void),
  lastConfig: null as Record<string, unknown> | null,
  pickerOpen: false,
  pickImage: vi.fn(),
  pickVideo: vi.fn(),
  settlePicker: vi.fn(),
}));

vi.mock('@duncit/table', () => ({
  useApolloTableFetch: (_client: unknown, _document: unknown, rootField: string, options: unknown) => {
    harness.fetchCalls.push({ rootField, options });
    return async () => ({ rows: [], total: 0 });
  },
}));

vi.mock('@duncit/app-settings', () => ({
  useFeatureFlag: (key: string) => {
    harness.featureFlagKeys.push(key);
    // `auto_pods` off, so New Pod opens the ordinary editor without first asking
    // which kind — the chooser has its own coverage in @duncit/auto-pods.
    if (key === 'auto_pods') return false;
    return harness.productsFlag;
  },
  useTranslation: () => ({
    t: (key: string) => (key === 'shell.podKind.newPodCta' ? 'New Pod' : key),
  }),
}));

vi.mock('@duncit/pod-form', () => ({
  makeNativeParityPodConfig: (args: unknown) => {
    harness.nativeParityCalls.push(args);
    return { nativeParity: true };
  },
  useMediaPickerBridge: () => ({
    pickerOpen: harness.pickerOpen,
    pickImage: harness.pickImage,
    pickVideo: harness.pickVideo,
    settlePicker: harness.settlePicker,
    title: 'Pick a cover',
    accept: 'image/*',
  }),
}));

vi.mock('../usePodEditor', () => ({
  default: (args: { config: Record<string, unknown>; onChanged: (m: string) => void }) => {
    harness.lastConfig = args.config;
    harness.onChanged = args.onChanged;
    return harness.editor;
  },
}));

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
    toolbarActions: React.ReactNode;
    clubName: (id: string) => string;
    venueName: (id: string) => string;
    locName: (id: string) => string;
    onEdit: (p: unknown) => void;
    onQuickEdit: (p: unknown) => void;
    onDelete: (p: unknown) => void;
    onComplete: (p: unknown) => void;
    onView: (p: unknown) => void;
  }) => {
    props.refetchRef.current = harness.tableRefetch;
    return (
      <div data-testid="pods-table">
        <div data-testid="lookups">
          {props.clubName('club1')}|{props.venueName('venue1')}|{props.locName('loc1')}
        </div>
        {props.toolbarActions}
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
              venue_bill_amount: 1500,
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

vi.mock('../PodFormDialog', () => ({
  default: (props: {
    open: boolean;
    editing: boolean;
    config: Record<string, unknown>;
    clubs: unknown[];
    hosts: { user_id: string }[];
  }) => (
    <div
      data-testid="pod-form-dialog"
      data-open={String(props.open)}
      data-editing={String(props.editing)}
      data-config={JSON.stringify(props.config)}
      data-club-count={props.clubs.length}
      data-host-ids={props.hosts.map((h) => h.user_id).join(',')}
    />
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

vi.mock('../../../components/MediaPickerDialog', () => ({
  default: (props: { open: boolean; title: string; accept: string; onPicked: (u: string) => void }) => (
    <div data-testid="media-picker" data-open={String(props.open)} data-title={props.title} data-accept={props.accept}>
      <button type="button" onClick={() => props.onPicked('https://cdn.test/picked.jpg')}>
        picker-pick
      </button>
    </div>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="search">{location.search}</span>;
}

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
        <Route path="/pods/:id" element={<div>POD DETAIL ROUTE</div>} />
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
  harness.nativeParityCalls.length = 0;
  harness.featureFlagKeys.length = 0;
  harness.productsFlag = true;
  harness.editor.open = false;
  harness.editor.editingPod = null;
  harness.pickerOpen = false;
  harness.onChanged = null;
  harness.lastConfig = null;
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
      // Cancelled pods stay out of the list until the toggle asks for them.
      extraVariables: { include_deleted: false },
    });
  });

  it('asks the server for cancelled pods when "Include cancelled" is switched on', async () => {
    renderPage('/pods');
    fireEvent.click(screen.getByRole('checkbox', { name: /include cancelled/i }));
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

  it('reloads the grid when the club filter changes', async () => {
    renderPage('/pods');
    expect(harness.tableRefetch).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Club' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Alpha Club'));
    await waitFor(() => expect(harness.tableRefetch).toHaveBeenCalled());
  });
});

describe('PodsPage / pod form config', () => {
  it('builds the native-parity config with the products feature flag', () => {
    harness.productsFlag = true;
    renderPage();
    expect(harness.featureFlagKeys).toContain('is_product_visible');
    expect(harness.nativeParityCalls[0]).toEqual({ showProducts: true });
  });

  it('passes the flag through when products are switched off', () => {
    harness.productsFlag = false;
    renderPage();
    expect(harness.nativeParityCalls[0]).toEqual({ showProducts: false });
  });

  it('layers the admin-only capabilities on top of the native parity base', () => {
    renderPage();
    const config = JSON.parse(screen.getByTestId('pod-form-dialog').getAttribute('data-config') ?? '{}');
    expect(config).toEqual({
      nativeParity: true,
      requireHosts: true,
      singleHost: true,
      showLocationZone: true,
      showInventory: true,
      showFinance: true,
      showIsActive: true,
    });
  });

  it('feeds the host column with approved hosts, not the whole user directory', () => {
    renderPage();
    expect(screen.getByTestId('pod-form-dialog')).toHaveAttribute('data-host-ids', 'u1,u2');
    // The complete-pod dialog still labels historical hosts from the full directory.
    expect(screen.getByTestId('complete-user-count')).toHaveTextContent('1');
  });

  it('hands the same config to the editor hook that the dialog renders', () => {
    renderPage();
    expect(harness.lastConfig).toMatchObject({ requireHosts: true, showFinance: true });
  });

  it('mirrors the editor open/editing state onto the dialog', () => {
    harness.editor.open = true;
    harness.editor.editingPod = harness.pod;
    renderPage();
    const dialog = screen.getByTestId('pod-form-dialog');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(dialog).toHaveAttribute('data-editing', 'true');
    expect(dialog).toHaveAttribute('data-club-count', '2');
  });
});

describe('PodsPage / row actions', () => {
  it('opens the create dialog from the New Pod toolbar action', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /new pod/i }));
    expect(harness.editor.openCreate).toHaveBeenCalledTimes(1);
  });

  it('routes a row view to the pod detail page', () => {
    renderPage();
    fireEvent.click(screen.getByText('row-view'));
    expect(screen.getByText('POD DETAIL ROUTE')).toBeInTheDocument();
  });

  it('sends edit and delete straight to the editor hook', () => {
    renderPage();
    fireEvent.click(screen.getByText('row-edit'));
    fireEvent.click(screen.getByText('row-delete'));
    expect(harness.editor.openEdit).toHaveBeenCalledWith(harness.pod);
    expect(harness.editor.remove).toHaveBeenCalledWith(harness.pod);
  });

  it('passes the name lookups down to the grid columns', () => {
    renderPage();
    expect(screen.getByTestId('lookups')).toHaveTextContent('Club<club1>|Venue<venue1>|Loc<loc1>');
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
  it('shows the editor message and reloads the grid when a pod is saved', async () => {
    renderPage();
    act(() => harness.onChanged?.('Draft saved'));
    expect(await screen.findByText('Draft saved')).toBeInTheDocument();
    expect(harness.tableRefetch).toHaveBeenCalled();
  });

  it('shows no toast before anything happens', () => {
    renderPage();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('dismisses the toast on escape', async () => {
    renderPage();
    act(() => harness.onChanged?.('Deleted'));
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Deleted')).not.toBeInTheDocument());
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
      venue_bill_amount: 1500,
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
              settlement: { __typename: 'PodSettlement', currency_symbol: '₹' },
              releases: [
                {
                  __typename: 'Release',
                  id: 'r1',
                  release_id: 'DUN-REL-1',
                  kind: 'HOST',
                  status: 'APPROVED',
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
