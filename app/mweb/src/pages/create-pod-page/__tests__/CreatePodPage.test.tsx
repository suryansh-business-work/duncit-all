import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
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

// Query documents recreated to match the component's inline gql exactly.
const CREATE_POD_OPTIONS = gql`
  query CreatePodOptions {
    me { user_id roles selected_location_id }
    clubs(filter: { is_active: true }) {
      id
      club_name
      location_id
      locality
      super_category_id
      category_id
      matched_venues_count
      matched_venues { id }
      club_description
      club_feature_images_and_videos { url type }
    }
    locations(filter: { is_active: true }) {
      id
      location_name
      city
      state
      state_code
      country
      country_code
      location_image
      location_pincode
      active_club_count
      location_zones { zone_name pincode active_club_count }
    }
    publicVenues {
      id
      owner_user_id
      location_id
      venue_name
      venue_type
      capacity
      capacity_items { label capacity }
      cover_image_url
      city
      locality
      address_line1
      state
      postal_code
      country
      lat
      lng
      owner_name
      owner_phone
      owner_email
      is_active
    }
    myHost {
      id
      status
      is_active
      host_categories {
        super_category_id
        category_id
        sub_category_id
        super_category_name
        category_name
        sub_category_name
      }
    }
    availablePodProducts {
      id
      product_name
      unit_cost
      available_count
      image_url
      super_category_id
      sub_category_id
      categories { super_category_id sub_category_id }
    }
  }
`;
const MY_POD_DRAFT = gql`
  query MyPodDraftForEdit($draft_id: ID!) {
    myPodDraft(draft_id: $draft_id) { id payload step }
  }
`;

const baseOptions = (overrides: Record<string, any> = {}) => ({
  me: { user_id: 'u1', roles: ['HOST'], selected_location_id: 'loc-2' },
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

const renderPage = (mocks: any[], entry = '/create-pod'): ReactElement =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/create-pod" element={<Page />} />
          <Route path="/create-pod/:draftId" element={<Page />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  ) as unknown as ReactElement;

// Import after mocks are registered.
import Page from '../index';

afterEach(() => {
  mockNavigate.mockReset();
  vi.clearAllMocks();
});

describe('CreatePodPage', () => {
  it('shows the header title, caption and a loading spinner initially', () => {
    renderPage([optionsMock(baseOptions())]);
    expect(screen.getByText('Create a Pod')).toBeInTheDocument();
    expect(screen.getByText(/Your progress saves automatically/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the stepper for a HOST role and passes filtered/derived props', async () => {
    renderPage([optionsMock(baseOptions())]);
    expect(await screen.findByTestId('stepper')).toBeInTheDocument();
    // selected_location_id loc-2 exists -> used as default location
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
    const data = baseOptions({ me: { user_id: 'u9', roles: [], selected_location_id: 'nope' } });
    renderPage([optionsMock(data)]);
    expect(await screen.findByTestId('stepper')).toBeInTheDocument();
    // selected_location_id not found -> falls back to first location id
    expect(screen.getByTestId('location')).toHaveTextContent('loc-1');
  });

  it('shows the become-host info alert when the viewer is not a host', async () => {
    const data = baseOptions({
      me: { user_id: 'u0', roles: [], selected_location_id: 'loc-1' },
      myHost: null,
    });
    renderPage([optionsMock(data)]);
    expect(await screen.findByText('Host access is required before creating pods.')).toBeInTheDocument();
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

  it('navigates to host management from the close button', async () => {
    renderPage([optionsMock(baseOptions())]);
    await screen.findByTestId('stepper');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockNavigate).toHaveBeenCalledWith('/host/manage');
  });
});
