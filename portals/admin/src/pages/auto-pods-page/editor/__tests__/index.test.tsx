import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { FINANCE_FOR_PODS } from '../../../pods-page/queries';
import { AUTO_POD_FOR_EDIT, CREATE_AUTO_POD, UPDATE_AUTO_POD } from '../../queries';
import AdminAutoPodEditorPage from '../index';

interface FakeEditorArgs {
  editingAutoPod: { id: string; host_claim?: unknown; club_claim?: unknown } | null;
  submitCreate: (input: unknown) => Promise<unknown>;
  submitUpdate: (id: string, input: unknown) => Promise<unknown>;
  onSaved: (meta: { created: boolean }) => void;
}

const harness = vi.hoisted(() => ({
  editorArgs: null as FakeEditorArgs | null,
  editorState: {
    initialValues: { pod_title: '' },
    busy: false,
    opError: null as string | null,
    submit: vi.fn(),
  },
  picker: {
    pickerOpen: false,
    pickImage: vi.fn(),
    pickVideo: vi.fn(),
    settlePicker: vi.fn(),
    title: 'Pick a cover',
    accept: 'image/*',
  },
}));

vi.mock('@duncit/pod-form', () => ({
  makeNativeParityPodConfig: (opts: { showProducts: boolean }) => ({
    __base: true,
    showProducts: opts.showProducts,
  }),
  useMediaPickerBridge: () => harness.picker,
  useAutoPodEditorState: (args: FakeEditorArgs) => {
    harness.editorArgs = args;
    return harness.editorState;
  },
  PodEditorPage: (props: {
    editing: boolean;
    title: string;
    eyebrow: string;
    backLabel: string;
    intro: ReactNode;
    busy: boolean;
    error: string | null;
    config: Record<string, unknown>;
    finance: unknown;
    getClubVenueIds: () => string[];
    onBack: () => void;
    onPickImage: () => void;
    onPickVideo: () => void;
    onSubmit: (values: unknown) => void;
  }) => (
    <div data-testid="pod-editor-page">
      {props.intro}
      <span data-testid="editing">{String(props.editing)}</span>
      <span data-testid="title">{props.title}</span>
      <span data-testid="eyebrow">{props.eyebrow}</span>
      <span data-testid="back-label">{props.backLabel}</span>
      <span data-testid="busy">{String(props.busy)}</span>
      <span data-testid="error">{props.error ?? ''}</span>
      <span data-testid="config">{JSON.stringify(props.config)}</span>
      <span data-testid="finance">{JSON.stringify(props.finance ?? null)}</span>
      <span data-testid="club-venue-ids">{JSON.stringify(props.getClubVenueIds())}</span>
      <button type="button" onClick={props.onBack}>
        editor-back
      </button>
      <button type="button" onClick={props.onPickImage}>
        editor-pick-image
      </button>
      <button type="button" onClick={props.onPickVideo}>
        editor-pick-video
      </button>
      <button type="button" onClick={() => props.onSubmit({ pod_title: 'From editor' })}>
        editor-submit
      </button>
    </div>
  ),
}));

