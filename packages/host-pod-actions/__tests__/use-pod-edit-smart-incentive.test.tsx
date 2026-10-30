/**
 * The edit dialog's Smart Incentive context: Loyalty's programme settings from
 * one cache-first read, standing in as "off" with @duncit/utils' limits until
 * the server answers.
 */
import type { ReactNode } from 'react';
import { DEFAULT_SMART_INCENTIVE_DELAY_SECONDS, DEFAULT_SMART_INCENTIVE_MAX_PCT } from '@duncit/utils';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SMART_INCENTIVE_SETTINGS } from '../src/queries';
import { usePodEditSmartIncentive } from '../src/usePodEditSmartIncentive';
import type { HostPodTarget } from '../src/types';

/** ₹499 a ticket, offering 15% to members who linger on its page. */
const pod: HostPodTarget = {
  id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  pod_type: 'PAID',
  pod_amount: 499,
  smart_incentive_enabled: true,
  smart_incentive_pct: 15,
};

const settings = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: SMART_INCENTIVE_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      smartIncentiveSettings: {
        __typename: 'SmartIncentiveSettings',
        enabled: true,
        delay_seconds: 20,
        max_discount_pct: 30,
        ...over,
      },
    },
  },
});

const hook = (target: HostPodTarget | null, mocks: readonly MockedResponse[]) => {
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      {children}
    </MockedProvider>
  );
  return renderHook(() => usePodEditSmartIncentive(target), { wrapper });
};

describe('usePodEditSmartIncentive', () => {
  it('has no context without a pod', () => {
    const { result } = hook(null, []);

    expect(result.current).toBeNull();
  });

  // Read as off until Loyalty answers, so the editor never flashes up for a
  // programme that turns out to be switched off.
  it('reads the programme as off, with the default limits, while the settings load', () => {
    const { result } = hook(pod, [settings()]);

    expect(result.current?.programme).toEqual({
      enabled: false,
      maxPct: DEFAULT_SMART_INCENTIVE_MAX_PCT,
      delaySeconds: DEFAULT_SMART_INCENTIVE_DELAY_SECONDS,
    });
  });

  it("takes Loyalty's switch, maximum and delay once the settings answer", async () => {
    const { result } = hook(pod, [settings()]);

    await waitFor(() => expect(result.current?.programme.enabled).toBe(true));
    expect(result.current).toEqual({
      free: false,
      programme: { enabled: true, maxPct: 30, delaySeconds: 20 },
      stored: { smart_incentive_enabled: true, smart_incentive_pct: '15' },
    });
  });

  it('keeps the programme off when Loyalty has switched it off', async () => {
    const { result } = hook(pod, [settings({ enabled: false, max_discount_pct: 10 })]);

    await waitFor(() => expect(result.current?.programme.maxPct).toBe(10));
    expect(result.current?.programme.enabled).toBe(false);
  });
});
