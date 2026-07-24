import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gql } from '@apollo/client';
import { MockedProvider } from '@apollo/client/testing';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountPage from '../AccountPage';
import { MY_ACCOUNT_HEALTH, type HealthScore } from '../../components/health/queries';

// ---- hoisted spies ------------------------------------------------------
const navigateSpy = vi.fn();
const logoutSpy = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ logout: logoutSpy }),
}));

vi.mock('../../utils/dateFormat', () => ({
  useDateFormat: () => ({ formatDate: (v: string) => `fmt(${v})` }),
}));

// ---- child component stubs (so they don't fire their own queries) -------
vi.mock('../account-page/AccountProfileHeader', () => ({
  default: ({ onEdit, onLogout }: { onEdit: () => void; onLogout: () => void }) => (
    <div>
      <button onClick={onEdit}>stub-edit</button>
      <button onClick={onLogout}>stub-logout</button>
    </div>
  ),
}));

vi.mock('../account-page/AccountInfoRow', () => ({
  default: ({ label, value }: { label: string; value: string }) => (
    <div>
      {label}: {value}
    </div>
  ),
}));

vi.mock('../account-page/CompletionMeter', () => ({
  default: () => <div>stub-completion</div>,
}));

vi.mock('../account-page/HostsVenuesCard', () => ({
  default: () => <div>stub-hostsvenues</div>,
}));

vi.mock('../account-page/PrivacyToggleCard', () => ({
  default: ({ onChanged }: { onChanged: () => void }) => (
    <button onClick={onChanged}>stub-privacy</button>
  ),
}));

vi.mock('../account-page/SecuritySection', () => ({
  default: () => <div>stub-security</div>,
}));

vi.mock('../account-page/EditAccountDialog', () => ({
  default: ({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) =>
    open ? (
      <div>
        <span>edit-dialog-open</span>
        <button onClick={onSaved}>stub-saved</button>
        <button onClick={onClose}>stub-dialog-close</button>
      </div>
    ) : null,
}));

vi.mock('../account-page/account-edit', () => ({
  toDobInput: (v: string | null) => v ?? '',
}));

vi.mock('../../components/health/HealthMeter', () => ({
  default: ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button onClick={onClick}>meter-{label}</button>
  ),
}));

// ---- ME query (redefined verbatim to match the inline document) ---------
const ME = gql`
  query MeProfile {
    me {
      user_id
      first_name
      last_name
      full_name
      email
      phone_number
      phone_extension
      whatsapp_number
      whatsapp_extension
      profile_photo
      bio
      city
      state
      country
      address {
        line1
        line2
        landmark
        city
        state
        pincode
        country
      }
      dob
      roles
      profile_visibility
      created_at
    }
  }
`;

const meData = {
  __typename: 'User',
  user_id: 'u1',
  first_name: 'Alice',
  last_name: 'Wonder',
  full_name: 'Alice Wonder',
  email: 'alice@example.com',
  phone_number: '9999999999',
  phone_extension: '+91',
  whatsapp_number: '',
  whatsapp_extension: '+91',
  profile_photo: null,
  bio: 'hello',
  city: 'London',
  state: 'LDN',
  country: 'UK',
  address: {
    __typename: 'UserAddress',
    line1: '221B',
    line2: '',
    landmark: '',
    city: 'London',
    state: 'LDN',
    pincode: '123456',
    country: 'UK',
  },
  dob: '1990-01-01',
  roles: ['USER'],
  profile_visibility: 'PUBLIC',
  created_at: '2020-01-01',
};

const adjustment = {
  __typename: 'HealthAdjustment',
  id: 'a1',
  delta: 5,
  remark: 'nice',
  created_by_name: 'Admin',
  created_at: '2021-01-01',
};

const health = {
  __typename: 'HealthScore',
  subject_type: 'USER',
  subject_id: 'u1',
  subject_label: 'Alice',
  base_score: 80,
  delta_sum: 5,
  total_score: 85,
  band: 'GREEN',
  adjustments: [adjustment],
} as unknown as HealthScore;

const meMock = (data: unknown) => ({ request: { query: ME }, result: { data: { me: data } } });
const healthMock = (h: HealthScore | null) => ({
  request: { query: MY_ACCOUNT_HEALTH },
  result: { data: { myAccountHealth: h } },
});

