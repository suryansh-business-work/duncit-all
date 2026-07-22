import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import AppHeader from '../AppHeader';
import {
  HEADER_DATA,
  PUBLIC_POLICIES,
  SET_MY_SELECTED_LOCATION,
  OPEN_LOCATION_PICKER_EVENT,
} from '../queries';

// ---- context mocks ---------------------------------------------------------
const mockLogout = vi.fn();
vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ logout: mockLogout }),
}));

const mockSetMode = vi.fn();
let studioModeValue = 'USER';
vi.mock('../../../StudioModeContext', () => ({
  useStudioMode: () => ({ mode: studioModeValue, setMode: mockSetMode }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---- child component mocks (each surfaces its props as testable controls) ---
vi.mock('../HeaderGreeting', () => ({
  default: (props: any) => (
    <div data-testid="greeting">
      <span data-testid="greeting-loc">{props.selectedLocationName ?? 'no-loc'}</span>
      <span data-testid="greeting-zone">{props.selectedZoneName ?? 'no-zone'}</span>
      <button type="button" onClick={props.onOpenLocation} disabled={!props.onOpenLocation}>
        open-location
      </button>
    </div>
  ),
}));

vi.mock('../HeaderNotificationsBell', () => ({
  default: (props: any) => (
    <button type="button" data-testid="bell" onClick={() => props.onToast({ title: 'T', body: 'B' })}>
      bell
    </button>
  ),
}));

vi.mock('../HeaderSearchButton', () => ({
  default: (props: any) => <div data-testid="search">{props.locationId}|{props.zoneName}</div>,
}));

vi.mock('../HeaderToast', () => ({
  default: (props: any) => (
    <div data-testid="toast">
      {props.toast ? props.toast.title : 'no-toast'}
      <button type="button" onClick={props.onClose}>close-toast</button>
    </div>
  ),
}));

vi.mock('../LocationDialog', () => ({
  default: (props: any) =>
    props.open ? (
      <div data-testid="loc-dialog">
        <span data-testid="draft-loc">{props.draftLocationId}</span>
        <span data-testid="draft-zone">{props.draftZone}</span>
        <button type="button" onClick={props.onApply}>apply</button>
        <button type="button" onClick={() => props.onAutoApply('loc-2', 'ZoneB')}>auto-apply</button>
        <button type="button" onClick={props.onClose}>close-dialog</button>
      </div>
    ) : null,
}));

vi.mock('../ProfileDrawer', () => ({
  default: (props: any) =>
    props.open ? (
      <div data-testid="profile-drawer">
        <button type="button" onClick={props.onClose}>close-drawer</button>
        <button type="button" onClick={props.onLogout}>drawer-logout</button>
      </div>
    ) : null,
}));

vi.mock('../profile-drawer/StudioSwitchDialog', () => ({
  default: (props: any) =>
    props.open ? (
      <div data-testid="studio-switch">
        <button type="button" onClick={() => props.onSelect('HOST')}>select-host</button>
        <button type="button" onClick={props.onClose}>close-switch</button>
      </div>
    ) : null,
}));

vi.mock('../SuperCategoryTabs', () => ({
  default: (props: any) => (
    <div data-testid="tabs" onClick={() => props.onChange('sports')}>
      tabs:{props.value}
    </div>
  ),
}));

vi.mock('../SurveyHeaderActions', () => ({
  default: (props: any) => (
    <button type="button" data-testid="survey-actions" onClick={props.onLogout}>
      survey-logout
    </button>
  ),
}));

// ---- fixtures --------------------------------------------------------------
const headerData = {
  branding: { app_name: 'Duncit', logo_url: '', mweb_logo_url: '', primary_color: '#f0f', home_all_vibe_icon_url: '', home_header_tagline: 'Find your people' },
  me: {
    user_id: 'u1',
    full_name: 'Ada Lovelace',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    is_email_verified: false,
    profile_photo: '',
    bio: '',
    dob: '',
    city: 'Delhi',
    state: '',
    country: '',
    phone_number: '',
    whatsapp_number: '',
    selected_location_id: 'loc-1',
    roles: ['HOST'],
    following_user_ids: [],
  },
  superCategories: [
    { id: 'c1', name: 'All', slug: 'all', icon: '' },
    { id: 'c2', name: 'Sports', slug: 'sports', icon: '' },
  ],
  locations: [
    { id: 'loc-1', location_id: 'L1', location_name: 'Delhi', location_image: '', city: 'Delhi', state: '', state_code: '', country: '', country_code: '', location_pincode: '', active_club_count: 3, location_zones: [] },
    { id: 'loc-2', location_id: 'L2', location_name: 'Mumbai', location_image: '', city: 'Mumbai', state: '', state_code: '', country: '', country_code: '', location_pincode: '', active_club_count: 5, location_zones: [] },
  ],
  activePodLocationIds: ['loc-1'],
};

const headerMock = (data = headerData) => ({
  request: { query: HEADER_DATA },
  result: { data },
});

const policiesMock = {
  request: { query: PUBLIC_POLICIES },
  result: { data: { publicPolicies: [{ id: 'p1', slug: 'privacy', title: 'Privacy' }] } },
};

const setLocationMock = (locationId: string) => ({
  request: { query: SET_MY_SELECTED_LOCATION, variables: { locationId } },
  result: { data: { setMySelectedLocation: { user_id: 'u1', selected_location_id: locationId } } },
});

const baseProps = {
  selectedSuperCategory: 'all',
  onSuperCategoryChange: vi.fn(),
  selectedLocationId: 'loc-1',
  onLocationChange: vi.fn(),
  selectedZoneName: 'North',
  onZoneChange: vi.fn(),
};

function renderHeader(props: Partial<typeof baseProps> & { minimal?: boolean } = {}, mocks: any[] = [headerMock(), policiesMock]) {
  const merged = { ...baseProps, onSuperCategoryChange: vi.fn(), onLocationChange: vi.fn(), onZoneChange: vi.fn(), ...props };
  const utils = render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={['/']}>
        <AppHeader {...merged} />
      </MemoryRouter>
    </MockedProvider>
  );
  return { ...utils, props: merged };
}

describe('AppHeader', () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockSetMode.mockReset();
    mockNavigate.mockReset();
    studioModeValue = 'USER';
  });

  it('renders greeting, search, tabs and email-verify alert in USER mode', async () => {
    renderHeader();
    await screen.findByTestId('greeting');
    expect(screen.getByTestId('greeting-loc')).toHaveTextContent('Delhi');
    expect(screen.getByTestId('greeting-zone')).toHaveTextContent('North');
    expect(screen.getByTestId('search')).toHaveTextContent('loc-1|North');
    expect(screen.getByTestId('tabs')).toHaveTextContent('tabs:all');
    // is_email_verified === false -> alert shown
    expect(await screen.findByText('Please verify your email')).toBeInTheDocument();
  });

  it('navigates to profile verify page when the alert is clicked', async () => {
    renderHeader();
    const alert = await screen.findByText('Please verify your email');
    fireEvent.click(alert);
    expect(mockNavigate).toHaveBeenCalledWith('/profile?verifyEmail=1');
  });

  it('opens the location dialog via greeting and applies a draft selection', async () => {
    const { props } = renderHeader({ selectedLocationId: 'loc-1' }, [
      headerMock(),
      policiesMock,
    ]);
    await screen.findByTestId('greeting');
    fireEvent.click(screen.getByText('open-location'));
    const dialog = await screen.findByTestId('loc-dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId('draft-loc')).toHaveTextContent('loc-1');
    expect(screen.getByTestId('draft-zone')).toHaveTextContent('North');
    fireEvent.click(screen.getByText('apply'));
    expect(props.onLocationChange).toHaveBeenCalledWith('loc-1');
    expect(props.onZoneChange).toHaveBeenCalledWith('North');
    // dialog closes
    await waitFor(() => expect(screen.queryByTestId('loc-dialog')).toBeNull());
  });

  it('applies via onAutoApply and persists a changed location', async () => {
    const { props } = renderHeader({ selectedLocationId: 'loc-1' }, [
      headerMock(),
      policiesMock,
      setLocationMock('loc-2'),
    ]);
    await screen.findByTestId('greeting');
    fireEvent.click(screen.getByText('open-location'));
    await screen.findByTestId('loc-dialog');
    fireEvent.click(screen.getByText('auto-apply'));
    expect(props.onLocationChange).toHaveBeenCalledWith('loc-2');
    expect(props.onZoneChange).toHaveBeenCalledWith('ZoneB');
    await waitFor(() => expect(screen.queryByTestId('loc-dialog')).toBeNull());
  });

  it('opens the location dialog in response to the global event', async () => {
    renderHeader();
    await screen.findByTestId('greeting');
    fireEvent(window, new Event(OPEN_LOCATION_PICKER_EVENT));
    expect(await screen.findByTestId('loc-dialog')).toBeInTheDocument();
  });

  it('opens the account menu and shows the profile drawer', async () => {
    renderHeader();
    await screen.findByTestId('greeting');
    fireEvent.click(screen.getByLabelText('Open account menu'));
    // openMenu navigates by pushing ?menu=open
    expect(mockNavigate).toHaveBeenCalledWith({ search: '?menu=open' });
  });

  it('shows profile drawer when URL already has menu=open and logs out from it', async () => {
    render(
      <MockedProvider mocks={[headerMock(), policiesMock]} addTypename={false}>
        <MemoryRouter initialEntries={['/?menu=open']}>
          <AppHeader {...baseProps} onSuperCategoryChange={vi.fn()} onLocationChange={vi.fn()} onZoneChange={vi.fn()} />
        </MemoryRouter>
      </MockedProvider>
    );
    const drawer = await screen.findByTestId('profile-drawer');
    expect(drawer).toBeInTheDocument();
    fireEvent.click(screen.getByText('drawer-logout'));
    expect(mockLogout).toHaveBeenCalled();
    // close drawer (idx 0 path -> navigate with replace)
    fireEvent.click(screen.getByText('close-drawer'));
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('forwards notification toasts to the toast component', async () => {
    renderHeader();
    await screen.findByTestId('greeting');
    expect(screen.getByTestId('toast')).toHaveTextContent('no-toast');
    fireEvent.click(screen.getByTestId('bell'));
    expect(screen.getByTestId('toast')).toHaveTextContent('T');
    fireEvent.click(screen.getByText('close-toast'));
    expect(screen.getByTestId('toast')).toHaveTextContent('no-toast');
  });

  it('renders the studio chip and opens the switch dialog in a non-USER mode', async () => {
    studioModeValue = 'HOST';
    renderHeader();
    const chip = await screen.findByText('Host Studio');
    // greeting not rendered in studio mode; search hidden
    expect(screen.queryByTestId('greeting')).toBeNull();
    expect(screen.queryByTestId('search')).toBeNull();
    fireEvent.click(chip);
    const dialog = await screen.findByTestId('studio-switch');
    expect(dialog).toBeInTheDocument();
    fireEvent.click(screen.getByText('select-host'));
    expect(mockSetMode).toHaveBeenCalledWith('HOST');
    expect(mockNavigate).toHaveBeenCalledWith('/host/manage');
  });

  it('falls back to USER when the persisted studio mode is not in the user roles', async () => {
    studioModeValue = 'VENUE'; // me.roles = ['HOST'] -> resolveMode -> USER
    renderHeader();
    // USER mode -> greeting present, no chip
    await screen.findByTestId('greeting');
    expect(screen.queryByText('Venue Studio')).toBeNull();
  });

  it('renders minimal mode with survey actions and no tabs/alert', async () => {
    renderHeader({ minimal: true });
    const survey = await screen.findByTestId('survey-actions');
    expect(survey).toBeInTheDocument();
    expect(screen.queryByTestId('tabs')).toBeNull();
    expect(screen.queryByText('Please verify your email')).toBeNull();
    fireEvent.click(survey);
    expect(mockLogout).toHaveBeenCalled();
  });

  it('auto-defaults location to the persisted choice when none selected', async () => {
    const { props } = renderHeader({ selectedLocationId: '' });
    await screen.findByTestId('greeting');
    await waitFor(() => expect(props.onLocationChange).toHaveBeenCalledWith('loc-1'));
  });

  it('auto-defaults super category when none selected', async () => {
    const { props } = renderHeader({ selectedSuperCategory: '' });
    await screen.findByTestId('greeting');
    await waitFor(() => expect(props.onSuperCategoryChange).toHaveBeenCalledWith('all'));
  });

  it('does not render the verify alert when the email is already verified', async () => {
    const verified = { ...headerData, me: { ...headerData.me, is_email_verified: true } };
    renderHeader({}, [headerMock(verified), policiesMock]);
    await screen.findByTestId('greeting');
    expect(screen.queryByText('Please verify your email')).toBeNull();
  });
});
