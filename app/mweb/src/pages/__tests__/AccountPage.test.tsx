import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AccountPage from '../AccountPage';
import { MY_ACCOUNT_HEALTH, type HealthScore } from '../../components/health/queries';

// ---- hoisted spies ------------------------------------------------------
const navigateSpy = vi.fn();
const logoutSpy = vi.fn();
const refetchSpy = vi.fn();
// The profile is read from the USER_INFO cache through useUserInfo; a failed
// load surfaces through the user context's `error`.
const userInfo = vi.hoisted(() => ({
  state: { me: undefined as unknown, loading: false },
  error: undefined as Error | undefined,
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ logout: logoutSpy, refetch: refetchSpy, error: userInfo.error }),
}));

vi.mock('../../user-info/useUserInfo', () => ({
  useUserInfo: () => userInfo.state,
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

vi.mock('../account-page/PrivacyToggleCard', () => ({
  default: ({ onChanged }: { onChanged: () => void }) => (
    <button onClick={onChanged}>stub-privacy</button>
  ),
}));

vi.mock('../account-page/SecuritySection', () => ({
  default: () => <div>stub-security</div>,
}));

vi.mock('../account-page/LanguageSection', () => ({ default: () => <div>stub-language</div> }));
vi.mock('../account-page/comm-preference', () => ({ default: () => <div>stub-comm-pref</div> }));
vi.mock('../account-page/PrivacyDataEntryCard', () => ({
  default: () => <div>stub-privacy-data</div>,
}));
vi.mock('../account-page/ConnectedAccountsSection', () => ({
  default: () => <div>stub-connected</div>,
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
  default: ({ label }: { label: string }) => <span>meter-{label}</span>,
}));

const meData = {
  __typename: 'User',
  user_id: 'u1',
  username: 'alice',
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

const withProfile = (me: unknown, loading = false) => {
  userInfo.state = { me, loading };
};
const healthMock = (h: HealthScore | null) => ({
  request: { query: MY_ACCOUNT_HEALTH },
  result: { data: { myAccountHealth: h } },
});

const renderPage = (mocks: unknown[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks as never}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </MockedProvider>,
  );

describe('AccountPage', () => {
  beforeEach(() => {
    navigateSpy.mockClear();
    logoutSpy.mockClear();
    refetchSpy.mockClear();
    userInfo.error = undefined;
    withProfile(meData);
  });

  it('shows a spinner while the profile is loading for the first time', () => {
    withProfile(undefined, true);
    renderPage([healthMock(health)]);
    expect(screen.getByTestId('account-loading')).toBeInTheDocument();
    expect(document.querySelector('.MuiCircularProgress-root')).toBeTruthy();
    expect(screen.queryByTestId('account-screen')).not.toBeInTheDocument();
  });

  it('renders the profile once loaded, with formatted DOB and info rows', async () => {
    renderPage([healthMock(health)]);
    expect(await screen.findByText('Email: alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Phone: +91 9999999999')).toBeInTheDocument();
    expect(screen.getByText('Location: London · LDN · UK')).toBeInTheDocument();
    expect(screen.getByText('Date of birth: fmt(1990-01-01)')).toBeInTheDocument();
    expect(screen.getByText('stub-completion')).toBeInTheDocument();
    expect(screen.getByText('stub-security')).toBeInTheDocument();
  });

  it('renders em-dashes for missing phone/location/dob', async () => {
    withProfile({
      ...meData,
      phone_number: '',
      city: '',
      state: '',
      country: '',
      dob: null,
    });
    renderPage([healthMock(null)]);
    expect(await screen.findByText('Phone: —')).toBeInTheDocument();
    expect(screen.getByText('Location: —')).toBeInTheDocument();
    expect(screen.getByText('Date of birth: —')).toBeInTheDocument();
    // no health card when health is null
    expect(screen.queryByText(/Account Health/)).not.toBeInTheDocument();
  });

  it('shows the GREEN health card and opens the details when the card is pressed', async () => {
    renderPage([healthMock(health)]);
    expect(await screen.findByText('You’re in great shape.')).toBeInTheDocument();
    expect(screen.getByText(/Base score: 80/)).toBeInTheDocument();
    expect(screen.getByText(/Admin adjustment: \+5/)).toBeInTheDocument();
    expect(screen.getByText(/1 admin remark\./)).toBeInTheDocument();
    expect(screen.getByText('meter-Account Health')).toBeInTheDocument();

    fireEvent.click(screen.getByText('You’re in great shape.'));
    expect(navigateSpy).toHaveBeenCalledWith('/account/health');
  });

  it('renders the YELLOW headline with no admin adjustment or remarks', async () => {
    const yellow: HealthScore = {
      ...health,
      band: 'YELLOW',
      base_score: 60,
      delta_sum: 0,
      total_score: 60,
      adjustments: [],
    };
    renderPage([healthMock(yellow)]);
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
    renderPage([healthMock(red)]);
    expect(await screen.findByText('Needs attention.')).toBeInTheDocument();
    expect(screen.getByText(/Admin adjustment: -10/)).toBeInTheDocument();
    expect(screen.getByText(/2 admin remarks/)).toBeInTheDocument();
  });

  it('opens and closes the edit dialog', async () => {
    renderPage([healthMock(health)]);
    fireEvent.click(await screen.findByText('stub-edit'));
    expect(await screen.findByText('edit-dialog-open')).toBeInTheDocument();
    fireEvent.click(screen.getByText('stub-dialog-close'));
    await waitFor(() => expect(screen.queryByText('edit-dialog-open')).not.toBeInTheDocument());
  });

  it('re-reads the profile and shows the "Profile updated" snackbar after a save', async () => {
    renderPage([healthMock(health)]);
    fireEvent.click(await screen.findByText('stub-edit'));
    fireEvent.click(await screen.findByText('stub-saved'));
    expect(await screen.findByText('Profile updated')).toBeInTheDocument();
    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it('re-reads the profile when the privacy setting changes', async () => {
    renderPage([healthMock(health)]);
    fireEvent.click(await screen.findByText('stub-privacy'));
    expect(refetchSpy).toHaveBeenCalledTimes(1);
  });

  it('logs out via the profile header', async () => {
    renderPage([healthMock(health)]);
    fireEvent.click(await screen.findByText('stub-logout'));
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });

  it('renders the context error when the profile could not be loaded', async () => {
    withProfile(undefined);
    userInfo.error = new Error('boom');
    renderPage([healthMock(health)]);
    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.getByTestId('account-error')).toBeInTheDocument();
  });

  it('falls back to a generic message when there is no profile and no error', () => {
    withProfile(undefined);
    renderPage([healthMock(health)]);
    expect(screen.getByTestId('account-error')).toHaveTextContent('Unable to load profile');
  });
});
