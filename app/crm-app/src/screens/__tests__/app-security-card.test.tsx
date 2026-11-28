import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as docs from '@/graphql/crmAppSettings';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { ApiError } from '@/utils/errors';
import { AppSecurityCard } from '../settings/AppSecurityCard';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

/** Settings › Sign-in security: the CRM portal's switch for Security Verification at app sign-in. */

const request = gqlRequest as jest.Mock;
const WAIT = { timeout: 3000 };
const SWITCH = 'app-security-verification';

/** Answers the read with `stored`, and each save with what it was asked (or `saveError`). */
function serve(stored: boolean | Error, saveError?: Error) {
  request.mockImplementation(async (doc: unknown, vars: { input?: { security_verification: boolean } } = {}) => {
    if (doc === docs.CrmAppSecuritySettingsDocument) {
      if (stored instanceof Error) throw stored;
      return { crmAppSettings: { security_verification: stored } };
    }
    if (doc === docs.CrmAppUpdateSecuritySettingsDocument) {
      if (saveError) throw saveError;
      return { updateCrmAppSettings: { security_verification: vars.input?.security_verification } };
    }
    throw new Error('unexpected request');
  });
}

const saves = () => request.mock.calls.filter(([d]) => d === docs.CrmAppUpdateSecuritySettingsDocument);

beforeEach(() => jest.clearAllMocks());

describe('AppSecurityCard', () => {
  it('shows the switch on while the app asks, with what it does', async () => {
    serve(true);
    renderWithTheme(<AppSecurityCard />);

    expect(await screen.findByTestId(SWITCH, {}, WAIT)).toBeChecked();
    expect(screen.getByText('Sign-in security')).toBeOnTheScreen();
    expect(screen.getByText(/the CRM web portal always asks/)).toBeOnTheScreen();
  });

  it('asks before turning it off, and changes nothing when the person cancels', async () => {
    serve(true);
    renderWithTheme(<AppSecurityCard />);

    const toggle = await screen.findByTestId(SWITCH, {}, WAIT);

    await act(async () => fireEvent.press(toggle));
    expect(screen.getByText('Stop asking for Security Verification on the app?')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('app-security-confirm-cancel')));

    expect(screen.queryByText('Stop asking for Security Verification on the app?')).toBeNull();
    expect(screen.getByTestId(SWITCH)).toBeChecked();
    expect(saves()).toHaveLength(0);
  });

  it('turns it off once confirmed, and says so', async () => {
    serve(true);
    renderWithTheme(<AppSecurityCard />);

    const toggle = await screen.findByTestId(SWITCH, {}, WAIT);

    await act(async () => fireEvent.press(toggle));
    await act(async () => fireEvent.press(screen.getByTestId('app-security-confirm-confirm')));

    await waitFor(
      () =>
        expect(
          screen.getByText('The Duncit CRM app will no longer ask for Security Verification at sign-in.'),
        ).toBeOnTheScreen(),
      WAIT,
    );
    expect(saves()).toEqual([
      [docs.CrmAppUpdateSecuritySettingsDocument, { input: { security_verification: false } }],
    ]);
    expect(screen.getByTestId(SWITCH)).not.toBeChecked();
    expect(screen.queryByText('Stop asking for Security Verification on the app?')).toBeNull();
  });

  it('turns it back on without asking', async () => {
    serve(false);
    renderWithTheme(<AppSecurityCard />);

    const toggle = await screen.findByTestId(SWITCH, {}, WAIT);
    expect(toggle).not.toBeChecked();
    await act(async () => fireEvent.press(toggle));

    await waitFor(
      () => expect(screen.getByText('The Duncit CRM app will ask for Security Verification at sign-in.')).toBeOnTheScreen(),
      WAIT,
    );
    expect(screen.queryByText('Stop asking for Security Verification on the app?')).toBeNull();
    expect(screen.getByTestId(SWITCH)).toBeChecked();
  });

  it('keeps the dialog open with the reason when turning it off is refused', async () => {
    serve(true, new ApiError('Access Denied'));
    renderWithTheme(<AppSecurityCard />);

    const toggle = await screen.findByTestId(SWITCH, {}, WAIT);

    await act(async () => fireEvent.press(toggle));
    await act(async () => fireEvent.press(screen.getByTestId('app-security-confirm-confirm')));

    expect(await screen.findByTestId('app-security-confirm-error', {}, WAIT)).toHaveTextContent('Access Denied');
    expect(screen.getByText('Stop asking for Security Verification on the app?')).toBeOnTheScreen();
    expect(screen.getByTestId(SWITCH)).toBeChecked();
  });

  it('says why turning it on failed, and leaves it off', async () => {
    serve(false, new ApiError('Access Denied'));
    renderWithTheme(<AppSecurityCard />);

    const toggle = await screen.findByTestId(SWITCH, {}, WAIT);

    await act(async () => fireEvent.press(toggle));

    expect(await screen.findByText('Access Denied', {}, WAIT)).toBeOnTheScreen();
    expect(screen.getByTestId(SWITCH)).not.toBeChecked();
  });

  it('says when the setting could not be loaded, without a switch', async () => {
    serve(new ApiError(''));
    renderWithTheme(<AppSecurityCard />);

    expect(await screen.findByText('The sign-in security setting could not be loaded.', {}, WAIT)).toBeOnTheScreen();
    expect(screen.queryByTestId(SWITCH)).toBeNull();
  });
});
