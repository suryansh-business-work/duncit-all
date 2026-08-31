import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { gql } from '@apollo/client';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ConfirmProvider, NotifyHost } from '@duncit/dialogs';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import UserDetailsPage from '../UserDetailsPage';
import { USER, USER_ACTIVITY_YEAR, USER_HOST_PROFILE } from '../queries';
import { USER_ACCOUNT_HEALTH } from '../UserHealthSection/queries';
import { __setTableRows, tableFetchCalls } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));

/**
 * A minimal stand-in for the real dialog (owned/tested by another agent in
 * this same directory). UserDetailsPage's OWN job is only to wire `open`,
 * `type`, `onClose` and `onSaved` — this stub exposes exactly those so the
 * page's wiring can be driven directly, without going through the dialog's
 * own form/mutation flow (which is out of scope here).
 */
vi.mock('../ContactActionDialog', () => ({
  default: ({ open, type, onClose, onSaved }: any) =>
    open ? (
      <div data-testid="contact-dialog-stub">
        <span>Contact type: {type}</span>
        <button type="button" onClick={onClose}>
          Stub close
        </button>
        <button type="button" onClick={onSaved}>
          Stub save
        </button>
      </div>
    ) : null,
}));

/** UserDetailsPage reads its id from the route param, so — unlike the plain
 * `renderWithProviders` every other section test in this directory uses — it
 * needs a real `<Route path="/users/:user_id">` around it. Mirrors both local
 * testkits (the portal-wide harness plus the MUI-X localization context that
 * `DateField` needs) with routing added. */
function renderPage(
  ui: ReactElement,
  options: { mocks?: MockedResponse[]; path: string; initialEntries: string[] },
) {
  const { mocks = [], path, initialEntries } = options;
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <DuncitLocalizationProvider>
        <ConfirmProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route path={path} element={ui} />
              </Routes>
              <NotifyHost />
            </MemoryRouter>
          </LocalizationProvider>
        </ConfirmProvider>
      </DuncitLocalizationProvider>
    </MockedProvider>,
  );
}

const USER_ID = 'u-1';

/** Re-declared to match UserBadgesSection's own private query document exactly. */
const USER_BADGES = gql`
  query AdminUserBadges($user_id: ID!) {
    userBadges(user_id: $user_id) {
      id
      awarded_at
      badge {
        id
        title
        description
        image_url
      }
    }
  }
`;

/** Re-declared to match UserSurveysSection's own private query document exactly. */
const USER_SURVEYS = gql`
  query AdminUserSurveys($user_id: ID!) {
    userSurveyResponses(user_id: $user_id) {
      kind
      submitted_at
      items { qid label type answer }
    }
  }
`;

const userDoc = (over: Record<string, unknown> = {}) => ({
  __typename: 'User',
  user_id: USER_ID,
  first_name: 'Riya',
  last_name: 'Sharma',
  full_name: 'Riya Sharma',
  email: 'riya@example.com',
  is_email_verified: true,
  phone_number: '9876543210',
  phone_extension: '+91',
  is_phone_verified: false,
  whatsapp_number: '',
  whatsapp_extension: '',
  whatsapp_verified_at: null,
  country: 'India',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  zone: 'West',
  assigned_city: 'Pune',
  assigned_zones: ['West'],
  profile_photo: '',
  bio: 'Loves pods',
  profile_links: [],
  interest_category_ids: [],
  interest_categories: [],
  status: 'ACTIVE',
  roles: ['USER', 'HOST'],
  dob: '1995-04-02',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-02T00:00:00.000Z',
  ...over,
});

const rolesDoc = [
  { __typename: 'Role', id: 'r1', key: 'USER', name: 'User', description: '', is_system: true },
  { __typename: 'Role', id: 'r2', key: 'HOST', name: 'Host', description: 'Runs pods', is_system: false },
];

const userMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: USER, variables: { user_id: USER_ID } },
  result: { data: { user: userDoc(over), roles: rolesDoc } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const hostProfileMock = (): MockedResponse => ({
  request: { query: USER_HOST_PROFILE, variables: { user_id: USER_ID } },
  result: { data: { hostByUser: null } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const badgesMock = (): MockedResponse => ({
  request: { query: USER_BADGES, variables: { user_id: USER_ID } },
  result: { data: { userBadges: [] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const surveysMock = (): MockedResponse => ({
  request: { query: USER_SURVEYS, variables: { user_id: USER_ID } },
  result: { data: { userSurveyResponses: [] } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const healthMock = (): MockedResponse => ({
  request: { query: USER_ACCOUNT_HEALTH, variables: () => true },
  result: {
    data: {
      userAccountHealth: {
        __typename: 'HealthScore',
        subject_type: 'USER',
        subject_id: USER_ID,
        subject_label: 'Riya Sharma',
        base_score: 100,
        delta_sum: 0,
        total_score: 100,
        band: 'GREEN',
        adjustments: [],
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const activityMock = (): MockedResponse => ({
  request: { query: USER_ACTIVITY_YEAR, variables: () => true },
  result: {
    data: {
      userActivityYear: {
        __typename: 'UserActivityYear',
        user_id: USER_ID,
        year: new Date().getFullYear(),
        available_years: [new Date().getFullYear()],
        total_visits: 0,
        days: [],
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const fullMocks = () => [
  userMock(),
  hostProfileMock(),
  badgesMock(),
  surveysMock(),
  healthMock(),
  activityMock(),
];

afterEach(() => {
  __setTableRows([]);
  vi.useRealTimers();
});

describe('UserDetailsPage — loading, error and not-found', () => {
  it('shows a spinner while the user is still loading', () => {
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: [{ ...userMock(), delay: 60_000 }, hostProfileMock()],
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('shows the query error instead of the page when the user fails to load', async () => {
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: [
        { request: { query: USER, variables: { user_id: USER_ID } }, error: new Error('Server unreachable') },
        hostProfileMock(),
      ],
    });

    await waitFor(() => expect(screen.getByText('Server unreachable')).toBeInTheDocument());
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows "not found" when the server has no user for this id', async () => {
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: [
        { request: { query: USER, variables: { user_id: USER_ID } }, result: { data: { user: null, roles: [] } } },
        hostProfileMock(),
      ],
    });

    await waitFor(() => expect(screen.getByText('User not found.')).toBeInTheDocument());
  });

  it('shows "not found" when the route carries no user id at all', () => {
    renderPage(<UserDetailsPage />, {
      path: '/users-without-param',
      initialEntries: ['/users-without-param'],
      mocks: [],
    });

    expect(screen.getByText('User not found.')).toBeInTheDocument();
  });
});

describe('UserDetailsPage — header, summary card and the default tab', () => {
  it('renders the header and summary card once loaded, with Profile active by default', async () => {
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: fullMocks(),
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Riya Sharma' })).toBeInTheDocument());
    // Summary card.
    expect(screen.getByText('riya@example.com')).toBeInTheDocument();
    // Profile tab's own content, proving it is the tab shown by default.
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });
});

describe('UserDetailsPage — tab switching', () => {
  it('wires the Interests tab to the loaded user, with no network of its own', async () => {
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: fullMocks(),
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Riya Sharma' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Interests' }));

    expect(screen.getByText('No survey interests saved yet.')).toBeInTheDocument();
  });

  it('wires the Access tab to RolesSection, opening and closing the Roles dialog', async () => {
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: fullMocks(),
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Riya Sharma' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Access' }));
    expect(screen.getByText('Host')).toBeInTheDocument(); // role chip from roleByKey

    fireEvent.click(screen.getByRole('button', { name: 'Manage Roles' }));
    expect(screen.getByText('Choose which portals this user can access. Granting a portal gives full access to it.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        screen.queryByText('Choose which portals this user can access. Granting a portal gives full access to it.'),
      ).toBeNull(),
    );
  });

  it('mounts the right section for every remaining tab, each scoped to the resolved user id', async () => {
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: fullMocks(),
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Riya Sharma' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Badges' }));
    await waitFor(() => expect(screen.getByText('No badges earned yet.')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Verification' }));
    await waitFor(() => expect(tableFetchCalls.extraVariables).toEqual({ user_id: USER_ID }));

    fireEvent.click(screen.getByRole('tab', { name: 'Surveys' }));
    await waitFor(() =>
      expect(screen.getByText("This user hasn't submitted any onboarding survey yet.")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Health' }));
    await waitFor(() => expect(screen.getByText('Account Health')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));
    await waitFor(() => expect(screen.getByText('App Visit Activity')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Call & Email Logs' }));
    await waitFor(() => expect(tableFetchCalls.extraVariables).toEqual({ user_id: USER_ID }));

    fireEvent.click(screen.getByRole('tab', { name: 'User Change Logs' }));
    await waitFor(() => expect(tableFetchCalls.extraVariables).toEqual({ user_id: USER_ID }));
  });

  it("falls back to the route's user id when the loaded user has none of its own", async () => {
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: [userMock({ user_id: '' }), hostProfileMock(), badgesMock(), surveysMock(), healthMock(), activityMock()],
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Riya Sharma' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: 'Verification' }));

    await waitFor(() => expect(tableFetchCalls.extraVariables).toEqual({ user_id: USER_ID }));
  });
});

describe('UserDetailsPage — header actions and dialogs', () => {
  it('opens the contact dialog on Call with type CALL, and on Email with type EMAIL', async () => {
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: fullMocks(),
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Riya Sharma' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Call' }));
    expect(screen.getByText('Contact type: CALL')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Stub close' }));
    expect(screen.queryByTestId('contact-dialog-stub')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    expect(screen.getByText('Contact type: EMAIL')).toBeInTheDocument();
  });

  it('toasts on a saved contact action, and the toast auto-hides', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: fullMocks(),
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Riya Sharma' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Call' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stub save' }));

    await waitFor(() => expect(screen.getByText('Contact log saved')).toBeInTheDocument());

    await vi.advanceTimersByTimeAsync(3000);
    await waitFor(() => expect(screen.queryByText('Contact log saved')).toBeNull());
  });

  it('opens the delete confirmation from the header, and Cancel closes it', async () => {
    renderPage(<UserDetailsPage />, {
      path: '/users/:user_id',
      initialEntries: [`/users/${USER_ID}`],
      mocks: fullMocks(),
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Riya Sharma' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete this user?')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
