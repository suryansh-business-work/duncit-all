/**
 * The logic of the Security Verification screen, without the screen: when the
 * button may be pressed, exactly what is sent, what happens to the session
 * token, and the way through when a location cannot be shared.
 */
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apollo = vi.hoisted(() => ({ useQuery: vi.fn(), useMutation: vi.fn() }));
vi.mock('@apollo/client/react', () => apollo);
vi.mock('@duncit/utils', async (orig) => ({
  ...(await orig<typeof import('@duncit/utils')>()),
  parseApiError: (error: { message?: string }) => `PARSED:${error?.message ?? ''}`,
}));
const geo = vi.hoisted(() => ({
  status: 'idle' as string,
  fix: null as null | { latitude: number; longitude: number; accuracy: number },
  request: vi.fn(),
}));
vi.mock('../src/security-verification/useGeolocation', async (orig) => ({
  ...(await orig<typeof import('../src/security-verification/useGeolocation')>()),
  useGeolocation: () => geo,
}));

import { ShellRuntimeProvider } from '../src/lib/runtime';
import type { ExceptionStatus } from '../src/security-verification/documents';
import {
  PORTAL_SECURITY_CHALLENGE,
  PORTAL_SECURITY_EXCEPTION,
  REQUEST_PORTAL_SECURITY_EXCEPTION,
  SUBMIT_PORTAL_SECURITY_VERIFICATION,
} from '../src/security-verification/documents';
import { useAlternativeVerification } from '../src/security-verification/useAlternativeVerification';
import { useSecurityVerification } from '../src/security-verification/useSecurityVerification';

const exception = (over: Partial<ExceptionStatus> = {}): ExceptionStatus => ({
  id: 'ex-1',
  status: 'PENDING',
  reason: 'My laptop has no location service',
  decision_note: null,
  created_at: '2026-11-23T10:00:00.000Z',
  decided_at: null,
  expires_at: null,
  ...over,
});

const challenge = (over: Record<string, unknown> = {}) => ({
  portal_key: 'finance',
  reverify: false,
  policy_version: 'v1',
  notice_version: 'n1',
  retention_days: 180,
  user_name: 'Asha Rao',
  sections: [],
  links: [],
  detected: { ip: '203.0.113.9', server_time: '2026-11-23T10:00:00.000Z', ip_location_is_approximate: true },
  exception: null,
  ...over,
});

const refetch = vi.fn();
const submitMutation = vi.fn();
const requestMutation = vi.fn();
const view = {
  data: { portalSecurityChallenge: challenge() } as { portalSecurityChallenge: unknown } | undefined,
  loading: false,
  error: undefined as unknown,
  polled: undefined as unknown,
  submitting: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  geo.status = 'idle';
  geo.fix = null;
  Object.assign(view, {
    data: { portalSecurityChallenge: challenge() },
    loading: false,
    error: undefined,
    polled: undefined,
    submitting: false,
  });
  apollo.useQuery.mockImplementation((document: unknown) =>
    document === PORTAL_SECURITY_CHALLENGE
      ? { data: view.data, loading: view.loading, error: view.error, refetch }
      : { data: view.polled },
  );
  apollo.useMutation.mockImplementation((document: unknown) =>
    document === SUBMIT_PORTAL_SECURITY_VERIFICATION
      ? [submitMutation, { loading: view.submitting }]
      : [requestMutation, { loading: false }],
  );
  localStorage.clear();
});

const withRuntime = ({ children }: { children: ReactNode }) => (
  <ShellRuntimeProvider graphqlUrl="https://api.test/graphql" tokenKey="finance_token">
    {children}
  </ShellRuntimeProvider>
);

const ACKNOWLEDGED = ['authorized_person', 'credentials_not_shared', 'policies_acknowledged'] as const;
const FIX = { latitude: 12.9716, longitude: 77.5946, accuracy: 18.5 };

function tickEverything(result: { current: ReturnType<typeof useSecurityVerification> }) {
  act(() => {
    for (const key of [...ACKNOWLEDGED, 'location_consent'] as const) result.current.setConsent(key, true);
  });
}

