import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { ConfirmProvider } from '@duncit/dialogs';
import { isPodDraftId, type DraftAutosaveHandle } from '@duncit/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

/** What the stepper last handed the page through onAutosave. */
const stepperProps = vi.hoisted(() => ({ current: {} as Record<string, any> }));

// Stub the heavy stepper + helpers so the page is exercised in isolation.
vi.mock('../create-pod', () => ({
  blankCreatePodForm: { location_id: '', name: 'blank' },
  hydrateDraft: (payload: unknown) => ({ location_id: 'from-draft', payload }),
  STEP_TITLES: ['A', 'B', 'C', 'D', 'E'],
  CreatePodStepper: (props: Record<string, unknown>) => {
    stepperProps.current = props;
    return (
      <div data-testid="stepper">
        <span data-testid="step">{String(props.initialStep)}</span>
        <span data-testid="draft-id">{String(props.initialDraftId)}</span>
        <span data-testid="location">{(props.initialValues as { location_id?: string })?.location_id}</span>
        <span data-testid="clubs">{(props.clubs as unknown[]).length}</span>
        <span data-testid="venues">{(props.venues as unknown[]).length}</span>
        <span data-testid="products">{(props.products as unknown[]).length}</span>
        <span data-testid="viewer">{String(props.viewerUserId)}</span>
      </div>
    );
  },
}));

// The page reads its documents from ../queries, so the mocks match them exactly.
import { CREATE_POD_OPTIONS, MY_POD_DRAFT } from '../queries';
import { AppLocationProvider } from '../../../app/AppLocationContext';

const DRAFT_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

const baseOptions = (overrides: Record<string, any> = {}) => ({
  me: { user_id: 'u1', roles: ['HOST'] },
  clubs: [{ id: 'c1' }, { id: 'c2' }],
  locations: [{ id: 'loc-1' }, { id: 'loc-2' }],
  publicVenues: [
    { id: 'v1', is_active: true },
    { id: 'v2', is_active: false },
  ],
  myHost: { id: 'h1', status: 'APPROVED', is_active: true, host_categories: [{ super_category_id: 's' }] },
  subCategories: [{ id: 'sub-1', min_pax: 4 }],
  availablePodProducts: [{ id: 'p1' }],
  ...overrides,
});

const optionsMock = (data: any) => ({
  request: { query: CREATE_POD_OPTIONS },
  result: { data },
  // /create-pod re-mounts the page under its minted id, which reads them again.
  maxUsageCount: 5,
});

const draftMock = (draftId: string) => ({
  request: { query: MY_POD_DRAFT, variables: { draft_id: draftId } },
  result: { data: { myPodDraft: { id: draftId, payload: { any: 'thing' }, step: 2 } } },
});

/** Nothing saved under the id yet — whatever id the page minted. */
const draftNotFound = {
  request: { query: MY_POD_DRAFT },
  variableMatcher: () => true,
  maxUsageCount: 5,
  result: { errors: [{ message: 'Draft not found', extensions: { code: 'NOT_FOUND' } }] },
};

/** Shows where the router ended up, so a redirect can be asserted. */
function WhereAmI() {
  const { pathname, search } = useLocation();
  return <span data-testid="where">{pathname + search}</span>;
}

// A new pod starts in the city the app header has selected.
const renderPage = (mocks: any[], entry = '/create-pod', locationId = 'loc-2'): ReactElement =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ConfirmProvider>
        <AppLocationProvider locationId={locationId} zoneName="">
          <MemoryRouter initialEntries={[entry]}>
            <Routes>
              <Route path="/create-pod" element={<Page />} />
              <Route path="/create-pod/:draftId" element={<Page />} />
            </Routes>
            <WhereAmI />
          </MemoryRouter>
        </AppLocationProvider>
      </ConfirmProvider>
    </MockedProvider>,
  ) as unknown as ReactElement;

/** The stepper reporting its autosave to the page. */
const reportAutosave = (handle: DraftAutosaveHandle) =>
  act(() => {
    stepperProps.current.onAutosave(handle);
  });

// Import after mocks are registered.
import Page from '../index';

beforeEach(() => {
  stepperProps.current = {};
});

afterEach(() => {
  mockNavigate.mockReset();
  vi.clearAllMocks();
});