vi.mock('../../../../components/MediaPickerDialog', () => ({
  default: (props: {
    open: boolean;
    title: string;
    accept: string;
    folder: string;
    onClose: () => void;
    onPicked: (url: string) => void;
  }) => (
    <div
      data-testid="media-picker"
      data-open={String(props.open)}
      data-title={props.title}
      data-accept={props.accept}
      data-folder={props.folder}
    >
      <button type="button" onClick={() => props.onPicked('https://cdn.test/picked.jpg')}>
        picker-pick
      </button>
      <button type="button" onClick={props.onClose}>
        picker-close
      </button>
    </div>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="pathname">{location.pathname}</span>;
}

/** A full `AUTO_POD_FOR_EDIT` row — every field the query selects, so Apollo's
 * cache write never warns about a field the mock left out. */
const makeEditRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'AutoPod',
  id: 'ap1',
  stage: 'OPEN',
  pod_title: 'Weekend Trek',
  pod_description: '',
  pod_info: '',
  pod_hashtag: [],
  pod_images_and_videos: [],
  reel_url: null,
  super_category_id: 'sc1',
  sub_category_id: 'sub1',
  pod_amount: 0,
  no_of_spots: 1,
  pod_occurrence: 'ONE_TIME',
  what_this_pod_offers: [],
  available_perks: [],
  payment_terms: null,
  place_charges: [],
  host_claim: null,
  club_claim: null,
  location: null,
  ...over,
});

const financeMock: MockedResponse = {
  request: { query: FINANCE_FOR_PODS },
  result: {
    data: {
      publicFinanceSettings: {
        __typename: 'PublicFinanceSettings',
        platform_fee_pct: 5,
        gst_pct: 18,
        currency_symbol: '₹',
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const renderPage = (entry: string, extraMocks: MockedResponse[] = []) =>
  renderWithProviders(<></>, {
    mocks: [financeMock, ...extraMocks],
    initialEntries: [entry],
    routes: (
      <>
        <Route
          path="/auto-pods/new"
          element={
            <>
              <AdminAutoPodEditorPage />
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/auto-pods/:id/edit"
          element={
            <>
              <AdminAutoPodEditorPage />
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/auto-pods"
          element={
            <>
              <div>AUTO PODS LIST ROUTE</div>
              <LocationProbe />
            </>
          }
        />
      </>
    ),
  });

beforeEach(() => {
  harness.editorArgs = null;
  harness.editorState = { initialValues: { pod_title: '' }, busy: false, opError: null, submit: vi.fn() };
  harness.picker = {
    pickerOpen: false,
    pickImage: vi.fn(),
    pickVideo: vi.fn(),
    settlePicker: vi.fn(),
    title: 'Pick a cover',
    accept: 'image/*',
  };
});

describe('AdminAutoPodEditorPage / new offer', () => {
  it('renders immediately with the "new" title, eyebrow and an unlocked category', async () => {
    renderPage('/auto-pods/new');
    expect(screen.getByTestId('title')).toHaveTextContent('New Auto Pod');
    expect(screen.getByTestId('eyebrow')).toHaveTextContent('Admin · Auto Pods');
    expect(screen.getByTestId('back-label')).toHaveTextContent('Back to Auto Pods');
    expect(screen.getByTestId('editing')).toHaveTextContent('false');
    expect(JSON.parse(screen.getByTestId('config').textContent ?? '{}')).toMatchObject({
      autoPod: true,
      lockCategory: false,
      showHosts: false,
      showVenueSlot: false,
      showPlaceCharges: true,
      showReel: true,
      showFinance: true,
    });
    expect(
      screen.getByText(
        'You do not pick a venue, a host or a club — the first of each to enrol takes it, in any order. The first to enrol also sets the city.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('finance').textContent ?? 'null')).toMatchObject({
        currency_symbol: '₹',
      }),
    );
  });

  it("getClubVenueIds always answers empty — an Auto Pod has no club to narrow venues by", () => {
    renderPage('/auto-pods/new');
    expect(screen.getByTestId('club-venue-ids')).toHaveTextContent('[]');
  });

  it('navigates back to the list from the back action', () => {
    renderPage('/auto-pods/new');
    fireEvent.click(screen.getByText('editor-back'));
    expect(screen.getByText('AUTO PODS LIST ROUTE')).toBeInTheDocument();
  });

  it('routes the image and video pickers through the media bridge', () => {
    renderPage('/auto-pods/new');
    fireEvent.click(screen.getByText('editor-pick-image'));
    fireEvent.click(screen.getByText('editor-pick-video'));
    expect(harness.picker.pickImage).toHaveBeenCalledTimes(1);
    expect(harness.picker.pickVideo).toHaveBeenCalledTimes(1);
  });

  it('opens the media picker dialog with the bridge title/accept and the auto-pods folder', () => {
    harness.picker.pickerOpen = true;
    renderPage('/auto-pods/new');
    const dialog = screen.getByTestId('media-picker');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(dialog).toHaveAttribute('data-title', 'Pick a cover');
    expect(dialog).toHaveAttribute('data-accept', 'image/*');
    expect(dialog).toHaveAttribute('data-folder', '/auto-pods');
  });

  it('settles the picker bridge with the picked url', () => {
    harness.picker.pickerOpen = true;
    renderPage('/auto-pods/new');
    fireEvent.click(screen.getByText('picker-pick'));
    expect(harness.picker.settlePicker).toHaveBeenCalledWith('https://cdn.test/picked.jpg');
  });

  it('settles the picker bridge with null when the dialog is closed without picking', () => {
    harness.picker.pickerOpen = true;
    renderPage('/auto-pods/new');
    fireEvent.click(screen.getByText('picker-close'));
    expect(harness.picker.settlePicker).toHaveBeenCalledWith(null);
  });

  it('forwards submit to the editor state', () => {
    renderPage('/auto-pods/new');
    fireEvent.click(screen.getByText('editor-submit'));
    expect(harness.editorState.submit).toHaveBeenCalledWith({ pod_title: 'From editor' });
  });

  it('passes busy through to the form', () => {
    harness.editorState.busy = true;
    renderPage('/auto-pods/new');
    expect(screen.getByTestId('busy')).toHaveTextContent('true');
  });

  it('shows no error text until the editor state reports one', () => {
    renderPage('/auto-pods/new');
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('formats a save failure with the reason the server gave', () => {
    harness.editorState.opError = 'Contains a banned word';
    renderPage('/auto-pods/new');
    expect(screen.getByTestId('error')).toHaveTextContent('Could not save: Contains a banned word');
  });
});

describe('AdminAutoPodEditorPage / query guard', () => {
  it('shows a spinner while the existing offer is loading', () => {
    const mock: MockedResponse = {
      request: { query: AUTO_POD_FOR_EDIT, variables: { auto_pod_doc_id: 'ap1' } },
      delay: 50,
      result: { data: { autoPod: null } },
    };
    renderPage('/auto-pods/ap1/edit', [mock]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-editor-page')).not.toBeInTheDocument();
  });

  it('shows the not-found alert once the offer resolves to nothing', async () => {
    const mock: MockedResponse = {
      request: { query: AUTO_POD_FOR_EDIT, variables: { auto_pod_doc_id: 'missing' } },
      result: { data: { autoPod: null } },
    };
    renderPage('/auto-pods/missing/edit', [mock]);
    expect(await screen.findByText('Not found.')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-editor-page')).not.toBeInTheDocument();
  });

  it("shows the query's own error message when the fetch fails", async () => {
    const mock: MockedResponse = {
      request: { query: AUTO_POD_FOR_EDIT, variables: { auto_pod_doc_id: 'ap1' } },
      result: { errors: [new GraphQLError('Not allowed')] },
    };
    renderPage('/auto-pods/ap1/edit', [mock]);
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
    expect(screen.queryByTestId('pod-editor-page')).not.toBeInTheDocument();
  });
});

describe('AdminAutoPodEditorPage / editing an existing offer', () => {
  it('shows the "edit" title/eyebrow and leaves the category unlocked with no enrolments yet', async () => {
    const mock: MockedResponse = {
      request: { query: AUTO_POD_FOR_EDIT, variables: { auto_pod_doc_id: 'ap1' } },
      result: { data: { autoPod: makeEditRow({ id: 'ap1' }) } },
    };
    renderPage('/auto-pods/ap1/edit', [mock]);
    expect(await screen.findByTestId('pod-editor-page')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('Edit Auto Pod');
    expect(screen.getByTestId('editing')).toHaveTextContent('true');
    expect(JSON.parse(screen.getByTestId('config').textContent ?? '{}')).toMatchObject({
      lockCategory: false,
    });
  });

  it('locks the category once a host has enrolled', async () => {
    const mock: MockedResponse = {
      request: { query: AUTO_POD_FOR_EDIT, variables: { auto_pod_doc_id: 'ap2' } },
      result: {
        data: {
          autoPod: makeEditRow({
            id: 'ap2',
            stage: 'CLAIMING',
            host_claim: { __typename: 'AutoPodHostClaimBrief', user_id: 'u1' },
          }),
        },
      },
    };
    renderPage('/auto-pods/ap2/edit', [mock]);
    await screen.findByTestId('pod-editor-page');
    expect(JSON.parse(screen.getByTestId('config').textContent ?? '{}')).toMatchObject({
      lockCategory: true,
    });
  });

  it('locks the category once a club admin has enrolled', async () => {
    const mock: MockedResponse = {
      request: { query: AUTO_POD_FOR_EDIT, variables: { auto_pod_doc_id: 'ap3' } },
      result: {
        data: {
          autoPod: makeEditRow({
            id: 'ap3',
            stage: 'CLAIMING',
            club_claim: { __typename: 'AutoPodClubClaimBrief', club_id: 'c1' },
          }),
        },
      },
    };
    renderPage('/auto-pods/ap3/edit', [mock]);
    await screen.findByTestId('pod-editor-page');
    expect(JSON.parse(screen.getByTestId('config').textContent ?? '{}')).toMatchObject({
      lockCategory: true,
    });
  });
});

describe('AdminAutoPodEditorPage / submit pipeline', () => {
  it('creates through the create mutation and announces the any-order opening', async () => {
    let sentVariables: unknown;
    const createMock: MockedResponse = {
      request: { query: CREATE_AUTO_POD, variables: (variables) => {
        sentVariables = variables;
        return true;
      } },
      result: {
        data: {
          createAutoPod: {
            __typename: 'AutoPod',
            id: 'new1',
            auto_pod_no: 'AP-9',
            stage: 'OPEN',
            pod_title: 'New Trek',
            pod_description: '',
            pod_info: '',
            pod_hashtag: [],
            pod_images_and_videos: [],
            super_category_id: 'sc1',
            sub_category_id: 'sub1',
            category_name: null,
            pod_amount: 0,
            no_of_spots: 1,
            pod_occurrence: 'ONE_TIME',
            payment_terms: null,
            venue_claim: null,
            host_claim: null,
            club_claim: null,
            location: null,
            pod_id: null,
            created_at: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    };
    renderPage('/auto-pods/new', [createMock]);

    await waitFor(() => expect(harness.editorArgs).not.toBeNull());
    await act(async () => {
      await harness.editorArgs?.submitCreate({ pod_title: 'New Trek' });
    });
    expect(sentVariables).toEqual({ input: { pod_title: 'New Trek' } });

    act(() => harness.editorArgs?.onSaved({ created: true }));
    expect(await screen.findByText('AUTO PODS LIST ROUTE')).toBeInTheDocument();
  });

  it('updates through the update mutation, keyed on the editing offer id', async () => {
    let sentVariables: unknown;
    const editMock: MockedResponse = {
      request: { query: AUTO_POD_FOR_EDIT, variables: { auto_pod_doc_id: 'ap1' } },
      result: { data: { autoPod: makeEditRow({ id: 'ap1' }) } },
    };
    const updateMock: MockedResponse = {
      request: { query: UPDATE_AUTO_POD, variables: (variables) => {
        sentVariables = variables;
        return true;
      } },
      result: {
        data: {
          updateAutoPod: {
            __typename: 'AutoPod',
            id: 'ap1',
            auto_pod_no: 'AP-1',
            stage: 'OPEN',
            pod_title: 'Weekend Trek Updated',
            pod_description: '',
            pod_info: '',
            pod_hashtag: [],
            pod_images_and_videos: [],
            super_category_id: 'sc1',
            sub_category_id: 'sub1',
            category_name: null,
            pod_amount: 0,
            no_of_spots: 1,
            pod_occurrence: 'ONE_TIME',
            payment_terms: null,
            venue_claim: null,
            host_claim: null,
            club_claim: null,
            location: null,
            pod_id: null,
            created_at: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    };
    renderPage('/auto-pods/ap1/edit', [editMock, updateMock]);
    await screen.findByTestId('pod-editor-page');

    await act(async () => {
      await harness.editorArgs?.submitUpdate('ap1', { pod_title: 'Weekend Trek Updated' });
    });
    expect(sentVariables).toEqual({ auto_pod_doc_id: 'ap1', input: { pod_title: 'Weekend Trek Updated' } });

    act(() => harness.editorArgs?.onSaved({ created: false }));
    expect(await screen.findByText('AUTO PODS LIST ROUTE')).toBeInTheDocument();
  });
});