describe('useSecurityVerification — when the button may be pressed', () => {
  it('starts with nothing ticked and nothing allowed', () => {
    const { result } = renderHook(() => useSecurityVerification(), { wrapper: withRuntime });
    expect(result.current.consent).toEqual({
      authorized_person: false,
      credentials_not_shared: false,
      policies_acknowledged: false,
      location_consent: false,
    });
    expect(result.current.canProceed).toBe(false);
    expect(result.current.blockers).toEqual({ acknowledgements: true, location: true });
  });

  it('is not enough to tick the acknowledgements: a location is still needed', () => {
    const { result } = renderHook(() => useSecurityVerification(), { wrapper: withRuntime });
    act(() => ACKNOWLEDGED.forEach((key) => result.current.setConsent(key, true)));
    expect(result.current.blockers).toEqual({ acknowledgements: false, location: true });
    expect(result.current.canProceed).toBe(false);
  });

  it('is not enough to have a fix: the person must also consent to sharing it', () => {
    geo.status = 'granted';
    geo.fix = FIX;
    const { result } = renderHook(() => useSecurityVerification(), { wrapper: withRuntime });
    act(() => ACKNOWLEDGED.forEach((key) => result.current.setConsent(key, true)));
    expect(result.current.canProceed).toBe(false);

    act(() => result.current.setConsent('location_consent', true));
    expect(result.current.canProceed).toBe(true);
    expect(result.current.blockers).toEqual({ acknowledgements: false, location: false });
  });

  it('needs every acknowledgement, not most of them', () => {
    geo.status = 'granted';
    geo.fix = FIX;
    const { result } = renderHook(() => useSecurityVerification(), { wrapper: withRuntime });
    tickEverything(result);
    expect(result.current.canProceed).toBe(true);
    act(() => result.current.setConsent('credentials_not_shared', false));
    expect(result.current.canProceed).toBe(false);
    expect(result.current.blockers.acknowledgements).toBe(true);
  });

  it('lets an administrator-approved alternative stand in for the location', () => {
    view.data = { portalSecurityChallenge: challenge({ exception: exception({ status: 'APPROVED' }) }) };
    const { result } = renderHook(() => useSecurityVerification(), { wrapper: withRuntime });
    act(() => ACKNOWLEDGED.forEach((key) => result.current.setConsent(key, true)));
    expect(result.current.usingException).toBe(true);
    expect(result.current.canProceed).toBe(true);
  });

  it.each(['PENDING', 'REJECTED', 'USED', 'EXPIRED'] as const)('does not accept an alternative that is %s', (status) => {
    view.data = { portalSecurityChallenge: challenge({ exception: exception({ status }) }) };
    const { result } = renderHook(() => useSecurityVerification(), { wrapper: withRuntime });
    act(() => ACKNOWLEDGED.forEach((key) => result.current.setConsent(key, true)));
    expect(result.current.usingException).toBe(false);
    expect(result.current.canProceed).toBe(false);
  });

  it('allows nothing while what to show has not loaded, and reports why it failed', () => {
    view.data = undefined;
    view.loading = true;
    const { result, rerender } = renderHook(() => useSecurityVerification(), { wrapper: withRuntime });
    expect(result.current.challenge).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.loadError).toBeNull();
    expect(result.current.canProceed).toBe(false);

    view.loading = false;
    view.error = new Error('Network down');
    rerender();
    expect(result.current.loadError).toBe('PARSED:Network down');

    act(() => {
      result.current.reload();
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe('useSecurityVerification — sending it', () => {
  const ready = () => {
    geo.status = 'granted';
    geo.fix = FIX;
    const onVerified = vi.fn();
    const hook = renderHook(() => useSecurityVerification({ onVerified }), { wrapper: withRuntime });
    tickEverything(hook.result);
    return { ...hook, onVerified };
  };

  it('sends the consent, the fix and the version that was on screen, then keeps the new session and moves on', async () => {
    submitMutation.mockResolvedValue({ data: { submitPortalSecurityVerification: { token: 'new-session-token' } } });
    const { result, onVerified } = ready();

    await act(async () => result.current.submit());

    expect(submitMutation).toHaveBeenCalledWith({
      variables: {
        input: {
          policy_version: 'v1',
          consent: { authorized_person: true, credentials_not_shared: true, policies_acknowledged: true, location_consent: true },
          location: { latitude: 12.9716, longitude: 77.5946, accuracy_meters: 18.5 },
          exception_id: null,
          client: { timezone: expect.any(String), language: expect.any(String), platform: null },
        },
      },
    });
    expect(localStorage.getItem('finance_token')).toBe('new-session-token');
    expect(onVerified).toHaveBeenCalledTimes(1);
    expect(result.current.submitError).toBeNull();
  });

  it('sends the approved alternative and no location, even when a fix was taken', async () => {
    submitMutation.mockResolvedValue({ data: { submitPortalSecurityVerification: { token: 't' } } });
    view.data = { portalSecurityChallenge: challenge({ exception: exception({ status: 'APPROVED' }) }) };
    const { result } = ready();

    await act(async () => result.current.submit());

    const input = submitMutation.mock.calls[0]![0].variables.input;
    expect(input.exception_id).toBe('ex-1');
    expect(input.location).toBeNull();
  });

  it('says what the browser reports about itself, and nothing when it reports nothing', async () => {
    submitMutation.mockResolvedValue({ data: { submitPortalSecurityVerification: { token: 't' } } });
    const format = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () => ({ resolvedOptions: () => ({ timeZone: '' }) }) as unknown as Intl.DateTimeFormat,
    );
    const language = vi.spyOn(navigator, 'language', 'get').mockReturnValue('');
    Object.defineProperty(navigator, 'userAgentData', { configurable: true, value: { platform: 'Windows' } });
    try {
      const { result } = ready();
      await act(async () => result.current.submit());
      expect(submitMutation.mock.calls[0]![0].variables.input.client).toEqual({
        timezone: null,
        language: null,
        platform: 'Windows',
      });
    } finally {
      format.mockRestore();
      language.mockRestore();
      Reflect.deleteProperty(navigator, 'userAgentData');
    }
  });

  it('does nothing when pressed while it is not allowed', async () => {
    const { result } = renderHook(() => useSecurityVerification(), { wrapper: withRuntime });
    await act(async () => result.current.submit());
    expect(submitMutation).not.toHaveBeenCalled();
  });

  it('does nothing when there is no console to keep the session in', async () => {
    geo.status = 'granted';
    geo.fix = FIX;
    const { result } = renderHook(() => useSecurityVerification());
    tickEverything(result);
    await act(async () => result.current.submit());
    expect(submitMutation).not.toHaveBeenCalled();
  });

  it('shows the refusal and keeps the old token when the server says no', async () => {
    submitMutation.mockRejectedValue(new Error('Access Denied'));
    const { result, onVerified } = ready();

    await act(async () => result.current.submit());

    expect(result.current.submitError).toBe('PARSED:Access Denied');
    expect(localStorage.getItem('finance_token')).toBeNull();
    expect(onVerified).not.toHaveBeenCalled();
    // Still allowed: the person can try again.
    expect(result.current.canProceed).toBe(true);
  });

  it.each([
    ['an answer with no data', {}],
    ['an answer with an empty token', { data: { submitPortalSecurityVerification: { token: '' } } }],
  ])('treats %s as a failure rather than a session', async (_name, answer) => {
    submitMutation.mockResolvedValue(answer);
    const { result, onVerified } = ready();

    await act(async () => result.current.submit());

    expect(result.current.submitError).toBe('PARSED:We could not start your session. Please try again.');
    expect(localStorage.getItem('finance_token')).toBeNull();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('starts over when the terms changed while the person was reading: new wording, empty boxes', async () => {
    submitMutation.mockRejectedValue(
      Object.assign(new Error('The terms changed'), { errors: [{ message: 'changed', extensions: { code: 'POLICY_CHANGED' } }] }),
    );
    const { result } = ready();
    expect(result.current.consent.authorized_person).toBe(true);

    await act(async () => result.current.submit());

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(result.current.consent).toEqual({
      authorized_person: false,
      credentials_not_shared: false,
      policies_acknowledged: false,
      location_consent: false,
    });
    expect(result.current.submitError).toBe('PARSED:The terms changed');
  });

  it('reloads the page at the same address by default, so the new session starts clean', async () => {
    submitMutation.mockResolvedValue({ data: { submitPortalSecurityVerification: { token: 't' } } });
    geo.status = 'granted';
    geo.fix = FIX;
    const { result } = renderHook(() => useSecurityVerification(), { wrapper: withRuntime });
    tickEverything(result);

    const reload = vi.fn();
    const original = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', { configurable: true, value: { href: 'http://localhost/', reload } });
    try {
      await act(async () => result.current.submit());
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      if (original) Object.defineProperty(window, 'location', original);
    }
  });
});

describe('useAlternativeVerification', () => {
  const exceptionQuery = () => {
    const call = apollo.useQuery.mock.calls.filter(([document]) => document === PORTAL_SECURITY_EXCEPTION).at(-1);
    return call![1] as { skip: boolean; pollInterval: number };
  };

  it('watches a request that is waiting, so an approval shows up without a reload', () => {
    renderHook(() => useAlternativeVerification(exception({ status: 'PENDING' }), 'denied'));
    expect(exceptionQuery()).toMatchObject({ skip: false, pollInterval: 10_000 });
  });

  it.each(['APPROVED', 'REJECTED', 'USED', 'EXPIRED'] as const)('stops watching once it is %s', (status) => {
    renderHook(() => useAlternativeVerification(exception({ status }), 'denied'));
    expect(exceptionQuery()).toMatchObject({ skip: true, pollInterval: 0 });
  });

  it('has nothing to watch before a request is made', () => {
    const { result } = renderHook(() => useAlternativeVerification(null, 'idle'));
    expect(exceptionQuery()).toMatchObject({ skip: true, pollInterval: 0 });
    expect(result.current.exception).toBeNull();
  });

  it('shows the newer answer for the same request, and ignores an answer about an older one', () => {
    view.polled = { portalSecurityException: exception({ status: 'APPROVED' }) };
    const same = renderHook(() => useAlternativeVerification(exception({ status: 'PENDING' }), 'denied'));
    expect(same.result.current.exception?.status).toBe('APPROVED');

    view.polled = { portalSecurityException: exception({ id: 'older', status: 'REJECTED' }) };
    const other = renderHook(() => useAlternativeVerification(exception({ status: 'PENDING' }), 'denied'));
    expect(other.result.current.exception?.status).toBe('PENDING');
  });

  it('records the request with the reason the browser gave, and shows it as waiting', async () => {
    requestMutation.mockResolvedValue({ data: { requestPortalSecurityException: exception({ id: 'new' }) } });
    const { result } = renderHook(() => useAlternativeVerification(null, 'denied'));

    await act(async () => result.current.request('The browser blocked it'));

    expect(requestMutation).toHaveBeenCalledWith({
      variables: { input: { reason: 'The browser blocked it', location_error: 'PERMISSION_DENIED' } },
    });
    expect(result.current.exception?.id).toBe('new');
    expect(result.current.error).toBeNull();
  });

  it('sends no browser reason when nothing failed, and keeps what it had when the answer is empty', async () => {
    requestMutation.mockResolvedValue({});
    const { result } = renderHook(() => useAlternativeVerification(exception({ status: 'REJECTED' }), 'idle'));

    await act(async () => result.current.request('Another reason entirely'));

    expect(requestMutation.mock.calls[0]![0].variables.input.location_error).toBeNull();
    expect(result.current.exception?.status).toBe('REJECTED');
  });

  it('reports why a request failed, hands the failure back to the form, and clears it on the next try', async () => {
    requestMutation.mockRejectedValueOnce(new Error('Too many requests'));
    const { result } = renderHook(() => useAlternativeVerification(null, 'timeout'));

    await act(async () => {
      await expect(result.current.request('A fine reason')).rejects.toThrow('Too many requests');
    });
    expect(result.current.error).toBe('PARSED:Too many requests');

    requestMutation.mockResolvedValueOnce({ data: { requestPortalSecurityException: exception() } });
    await act(async () => result.current.request('A fine reason'));
    expect(result.current.error).toBeNull();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