describe('CreatePodPage', () => {
  it('shows the header title and a loading spinner initially', async () => {
    renderPage([optionsMock(baseOptions()), draftNotFound]);
    expect(await screen.findByText('Create a Pod')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('names a new pod at once: /create-pod moves to a freshly minted draft id, keeping its query', async () => {
    renderPage([optionsMock(baseOptions()), draftNotFound], '/create-pod?host_again=p1');
    await waitFor(() => expect(screen.getByTestId('where').textContent).toMatch(/^\/create-pod\/[0-9a-f]{24}\?host_again=p1$/));
    const minted = screen.getByTestId('where').textContent?.split('/')[2]?.split('?')[0];
    expect(isPodDraftId(minted)).toBe(true);
  });

  it('replaces an id that is not a draft id with a minted one', async () => {
    renderPage([optionsMock(baseOptions()), draftNotFound], '/create-pod/not-a-draft');
    await waitFor(() => expect(screen.getByTestId('where').textContent).toMatch(/^\/create-pod\/[0-9a-f]{24}$/));
  });

  it('opens a new pod under the minted id when nothing is saved under it yet', async () => {
    renderPage([optionsMock(baseOptions()), draftNotFound]);
    expect(await screen.findByTestId('stepper')).toBeInTheDocument();
    // a new pod starts in the header's selected city
    expect(screen.getByTestId('location')).toHaveTextContent('loc-2');
    expect(screen.getByTestId('clubs')).toHaveTextContent('2');
    // inactive venue filtered out
    expect(screen.getByTestId('venues')).toHaveTextContent('1');
    expect(screen.getByTestId('products')).toHaveTextContent('1');
    expect(screen.getByTestId('viewer')).toHaveTextContent('u1');
    expect(screen.getByTestId('step')).toHaveTextContent('0');
    expect(screen.getByTestId('where')).toHaveTextContent(screen.getByTestId('draft-id').textContent ?? 'missing');
    expect(isPodDraftId(screen.getByTestId('draft-id').textContent)).toBe(true);
  });

  it('grants host access via an approved active host profile without the HOST role', async () => {
    const data = baseOptions({ me: { user_id: 'u9', roles: [] } });
    renderPage([optionsMock(data), draftNotFound], '/create-pod', 'loc-1');
    expect(await screen.findByTestId('stepper')).toBeInTheDocument();
    expect(screen.getByTestId('viewer')).toHaveTextContent('u9');
    // the location follows whichever city the header has selected
    expect(screen.getByTestId('location')).toHaveTextContent('loc-1');
  });

  it('shows the become-host info alert when the viewer is not a host', async () => {
    const data = baseOptions({ me: { user_id: 'u0', roles: [] }, myHost: null });
    renderPage([optionsMock(data), draftNotFound]);
    expect(await screen.findByText('An approved host profile is required before creating pods.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Become a host' }));
    expect(mockNavigate).toHaveBeenCalledWith('/become-host');
  });

  it('shows an error alert when the options query fails', async () => {
    const mocks = [{ request: { query: CREATE_POD_OPTIONS }, error: new Error('boom') }, draftNotFound];
    renderPage(mocks);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('hydrates a draft and resumes at its saved step when its id is in the URL', async () => {
    renderPage([optionsMock(baseOptions()), draftMock(DRAFT_ID)], `/create-pod/${DRAFT_ID}`);
    expect(await screen.findByTestId('stepper')).toBeInTheDocument();
    expect(screen.getByTestId('draft-id')).toHaveTextContent(DRAFT_ID);
    // A draft with no stepper version is a five-step one: its Venue & Slot (2)
    // now lives on Where & when (1).
    expect(screen.getByTestId('step')).toHaveTextContent('1');
    // hydrateDraft stub sets location_id to 'from-draft'
    expect(screen.getByTestId('location')).toHaveTextContent('from-draft');
  });

  it('opens no form when the draft cannot be read, and opens it once a retry succeeds', async () => {
    const failed = { request: { query: MY_POD_DRAFT, variables: { draft_id: DRAFT_ID } }, error: new Error('Network down') };
    renderPage([optionsMock(baseOptions()), failed, draftMock(DRAFT_ID)], `/create-pod/${DRAFT_ID}`);
    expect(await screen.findByTestId('create-pod-draft-error')).toHaveTextContent(
      'Could not open this draft. Check your connection and try again.',
    );
    // A blank form here would autosave over the real draft.
    expect(screen.queryByTestId('stepper')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('create-pod-draft-retry'));
    expect(await screen.findByTestId('stepper')).toBeInTheDocument();
    expect(screen.getByTestId('draft-id')).toHaveTextContent(DRAFT_ID);
  });

  // The calm header carries the title alone: the autosave subtitle that used to
  // overflow under the close button on a phone is gone, not just truncated.
  it('renders the title alone, with no autosave subtitle in the header', async () => {
    renderPage([optionsMock(baseOptions()), draftNotFound]);
    expect(await screen.findByRole('heading', { name: 'Create a Pod' })).toBeInTheDocument();
    expect(screen.queryByText(/Your progress saves automatically/)).not.toBeInTheDocument();
  });

  it('shows the save state the stepper reports in the header corner', async () => {
    renderPage([optionsMock(baseOptions()), draftNotFound]);
    await screen.findByTestId('stepper');
    const indicator = screen.getByTestId('draft-save-indicator');
    expect(indicator).toHaveAttribute('data-status', 'idle');
    expect(indicator).toHaveTextContent('');
    const flush = vi.fn().mockResolvedValue(true);
    reportAutosave({ status: 'saving', unsaved: true, flush });
    expect(indicator).toHaveTextContent('Saving…');
    reportAutosave({ status: 'saved', unsaved: false, flush });
    expect(indicator).toHaveTextContent('Saved');
    reportAutosave({ status: 'error', unsaved: true, flush });
    expect(indicator).toHaveTextContent('Not saved — retrying');
    expect(indicator).toHaveAttribute('role', 'status');
  });

  it('saves the draft before closing to host management', async () => {
    renderPage([optionsMock(baseOptions()), draftNotFound]);
    await screen.findByTestId('stepper');
    const flush = vi.fn().mockResolvedValue(true);
    reportAutosave({ status: 'saved', unsaved: true, flush });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/host/manage'));
    expect(flush).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument();
  });

  it('asks before closing when the last save failed, and stays when the host says so', async () => {
    renderPage([optionsMock(baseOptions()), draftNotFound]);
    await screen.findByTestId('stepper');
    reportAutosave({ status: 'error', unsaved: true, flush: vi.fn().mockResolvedValue(false) });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
    await waitFor(() => expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Leave anyway' }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/host/manage'));
  });
});