const renderPage = (mocks: unknown[]) =>
  render(
    <MockedProvider mocks={mocks as never}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </MockedProvider>,
  );

describe('AccountPage', () => {
  beforeEach(() => {
    navigateSpy.mockClear();
    logoutSpy.mockClear();
  });

  it('shows a spinner while the profile query is loading', () => {
    renderPage([meMock(meData), healthMock(health)]);
    expect(document.querySelector('.MuiCircularProgress-root')).toBeTruthy();
  });

  it('renders the profile once loaded, with formatted DOB and info rows', async () => {
    renderPage([meMock(meData), healthMock(health)]);
    expect(await screen.findByText('Email: alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Phone: +91 9999999999')).toBeInTheDocument();
    expect(screen.getByText('Location: London · LDN · UK')).toBeInTheDocument();
    expect(screen.getByText('Date of birth: fmt(1990-01-01)')).toBeInTheDocument();
    expect(screen.getByText('stub-completion')).toBeInTheDocument();
    expect(screen.getByText('stub-security')).toBeInTheDocument();
  });

  it('renders em-dashes for missing phone/location/dob', async () => {
    const sparse = {
      ...meData,
      phone_number: '',
      city: '',
      state: '',
      country: '',
      dob: null,
    };
    renderPage([meMock(sparse), healthMock(null)]);
    expect(await screen.findByText('Phone: —')).toBeInTheDocument();
    expect(screen.getByText('Location: —')).toBeInTheDocument();
    expect(screen.getByText('Date of birth: —')).toBeInTheDocument();
    // no health card when health is null
    expect(screen.queryByText(/Account Health/)).not.toBeInTheDocument();
  });

  it('shows the GREEN health card and navigates to details on meter click', async () => {
    renderPage([meMock(meData), healthMock(health)]);
    expect(await screen.findByText('You’re in great shape.')).toBeInTheDocument();
    expect(screen.getByText(/Base score: 80/)).toBeInTheDocument();
    expect(screen.getByText(/Admin adjustment: \+5/)).toBeInTheDocument();
    expect(screen.getByText(/1 admin remark/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('meter-Account Health'));
    expect(navigateSpy).toHaveBeenCalledWith('/account/health');
  });

  it('renders the YELLOW headline with pluralised remarks and no admin adjustment', async () => {
    const yellow: HealthScore = {
      ...health,
      band: 'YELLOW',
      base_score: 60,
      delta_sum: 0,
      total_score: 60,
      adjustments: [],
    };
    renderPage([meMock(meData), healthMock(yellow)]);
    expect(await screen.findByText('A few things to tighten up.')).toBeInTheDocument();
    expect(screen.queryByText(/Admin adjustment/)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin remark/)).not.toBeInTheDocument();
  });

  it('renders the RED headline with a negative admin adjustment', async () => {
    const red: HealthScore = {
      ...health,
      band: 'RED',
      delta_sum: -10,
      total_score: 70,
      adjustments: [adjustment, adjustment],
    };
    renderPage([meMock(meData), healthMock(red)]);
    expect(await screen.findByText('Needs attention.')).toBeInTheDocument();
    expect(screen.getByText(/Admin adjustment: -10/)).toBeInTheDocument();
    expect(screen.getByText(/2 admin remarks/)).toBeInTheDocument();
  });

  it('opens and closes the edit dialog', async () => {
    renderPage([meMock(meData), healthMock(health)]);
    fireEvent.click(await screen.findByText('stub-edit'));
    expect(await screen.findByText('edit-dialog-open')).toBeInTheDocument();
    fireEvent.click(screen.getByText('stub-dialog-close'));
    await waitFor(() => expect(screen.queryByText('edit-dialog-open')).not.toBeInTheDocument());
  });

  it('shows the "Profile updated" snackbar after a save', async () => {
    renderPage([meMock(meData), healthMock(health), meMock(meData)]);
    fireEvent.click(await screen.findByText('stub-edit'));
    fireEvent.click(await screen.findByText('stub-saved'));
    expect(await screen.findByText('Profile updated')).toBeInTheDocument();
  });

  it('logs out via the profile header', async () => {
    renderPage([meMock(meData), healthMock(health)]);
    fireEvent.click(await screen.findByText('stub-logout'));
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });

  it('renders an error alert when the profile query fails', async () => {
    renderPage([
      { request: { query: ME }, error: new Error('boom') },
      healthMock(health),
    ]);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
