/**
 * The Security Verification screen as a whole, with its logic stubbed so each
 * state of it can be put on the page: loading, failed to load, the full screen,
 * and the button that stays shut until it should open.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@duncit/app-settings', async (orig) => ({
  ...(await orig<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (value: string) => `FMT(${value})` }),
}));

const hook = vi.hoisted(() => ({ value: {} as Record<string, unknown>, options: undefined as unknown }));
vi.mock('../src/security-verification/useSecurityVerification', () => ({
  useSecurityVerification: (options: unknown) => {
    hook.options = options;
    return hook.value;
  },
}));

import { SecurityVerificationScreen } from '../src/security-verification/SecurityVerificationScreen';

const challenge = (over: Record<string, unknown> = {}) => ({
  portal_key: 'finance',
  reverify: false,
  policy_version: 'v1',
  notice_version: 'n1',
  retention_days: 180,
  user_name: 'Asha Rao',
  sections: [{ key: 'security', title: 'Security policy', paragraphs: ['Only approved people.'] }],
  links: [],
  detected: {
    ip: '203.0.113.9',
    country: 'IN',
    region: 'KA',
    city: 'Bengaluru',
    ip_location_is_approximate: true,
    browser: 'Chrome',
    os: 'Windows',
    device_type: 'DESKTOP',
    user_agent: 'Mozilla/5.0',
    server_time: '2026-11-23T10:00:00.000Z',
  },
  exception: null,
  ...over,
});

function setHook(over: Record<string, unknown> = {}) {
  hook.value = {
    challenge: challenge(),
    loading: false,
    loadError: null,
    reload: vi.fn(),
    consent: { authorized_person: false, credentials_not_shared: false, policies_acknowledged: false, location_consent: false },
    setConsent: vi.fn(),
    geo: { status: 'idle', fix: null, request: vi.fn() },
    alternative: { exception: null, request: vi.fn(), requesting: false, error: null },
    usingException: false,
    blockers: { acknowledgements: true, location: true },
    canProceed: false,
    submitting: false,
    submitError: null,
    submit: vi.fn(),
    ...over,
  };
  return hook.value as { reload: () => void; submit: () => void; setConsent: () => void };
}

const mount = (props: { onVerified?: () => void } = {}) => {
  const onSignOut = vi.fn();
  render(<SecurityVerificationScreen portalName="Duncit Finance" onSignOut={onSignOut} {...props} />);
  return onSignOut;
};

beforeEach(() => {
  hook.options = undefined;
  setHook();
});

describe('SecurityVerificationScreen — before it can be shown', () => {
  it('shows a spinner while the wording and the detected details load', () => {
    setHook({ challenge: null, loading: true });
    mount();
    expect(screen.getByRole('status', { name: 'Loading security verification' })).toBeInTheDocument();
    expect(screen.queryByTestId('security-proceed')).not.toBeInTheDocument();
  });

  it('says why it could not load, and offers a retry and the way out', async () => {
    const state = setHook({ challenge: null, loadError: 'Network down' });
    const onSignOut = mount();
    const failed = screen.getByTestId('security-load-failed');
    expect(within(failed).getByRole('alert')).toHaveTextContent('Network down');

    const u = userEvent.setup();
    await u.click(within(failed).getByRole('button', { name: 'Try again' }));
    expect(state.reload).toHaveBeenCalledTimes(1);
    await u.click(within(failed).getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('has a plain message of its own when the failure has no reason to give', () => {
    setHook({ challenge: null, loadError: null });
    mount();
    expect(screen.getByRole('alert')).toHaveTextContent('We could not load the security verification. Please try again.');
  });
});

describe('SecurityVerificationScreen — the screen', () => {
  it('puts the portal, the warning, what was detected, the location, the policies and the confirmations on one page', () => {
    mount();
    expect(screen.getByRole('heading', { level: 1, name: 'Security Verification & Location Tracking' })).toBeInTheDocument();
    expect(screen.getByText(/Before you open Duncit Finance, confirm who you are/)).toBeInTheDocument();
    expect(screen.getByTestId('security-warning-banner')).toBeInTheDocument();
    expect(screen.getByTestId('security-detected-ip')).toHaveTextContent('203.0.113.9');
    expect(screen.getByTestId('security-location')).toBeInTheDocument();
    expect(screen.getByText('Only approved people.')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    expect(screen.getByTestId('security-proceed')).toHaveTextContent('Proceed & Store IP and Location');
  });

  it('says so only when the terms changed since the person last verified', () => {
    mount();
    expect(screen.queryByTestId('security-reverify')).not.toBeInTheDocument();
  });

  it('says the terms changed when they did', () => {
    setHook({ challenge: challenge({ reverify: true }) });
    mount();
    expect(screen.getByTestId('security-reverify')).toHaveTextContent(/updated its security terms/);
  });

  it('keeps the button shut, and says what is missing, until the acknowledgements are made', () => {
    setHook({ blockers: { acknowledgements: true, location: true }, canProceed: false });
    mount();
    const proceed = screen.getByTestId('security-proceed');
    expect(proceed).toBeDisabled();
    expect(screen.getByText('Complete the confirmations above to continue.')).toBeInTheDocument();
    expect(proceed).toHaveAttribute('aria-describedby', 'security-proceed-hint');
  });

  it('then says a location (or an approved alternative) is what is missing', () => {
    setHook({ blockers: { acknowledgements: false, location: true }, canProceed: false });
    mount();
    expect(screen.getByText(/Share your current location and give your location consent/)).toBeInTheDocument();
    expect(screen.getByTestId('security-proceed')).toBeDisabled();
  });

  it('opens the button, with nothing left to explain, when everything holds', async () => {
    const state = setHook({ blockers: { acknowledgements: false, location: false }, canProceed: true });
    mount();
    const proceed = screen.getByTestId('security-proceed');
    expect(proceed).toBeEnabled();
    expect(proceed).not.toHaveAttribute('aria-describedby');
    expect(document.getElementById('security-proceed-hint')).toBeNull();

    await userEvent.setup().click(proceed);
    expect(state.submit).toHaveBeenCalledTimes(1);
  });

  it('shows that it is storing, and locks the way out, while the verification is sent', () => {
    setHook({ blockers: { acknowledgements: false, location: false }, canProceed: false, submitting: true });
    mount();
    expect(screen.getByTestId('security-proceed')).toHaveTextContent('Storing…');
    expect(screen.getByTestId('security-sign-out')).toBeDisabled();
  });

  it('shows why the server refused', () => {
    setHook({ submitError: 'You do not have access to this portal' });
    mount();
    expect(screen.getByTestId('security-submit-error')).toHaveTextContent('You do not have access to this portal');
  });

  it('lets anyone who should not be here sign out and close the page', async () => {
    const onSignOut = mount();
    expect(screen.getByText(/Not authorized to use this portal\? Sign out and close this page\./)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByTestId('security-sign-out'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('passes what to do once verified on to its logic', () => {
    const onVerified = vi.fn();
    mount({ onVerified });
    expect(hook.options).toEqual({ onVerified });
  });
});
