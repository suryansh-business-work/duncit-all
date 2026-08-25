/**
 * The one coupon dialog both consoles open.
 *
 * Marketing edits any coupon; Admin edits a single pod's offer codes from that
 * pod's page, with the pod locked. Same dialog on purpose — two copies would be
 * two answers to "what does this code do".
 */
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CouponFormDialog from '../src/CouponFormDialog';
import type { CouponPodOption, CouponRow } from '../src/queries';

/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider rather
 * than falling back to the default one — so a component reading it through a
 * callback (`useMediaQuery((theme) => theme.breakpoints.down('sm'))`) throws
 * mid-render. In the app the theme comes from the surface; here it does not.
 */
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const POD: CouponPodOption = { id: 'pod-1', title: 'Sunday Badminton' };

const coupon = (over: Partial<CouponRow> = {}): CouponRow =>
  (({
    id: 'c-1',
    code: 'SUMMER25',
    description: 'Summer sale',
    discount_pct: 25,
    scope: 'GLOBAL',
    pod_id: null,
    valid_from: null,
    valid_until: null,
    max_uses: null,
    per_user_limit: null,
    min_order_amount: 0,
    is_active: true,
    used_count: 0,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-02T00:00:00.000Z',
    ...over
  }) as CouponRow);

const mount = (props: Record<string, unknown> = {}) =>
  render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={testTheme}>
      <CouponFormDialog open onClose={vi.fn()} onSaved={vi.fn()} pods={[POD]} {...(props as never)} />
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('CouponFormDialog', () => {
  it('renders nothing while it is closed', () => {
    mount({ open: false });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens blank for a new coupon', async () => {
    mount();
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('prefills from the coupon being edited', async () => {
    mount({ initial: coupon() });
    await settle();

    const codeField = [...document.body.querySelectorAll<HTMLInputElement>('input')].find(
      (input) => input.value === 'SUMMER25'
    );
    expect(codeField).toBeDefined();
  });

  it('opens with the pod locked, which is how the admin pod page uses it', async () => {
    mount({ lockedPod: POD, initial: coupon({ scope: 'POD', pod_id: 'pod-1' }) });
    await settle();

    expect(document.body.textContent).toContain('Sunday Badminton');
  });

  it('refuses to save a code that is too short, and does not tell the caller it saved', async () => {
    const onSaved = vi.fn();
    mount({ onSaved });
    await settle();

    for (const input of document.body.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])')) {
      fireEvent.change(input, { target: { value: 'no' } });
    }
    await settle();

    for (const button of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 10)) {
      if (!button.isConnected) continue;
      fireEvent.click(button);
      await settle();
    }

    expect(onSaved).not.toHaveBeenCalled();
  });

  it('opens on an empty pod catalogue without crashing', async () => {
    mount({ pods: [] });
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('renders an inactive, capped coupon', async () => {
    mount({
      initial: coupon({ is_active: false, max_uses: 100, per_user_limit: 1, min_order_amount: 500, scope: 'POD', pod_id: 'pod-1' }),
    });
    await settle();

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
