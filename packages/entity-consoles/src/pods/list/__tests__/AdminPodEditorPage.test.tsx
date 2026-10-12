import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { renderWithProviders } from '../../../../__tests__/testkit';
import AdminPodEditorPage from '../pod-editor-page';

interface EditorArgs {
  config: Record<string, unknown>;
  editingPod: { id: string } | null;
  createDefaults: { club_id: string };
  submitCreate: (input: unknown) => Promise<unknown>;
  submitUpdate: (podDocId: string, input: unknown) => Promise<unknown>;
  onSaved: (meta: { draft: boolean }) => void;
}

const harness = vi.hoisted(() => ({
  editorArgs: null as EditorArgs | null,
  editorState: {
    initialValues: { pod_title: '' },
    busy: false,
    opError: null as string | null,
    editingPodDocId: null as string | null,
    submit: vi.fn(),
  },
  query: { data: null as unknown, loading: false, error: null as { message: string } | null },
  mutate: vi.fn(),
  productsFlag: false,
  picker: {
    pickerOpen: false,
    pickImage: vi.fn(),
    pickVideo: vi.fn(),
    settlePicker: vi.fn(),
    title: 'Pick a cover',
    accept: 'image/*',
    seedQuery: '',
  },
  aiFill: { onReady: vi.fn(), handleAiFill: vi.fn() },
  aiArgs: null as Record<string, unknown> | null,
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useQuery: () => harness.query,
    useMutation: (document: { definitions: { name?: { value: string } }[] }) => [
      (options: unknown) => harness.mutate(document.definitions[0].name?.value, options),
    ],
  };
});

vi.mock('@duncit/app-settings', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useFeatureFlag: () => harness.productsFlag };
});

vi.mock('@duncit/pod-form', () => ({
  makeNativeParityPodConfig: (opts: { showProducts: boolean }) => ({
    base: true,
    showProducts: opts.showProducts,
  }),
  useMediaPickerBridge: () => harness.picker,
  usePodEditorState: (args: EditorArgs) => {
    harness.editorArgs = args;
    return harness.editorState;
  },
  PodEditorPage: (props: {
    editing: boolean;
    eyebrow: string;
    backLabel: string;
    busy: boolean;
    error: string | null;
    config: Record<string, unknown>;
    clubs: unknown[];
    venues: unknown[];
    users: unknown[];
    products: unknown[];
    editingPodDocId: string | null;
    hideDraftOnEdit: boolean;
    getClubVenueIds: (club: unknown) => string[];
    onBack: () => void;
    onPickImage: () => void;
    onPickVideo: () => void;
    onReady: () => void;
    onSubmit: (values: unknown) => void;
    titleExtras: ReactNode;
  }) => (
    <div data-testid="pod-editor-page">
      <span data-testid="editing">{String(props.editing)}</span>
      <span data-testid="eyebrow">{props.eyebrow}</span>
      <span data-testid="back-label">{props.backLabel}</span>
      <span data-testid="busy">{String(props.busy)}</span>
      <span data-testid="error">{props.error ?? ''}</span>
      <span data-testid="config">{JSON.stringify(props.config)}</span>
      <span data-testid="club-count">{props.clubs.length}</span>
      <span data-testid="hide-draft">{String(props.hideDraftOnEdit)}</span>
      <span data-testid="doc-id">{props.editingPodDocId ?? ''}</span>
      <span data-testid="venue-ids">
        {JSON.stringify(props.getClubVenueIds({ matched_venues: [{ id: 'v1' }, { id: 'v2' }] }))}
      </span>
      <span data-testid="venue-ids-none">{JSON.stringify(props.getClubVenueIds(null))}</span>
      <button type="button" onClick={props.onBack}>
        editor-back
      </button>
      <button type="button" onClick={props.onPickImage}>
        editor-pick-image
      </button>
      <button type="button" onClick={props.onPickVideo}>
        editor-pick-video
      </button>
      <button type="button" onClick={props.onReady}>
        editor-ready
      </button>
      <button type="button" onClick={() => props.onSubmit({ pod_title: 'From editor' })}>
        editor-submit
      </button>
      {props.titleExtras}
    </div>
  ),
}));

vi.mock('@duncit/media-picker', () => ({
  default: (props: {
    open: boolean;
    folder: string;
    title: string;
    accept: string;
    seedQuery: string;
    onClose: () => void;
    onPicked: (url: string) => void;
  }) => (
    <div
      data-testid="media-picker"
      data-open={String(props.open)}
      data-folder={props.folder}
      data-title={props.title}
      data-accept={props.accept}
    >
      <button type="button" onClick={() => props.onPicked('https://cdn.test/p.jpg')}>
        picker-pick
      </button>
      <button type="button" onClick={props.onClose}>
        picker-close
      </button>
    </div>
  ),
}));

