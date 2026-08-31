/**
 * The gate every host-facing pod write goes through.
 *
 * A pod used to be screened only when it was published, so an edit could rename
 * a clean pod into a dirty one and nothing looked again. What matters here is
 * that the write does NOT happen when the check refuses, that each refusal is
 * pinned on the field carrying it, and that a refusal the server raises as it
 * writes is read the same way as one the preflight caught.
 */
import type { ReactNode } from 'react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { render, renderHook, screen, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ContentCheckAlert from '../src/ContentCheckAlert';
import { useContentCheck } from '../src/useContentCheck';
import { MODERATE_POD_CONTENT } from '../src/queries';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { useHostPodActionsConfig } from '../src/HostPodActionsProvider';
import { hostActionsConfig } from './host-actions-config';

const violation = (over: Partial<{ field: string; type: string; message: string; evidence: string | null }> = {}) => ({
  __typename: 'PodContentViolation',
  field: 'pod_title',
  type: 'PROFANITY',
  message: 'The title uses language the guidelines do not allow',
  evidence: null,
  ...over,
});

const moderateMock = (
  result: { allowed: boolean; violations: unknown[] } | null,
  over: Partial<MockedResponse> = {},
): MockedResponse =>
  ({
    request: { query: MODERATE_POD_CONTENT, variables: () => true },
    result: { data: { moderatePodContent: result } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    ...over,
  }) as MockedResponse;

const mount = (mocks: readonly MockedResponse[], setFieldError = vi.fn()) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={[...mocks]}>
      {children}
    </MockedProvider>
  );
  return { setFieldError, ...renderHook(() => useContentCheck(setFieldError), { wrapper }) };
};

describe('useContentCheck', () => {
  it('writes once the check comes back clean', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const { result } = mount([moderateMock({ allowed: true, violations: [] })]);

    let ok = false;
    await act(async () => {
      ok = await result.current.run({ pod_title: 'Sunday Badminton' }, write);
    });

    expect(ok).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(result.current.blocked).toEqual([]);
    expect(result.current.failure).toBeNull();
  });

  it('does not write what the check refused, and pins each rule on its field', async () => {
    const write = vi.fn();
    const setFieldError = vi.fn();
    const { result } = mount(
      [
        moderateMock({
          allowed: false,
          violations: [
            violation(),
            violation({ field: 'pod_description', message: 'The description names a competitor' }),
            violation({ field: 'image', message: 'That picture is not allowed' }),
          ],
        }),
      ],
      setFieldError,
    );

    let ok = true;
    await act(async () => {
      ok = await result.current.run({ pod_title: 'x' }, write);
    });

    expect(ok).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(result.current.blocked).toHaveLength(3);
    expect(setFieldError).toHaveBeenCalledWith('pod_title', {
      type: 'moderation',
      message: 'The title uses language the guidelines do not allow',
    });
    expect(setFieldError).toHaveBeenCalledWith('pod_description', expect.anything());
    // A media violation lands on the gallery field the form actually has.
    expect(setFieldError).toHaveBeenCalledWith('media_text', expect.anything());
  });

  // Anything the form has no box for is still listed in the alert, but there is
  // no field to pin it on.
  it('lists a violation with no field of its own without pinning it anywhere', async () => {
    const setFieldError = vi.fn();
    const { result } = mount(
      [moderateMock({ allowed: false, violations: [violation({ field: 'pod_hashtag' })] })],
      setFieldError,
    );

    await act(async () => {
      await result.current.run({}, vi.fn());
    });

    expect(result.current.blocked).toHaveLength(1);
    expect(setFieldError).not.toHaveBeenCalled();
  });

  it('writes when the check answered with nothing at all', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const { result } = mount([moderateMock(null)]);

    let ok = false;
    await act(async () => {
      ok = await result.current.run({}, write);
    });

    expect(ok).toBe(true);
    expect(write).toHaveBeenCalled();
  });

  // The server re-runs the deterministic rules as it writes, so a refusal can
  // still land here — a stale tab, or a rule the preflight did not hit.
  it('reads a refusal the WRITE raised the same way as one the check caught', async () => {
    const setFieldError = vi.fn();
    const write = vi.fn().mockRejectedValue({
      message: 'Your pod content violates the community guidelines',
      graphQLErrors: [
        {
          message: 'refused',
          extensions: { code: 'POD_CONTENT_REJECTED', violations: [violation()] },
        },
      ],
    });
    const { result } = mount([moderateMock({ allowed: true, violations: [] })], setFieldError);

    let ok = true;
    await act(async () => {
      ok = await result.current.run({}, write);
    });

    expect(ok).toBe(false);
    expect(result.current.blocked).toHaveLength(1);
    expect(result.current.failure).toBeNull();
    expect(setFieldError).toHaveBeenCalledWith('pod_title', expect.anything());
  });

  it('states any other failure as a message rather than as a content refusal', async () => {
    const { result } = mount([
      moderateMock(null, { result: undefined, error: new Error('The check timed out') }),
    ]);

    let ok = true;
    await act(async () => {
      ok = await result.current.run({}, vi.fn());
    });

    expect(ok).toBe(false);
    expect(result.current.blocked).toEqual([]);
    expect(result.current.failure).toBeTruthy();
  });

  it('clears what a previous attempt refused before checking again', async () => {
    const { result } = mount([
      moderateMock({ allowed: false, violations: [violation()] }),
    ]);
    await act(async () => {
      await result.current.run({}, vi.fn());
    });
    expect(result.current.blocked).toHaveLength(1);

    act(() => result.current.clear());

    expect(result.current.blocked).toEqual([]);
    expect(result.current.failure).toBeNull();
  });
});

describe('ContentCheckAlert', () => {
  it('lists one line per rule broken, in the server wording', () => {
    render(
      <ContentCheckAlert
        title="Your pod content violates the community guidelines"
        violations={[
          violation(),
          violation({ field: 'pod_description', message: 'The description names a competitor' }),
        ]}
      />,
    );

    expect(screen.getByTestId('pod-content-check')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('The title uses language the guidelines do not allow')).toBeInTheDocument();
  });

  it('quotes the evidence beside the rule when the server sent some', () => {
    const { container } = render(
      <ContentCheckAlert title="Refused" violations={[violation({ evidence: 'free beer' })]} />,
    );

    expect(container.textContent).toContain('free beer');
  });

  it('renders nothing at all when nothing was refused', () => {
    const { container } = render(<ContentCheckAlert title="Refused" violations={[]} />);

    expect(container.innerHTML).toBe('');
  });
});

describe('useHostPodActionsConfig', () => {
  // A dialog rendered outside the provider would silently lose its media picker
  // and show untranslated keys — a broken feature rather than a missing mount.
  it('refuses to answer outside the provider rather than falling back to defaults', () => {
    expect(() => renderHook(() => useHostPodActionsConfig())).toThrow(
      /HostPodActionsProvider/,
    );
  });

  it('hands the config straight back inside it', () => {
    const config = hostActionsConfig();
    const { result } = renderHook(() => useHostPodActionsConfig(), {
      wrapper: ({ children }) => (
        <HostPodActionsProvider {...config}>{children}</HostPodActionsProvider>
      ),
    });

    expect(result.current.linkBaseUrl).toBe('https://duncit.com');
    expect(result.current.labels).toBe(config.labels);
  });
});
