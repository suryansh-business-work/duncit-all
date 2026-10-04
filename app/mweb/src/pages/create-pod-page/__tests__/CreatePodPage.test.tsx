import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Stub the heavy stepper + helpers so the page is exercised in isolation.
vi.mock('../create-pod', () => ({
  blankCreatePodForm: { location_id: '', name: 'blank' },
  hydrateDraft: (payload: unknown) => ({ location_id: 'from-draft', payload }),
  STEP_TITLES: ['A', 'B', 'C', 'D'],
  CreatePodStepper: (props: Record<string, unknown>) => (
    <div data-testid="stepper">
      <span data-testid="step">{String(props.initialStep)}</span>
      <span data-testid="draft-id">{String(props.initialDraftId)}</span>
      <span data-testid="location">{(props.initialValues as { location_id?: string })?.location_id}</span>
      <span data-testid="clubs">{(props.clubs as unknown[]).length}</span>
      <span data-testid="venues">{(props.venues as unknown[]).length}</span>
      <span data-testid="products">{(props.products as unknown[]).length}</span>
      <span data-testid="viewer">{String(props.viewerUserId)}</span>
    </div>
  ),
}));

// The page reads its documents from ../queries, so the mocks match them exactly.
import { CREATE_POD_OPTIONS, MY_POD_DRAFT } from '../queries';
import { AppLocationProvider } from '../../../app/AppLocationContext';

const baseOptions = (overrides: Record<string, any> = {}) => ({
  me: { user_id: 'u1', roles: ['HOST'] },
  clubs: [{ id: 'c1' }, { id: 'c2' }],
  locations: [
    { id: 'loc-1' },
    { id: 'loc-2' },
  ],
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
});

const draftMock = (draftId: string) => ({
  request: { query: MY_POD_DRAFT, variables: { draft_id: draftId } },
  result: { data: { myPodDraft: { id: 'd1', payload: { any: 'thing' }, step: 2 } } },
});

// A new pod starts in the city the app header has selected.
const renderPage = (mocks: any[], entry = '/create-pod', locationId = 'loc-2'): ReactElement =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <AppLocationProvider locationId={locationId} zoneName="">
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/create-pod" element={<Page />} />
            <Route path="/create-pod/:draftId" element={<Page />} />
          </Routes>
        </MemoryRouter>
      </AppLocationProvider>
    </MockedProvider>,
  ) as unknown as ReactElement;

// Import after mocks are registered.
import Page from '../index';

afterEach(() => {
  mockNavigate.mockReset();
  vi.clearAllMocks();
});

describe('CreatePodPage', () => {
  it('shows the header title and a loading spinner initially', () => {
    renderPage([optionsMock(baseOptions())]);
    expect(screen.getByText('Create a Pod')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the stepper for a HOST role and passes filtered/derived props', async () => {
    renderPage([optionsMock(baseOptions())]);
    expect(await screen.findByTestId('stepper')).toBeInTheDocument();
    // a new pod starts in the header's selected city
    expect(screen.getByTestId('location')).toHaveTextContent('loc-2');
    expect(screen.getByTestId('clubs')).toHaveTextContent('2');
    // inactive venue filtered out
    expect(screen.getByTestId('venues')).toHaveTextContent('1');
    expect(screen.getByTestId('products')).toHaveTextContent('1');
    expect(screen.getByTestId('viewer')).toHaveTextContent('u1');
    expect(screen.getByTestId('step')).toHaveTextContent('0');
    expect(screen.getByTestId('draft-id')).toHaveTextContent('null');
  });

  it('grants host access via an approved active host profile without the HOST role', async () => {
    const data = baseOptions({ me: { user_id: 'u9', roles: [] } });
    renderPage([optionsMock(data)], '/create-pod', 'loc-1');
    expect(await screen.findByTestId('stepper')).toBeInTheDocument();
    expect(screen.getByTestId('viewer')).toHaveTextContent('u9');
    // the location follows whichever city the header has selected
    expect(screen.getByTestId('location')).toHaveTextContent('loc-1');
  });

  it('shows the become-host info alert when the viewer is not a host', async () => {
    const data = baseOptions({
      me: { user_id: 'u0', roles: [] },
      myHost: null,
    });
    renderPage([optionsMock(data)]);
    expect(await screen.findByText('An approved host profile is required before creating pods.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Become a host' }));
    expect(mockNavigate).toHaveBeenCalledWith('/become-host');
  });

  it('shows an error alert when the options query fails', async () => {
    const mocks = [{ request: { query: CREATE_POD_OPTIONS }, error: new Error('boom') }];
    renderPage(mocks);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('hydrates a draft and resumes at its saved step when a draftId param is present', async () => {
    renderPage([optionsMock(baseOptions()), draftMock('d1')], '/create-pod/d1');
    expect(await screen.findByTestId('stepper')).toBeInTheDocument();
    expect(screen.getByTestId('draft-id')).toHaveTextContent('d1');
    expect(screen.getByTestId('step')).toHaveTextContent('2');
    // hydrateDraft stub sets location_id to 'from-draft'
    expect(screen.getByTestId('location')).toHaveTextContent('from-draft');
  });

  // The calm header carries the title alone: the autosave subtitle that used to
  // overflow under the close button on a phone is gone, not just truncated.
  it('renders the title alone, with no autosave subtitle in the header', () => {
    renderPage([optionsMock(baseOptions())]);
    expect(screen.getByRole('heading', { name: 'Create a Pod' })).toBeInTheDocument();
    expect(screen.queryByText(/Your progress saves automatically/)).not.toBeInTheDocument();
  });

  it('navigates to host management from the close button', async () => {
    renderPage([optionsMock(baseOptions())]);
    await screen.findByTestId('stepper');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockNavigate).toHaveBeenCalledWith('/host/manage');
  });
});
