/**
 * The edit dialog's discount context: the admin's max % from the ONE shared
 * `PublicAppSettings` operation, with the default standing in until it answers.
 */
import type { ReactNode } from 'react';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { DEFAULT_TICKET_DISCOUNT_MAX_PCT } from '@duncit/utils';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { useQuery } from '@apollo/client/react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePodEditTicketDiscount } from '../src/usePodEditTicketDiscount';
import type { HostPodTarget } from '../src/types';

const pod = {
  id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  pod_type: 'PAID',
  pod_amount: 499,
  ticket_discount_enabled: true,
  ticket_discount_tiers: [{ min_tickets: 2, discount_pct: 10 }],
} as HostPodTarget;

const settings = (publicAppSettings: Record<string, unknown> | null): MockedResponse => ({
  request: { query: PUBLIC_APP_SETTINGS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      publicAppSettings: publicAppSettings && {
        __typename: 'PublicAppSettings',
        date_format: 'dd MMM yyyy',
        time_format: 'hh:mm a',
        time_zone: 'Asia/Kolkata',
        time_source: 'SERVER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: null,
        min_signup_age: 18,
        draft_retention_days: 30,
        ...publicAppSettings,
      },
    },
  },
});

/**
 * Mounts the hook beside a watcher on the same (deduplicated) settings query,
 * so a test can wait for the answer to land rather than pass on the default.
 */
const hook = (target: HostPodTarget | null, mocks: readonly MockedResponse[]) => {
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      {children}
    </MockedProvider>
  );
  return renderHook(
    () => ({
      discount: usePodEditTicketDiscount(target),
      settings: useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first', skip: !target }),
    }),
    { wrapper },
  );
};

describe('usePodEditTicketDiscount', () => {
  it('has no context, and asks nothing of the server, without a pod', () => {
    const { result } = hook(null, []);

    expect(result.current.discount).toBeNull();
  });

  it('uses the default max while the settings load', () => {
    const { result } = hook(pod, [settings({ ticket_discount_max_pct: 30 })]);

    expect(result.current.discount?.maxPct).toBe(DEFAULT_TICKET_DISCOUNT_MAX_PCT);
  });

  it("caps a tier at the admin's max once the settings answer", async () => {
    const { result } = hook(pod, [settings({ ticket_discount_max_pct: 30 })]);

    await waitFor(() => expect(result.current.discount?.maxPct).toBe(30));
    expect(result.current.discount).toMatchObject({
      free: false,
      stored: { ticket_discount_enabled: true },
    });
  });

  it('keeps the default when the admin never set a max', async () => {
    const { result } = hook(pod, [settings({ ticket_discount_max_pct: null })]);

    await waitFor(() => expect(result.current.settings.data).toBeDefined());
    expect(result.current.discount?.maxPct).toBe(DEFAULT_TICKET_DISCOUNT_MAX_PCT);
  });

  it('keeps the default when the settings come back empty', async () => {
    const { result } = hook(pod, [settings(null)]);

    await waitFor(() => expect(result.current.settings.data).toBeDefined());
    expect(result.current.discount?.maxPct).toBe(DEFAULT_TICKET_DISCOUNT_MAX_PCT);
  });
});