vi.mock('../usePodPageData', () => ({
  default: () => ({
    clubs: [{ id: 'club1' }, { id: 'club2' }],
    locations: [],
    approvedVenues: [{ id: 'venue1' }],
    approvedHosts: [{ user_id: 'u1' }],
    inventoryProducts: [],
    finance: { currency_symbol: '₹' },
  }),
}));

vi.mock('../pod-editor-page/usePodAiFill', () => ({
  default: (args: Record<string, unknown>) => {
    harness.aiArgs = args;
    return harness.aiFill;
  },
}));

vi.mock('../../../../src/shared/AiFillButton', () => ({
  default: (props: { entity: string; onFill: () => void }) => (
    <button type="button" onClick={props.onFill}>
      {`ai-fill-${props.entity}`}
    </button>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

const renderPage = (
  entry: string,
  props: { backTo?: string; backLabel?: string } = {},
  path = '/pods/new',
) =>
  renderWithProviders(<></>, {
    initialEntries: [entry],
    routes: (
      <>
        <Route
          path={path}
          element={
            <>
              <AdminPodEditorPage {...props} />
              <LocationProbe />
            </>
          }
        />
        <Route path="/pods/:id/edit" element={<AdminPodEditorPage {...props} />} />
        <Route path="*" element={<LocationProbe />} />
      </>
    ),
  });

beforeEach(() => {
  harness.editorArgs = null;
  harness.editorState = {
    initialValues: { pod_title: '' },
    busy: false,
    opError: null,
    editingPodDocId: null,
    submit: vi.fn(),
  };
  harness.query = { data: null, loading: false, error: null };
  harness.mutate.mockReset();
  harness.productsFlag = false;
  harness.picker = { ...harness.picker, pickerOpen: false, pickImage: vi.fn(), pickVideo: vi.fn(), settlePicker: vi.fn() };
  harness.aiFill = { onReady: vi.fn(), handleAiFill: vi.fn() };
});

describe('AdminPodEditorPage / new pod', () => {
  it('builds the admin config on the native-parity base and hands the editor its lookups', () => {
    renderPage('/pods/new');

    expect(JSON.parse(screen.getByTestId('config').textContent ?? '{}')).toEqual({
      base: true,
      showProducts: false,
      requireHosts: true,
      singleHost: true,
      showLocationZone: true,
      showInventory: true,
      showFinance: true,
      showIsActive: true,
    });
    expect(screen.getByTestId('editing')).toHaveTextContent('false');
    expect(screen.getByTestId('eyebrow')).toHaveTextContent('Admin · Pods');
    expect(screen.getByTestId('back-label')).toHaveTextContent('Back to pods');
    expect(screen.getByTestId('club-count')).toHaveTextContent('2');
    expect(screen.getByTestId('hide-draft')).toHaveTextContent('true');
  });

  it('shows products only when the products flag is on', () => {
    harness.productsFlag = true;
    renderPage('/pods/new');
    expect(JSON.parse(screen.getByTestId('config').textContent ?? '{}')).toMatchObject({
      showProducts: true,
    });
  });

  it('resolves a club’s venues from its matched list and none for no club', () => {
    renderPage('/pods/new');
    expect(screen.getByTestId('venue-ids')).toHaveTextContent('["v1","v2"]');
    expect(screen.getByTestId('venue-ids-none')).toHaveTextContent('[]');
  });

  it('starts a new pod in the club the list was filtered to', () => {
    renderPage('/pods/new?club_id=club2');
    expect(harness.editorArgs?.createDefaults).toEqual({ club_id: 'club2' });
  });

  it('forwards busy, a save error and submit to the editor state', () => {
    harness.editorState.busy = true;
    harness.editorState.opError = 'Slot already booked';
    renderPage('/pods/new');

    expect(screen.getByTestId('busy')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toHaveTextContent('Slot already booked');
    fireEvent.click(screen.getByText('editor-submit'));
    expect(harness.editorState.submit).toHaveBeenCalledWith({ pod_title: 'From editor' });
  });
});

describe('AdminPodEditorPage / navigation and saving', () => {
  it('goes back to the unfiltered pods list', () => {
    renderPage('/pods/new');
    fireEvent.click(screen.getByText('editor-back'));
    expect(screen.getByTestId('location')).toHaveTextContent('/pods');
  });

  it('carries the club filter back to the list on Back', () => {
    renderPage('/pods/new?club_id=club2');
    fireEvent.click(screen.getByText('editor-back'));
    expect(screen.getByTestId('location').textContent).toBe('/pods?club_id=club2');
  });

  it('goes back where the console that opened it says, with its own label', () => {
    renderPage('/pods/new', { backTo: '/clubs/club1', backLabel: 'Back to club' });
    expect(screen.getByTestId('back-label')).toHaveTextContent('Back to club');
    fireEvent.click(screen.getByText('editor-back'));
    expect(screen.getByTestId('location').textContent).toBe('/clubs/club1');
  });

  it('toasts and returns to the list after a save', async () => {
    renderPage('/pods/new');
    act(() => harness.editorArgs?.onSaved({ draft: false }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/pods'));
  });

  it('says a draft was saved as a draft', async () => {
    renderPage('/pods/new');
    act(() => harness.editorArgs?.onSaved({ draft: true }));
    expect(await screen.findByText('Draft saved')).toBeInTheDocument();
  });

  it('creates through the create mutation with the editor input', async () => {
    harness.mutate.mockResolvedValue({ data: { createPod: { id: 'new1' } } });
    renderPage('/pods/new');

    const result = await harness.editorArgs?.submitCreate({ pod_title: 'Trek' });

    expect(harness.mutate).toHaveBeenCalledWith('CreatePod', { variables: { input: { pod_title: 'Trek' } } });
    expect(result).toEqual({ data: { createPod: { id: 'new1' } } });
  });

  it('updates by document id through the update mutation', async () => {
    harness.mutate.mockResolvedValue({ data: { updatePod: { id: 'pod9' } } });
    renderPage('/pods/new');

    await harness.editorArgs?.submitUpdate('pod9', { pod_title: 'Trek 2' });

    expect(harness.mutate).toHaveBeenCalledWith('UpdatePod', {
      variables: { id: 'pod9', input: { pod_title: 'Trek 2' } },
    });
  });
});

describe('AdminPodEditorPage / editing an existing pod', () => {
  it('shows a spinner while the pod loads', () => {
    harness.query = { data: null, loading: true, error: null };
    renderPage('/pods/pod9/edit', {}, '/pods/:id/edit');

    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    expect(screen.queryByTestId('pod-editor-page')).not.toBeInTheDocument();
  });

  it('warns when the pod does not exist', () => {
    renderPage('/pods/missing/edit', {}, '/pods/:id/edit');
    expect(screen.getByText('Pod not found.')).toBeInTheDocument();
  });

  it('shows the query error instead of the editor', () => {
    harness.query = { data: null, loading: false, error: { message: 'Not allowed' } };
    renderPage('/pods/pod9/edit', {}, '/pods/:id/edit');
    expect(screen.getByText('Not allowed')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-editor-page')).not.toBeInTheDocument();
  });

  it('opens the loaded pod in edit mode', () => {
    harness.query = { data: { pod: { id: 'pod9' } }, loading: false, error: null };
    harness.editorState.editingPodDocId = 'pod9';
    renderPage('/pods/pod9/edit', {}, '/pods/:id/edit');

    expect(screen.getByTestId('editing')).toHaveTextContent('true');
    expect(screen.getByTestId('doc-id')).toHaveTextContent('pod9');
    expect(harness.editorArgs?.editingPod).toEqual({ id: 'pod9' });
  });
});

describe('AdminPodEditorPage / AI fill and media', () => {
  it('wires the AI fill with the page’s own lookups', () => {
    renderPage('/pods/new');

    expect(harness.aiArgs).toMatchObject({
      clubs: [{ id: 'club1' }, { id: 'club2' }],
      venues: [{ id: 'venue1' }],
      hosts: [{ user_id: 'u1' }],
    });
    fireEvent.click(screen.getByText('editor-ready'));
    expect(harness.aiFill.onReady).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('ai-fill-POD'));
    expect(harness.aiFill.handleAiFill).toHaveBeenCalledTimes(1);
  });

  it('routes the image and video pickers through the media bridge', () => {
    renderPage('/pods/new');
    fireEvent.click(screen.getByText('editor-pick-image'));
    fireEvent.click(screen.getByText('editor-pick-video'));
    expect(harness.picker.pickImage).toHaveBeenCalledTimes(1);
    expect(harness.picker.pickVideo).toHaveBeenCalledTimes(1);
  });

  it('opens the media dialog on the pods media folder and settles the bridge', () => {
    harness.picker.pickerOpen = true;
    renderPage('/pods/new');

    const dialog = screen.getByTestId('media-picker');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(dialog).toHaveAttribute('data-folder', '/pods/media');
    expect(dialog).toHaveAttribute('data-title', 'Pick a cover');
    expect(dialog).toHaveAttribute('data-accept', 'image/*');

    fireEvent.click(screen.getByText('picker-pick'));
    expect(harness.picker.settlePicker).toHaveBeenCalledWith('https://cdn.test/p.jpg');
    fireEvent.click(screen.getByText('picker-close'));
    expect(harness.picker.settlePicker).toHaveBeenCalledWith(null);
  });
});
