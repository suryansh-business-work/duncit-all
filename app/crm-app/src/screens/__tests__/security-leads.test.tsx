import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/utils/errors';
import { blockers, NO_CONSENT } from '../auth/security/useSecurityVerification';
import { SecurityVerificationScreen } from '../auth/SecurityVerificationScreen';
import { LeadsScreen } from '../leads/LeadsScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNav }));

const request = gqlRequest as jest.Mock;
const challenge = {
  policy_version: 'v3',
  reverify: false,
  user_name: 'Asha',
  sections: [{ key: 'monitoring', title: 'Monitoring', paragraphs: ['We record sign-ins.'] }],
  exception: null,
};
const allConsent = {
  authorized_person: true,
  credentials_not_shared: true,
  policies_acknowledged: true,
  location_consent: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks keeps queued once-values; a test that stops early must not hand its answers to the next.
  (Location.requestForegroundPermissionsAsync as jest.Mock)
    .mockReset()
    .mockResolvedValue({ granted: false, canAskAgain: true });
  (Location.getCurrentPositionAsync as jest.Mock).mockReset();
});

describe('Security Verification rules', () => {
  it('blocks until every statement is confirmed and a location (or approved alternative) is given', () => {
    const fix = { latitude: 1, longitude: 2, accuracy_meters: 5 };
    expect(blockers(NO_CONSENT, null, false)).toEqual({ acknowledgements: true, location: true });
    expect(blockers(allConsent, null, false)).toEqual({ acknowledgements: false, location: true });
    expect(blockers({ ...allConsent, location_consent: false }, fix, false).location).toBe(true);
    expect(blockers(allConsent, fix, false)).toEqual({ acknowledgements: false, location: false });
    expect(blockers({ ...allConsent, location_consent: false }, null, true).location).toBe(false);
  });
});

describe('SecurityVerificationScreen', () => {
  it('shows the policy and submits consent with the current location for the new session', async () => {
    const completeSecurity = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ completeSecurity });
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: true,
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 18.5, longitude: 73.8, accuracy: 12 },
    });
    request.mockImplementation(async (_doc: unknown, vars?: { input?: unknown }) =>
      vars?.input
        ? { submitPortalSecurityVerification: { token: 'verified' } }
        : { portalSecurityChallenge: challenge },
    );
    renderWithTheme(<SecurityVerificationScreen />);
    expect(await screen.findByText('We record sign-ins.')).toBeOnTheScreen();
    for (const key of Object.keys(allConsent))
      fireEvent(screen.getByTestId(`consent-${key}`), 'onCheckedChange', true);
    await act(async () => fireEvent.press(screen.getByTestId('security-location')));
    await act(async () => fireEvent.press(screen.getByTestId('security-proceed')));
    await waitFor(() => expect(completeSecurity).toHaveBeenCalledWith('verified'));
    const input = request.mock.calls.find((c) => c[1]?.input)?.[1].input;
    expect(input).toMatchObject({
      policy_version: 'v3',
      consent: allConsent,
      location: { latitude: 18.5, longitude: 73.8, accuracy_meters: 12 },
      exception_id: null,
    });
  });

  it('explains a refused location and lets the person ask an administrator instead', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });
    request.mockImplementation(async (_doc: unknown, vars?: { input?: { reason?: string } }) =>
      vars?.input?.reason
        ? {
            requestPortalSecurityException: {
              id: 'e1',
              status: 'PENDING',
              reason: vars.input.reason,
              decision_note: null,
              expires_at: null,
            },
          }
        : { portalSecurityChallenge: challenge },
    );
    renderWithTheme(<SecurityVerificationScreen />);
    // Find outside act: inside it React holds the loaded challenge back until act returns.
    const share = await screen.findByTestId('security-location');
    await act(async () => fireEvent.press(share));
    expect(screen.getByText(/Location access is off for Duncit CRM/)).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('security-reason'), 'My GPS chip is broken today');
    await act(async () => fireEvent.press(screen.getByTestId('security-alternative')));
    expect(await screen.findByText(/with an administrator/)).toBeOnTheScreen();
    expect(request.mock.calls.at(-1)?.[1]).toEqual({
      input: { reason: 'My GPS chip is broken today', location_error: 'PERMISSION_DENIED' },
    });
  });

  it('asks again with the new wording when the policy changed underneath', async () => {
    useAuthStore.setState({ completeSecurity: jest.fn() });
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: true,
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 1, longitude: 1, accuracy: null },
    });
    let submits = 0;
    let loads = 0;
    request.mockImplementation(async (_doc: unknown, vars?: { input?: unknown }) => {
      if (!vars?.input) {
        loads += 1;
        return { portalSecurityChallenge: challenge };
      }
      submits += 1;
      throw new ApiError('The policy changed', 409, { code: 'POLICY_CHANGED' });
    });
    renderWithTheme(<SecurityVerificationScreen />);
    await screen.findByText('We record sign-ins.');
    for (const key of Object.keys(allConsent))
      fireEvent(screen.getByTestId(`consent-${key}`), 'onCheckedChange', true);
    await act(async () => fireEvent.press(screen.getByTestId('security-location')));
    await act(async () => fireEvent.press(screen.getByTestId('security-proceed')));
    expect(await screen.findByText('The policy changed')).toBeOnTheScreen();
    expect(submits).toBe(1);
    // The new wording was fetched, and Proceed is blocked until it is confirmed again.
    expect(loads).toBe(2);
    expect(screen.getByText('Complete the confirmations above to continue.')).toBeOnTheScreen();
  });
});

describe('LeadsScreen', () => {
  it('searches every kind, narrows to one, and opens a lead', async () => {
    request.mockResolvedValue({
      searchCrmLeads: {
        total: 1,
        page: 1,
        page_size: 25,
        rows: [
          {
            entity_type: 'CREATOR_LEAD',
            id: 'c1',
            name: 'Riya Runs',
            city: 'Mumbai',
            lead_status: 'New',
            phones: [],
          },
        ],
      },
    });
    renderWithTheme(<LeadsScreen />);
    expect(await screen.findByText('Riya Runs', {}, { timeout: 2000 })).toBeOnTheScreen();
    expect(screen.getByText('1 lead')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('leads-kind-CREATOR_LEAD'));
    fireEvent.changeText(screen.getByTestId('leads-search'), 'riya');
    await waitFor(
      () =>
        expect(request.mock.calls.at(-1)?.[1].input).toMatchObject({
          search: 'riya',
          entity_types: ['CREATOR_LEAD'],
          page: 1,
        }),
      { timeout: 2000 },
    );
    fireEvent.press(screen.getByTestId('lead-row-c1'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadDetail', { kind: 'CREATOR_LEAD', id: 'c1' });
  });

  it('shows the error with a retry, and the empty state', async () => {
    request
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ searchCrmLeads: { total: 0, page: 1, page_size: 25, rows: [] } });
    renderWithTheme(<LeadsScreen />);
    fireEvent.press(await screen.findByTestId('state-retry', {}, { timeout: 2000 }));
    expect(await screen.findByText('No leads match.')).toBeOnTheScreen();
  });
});
