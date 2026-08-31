/**
 * The one coupon dialog both consoles open.
 *
 * Marketing edits any coupon; Admin edits a single pod's offer codes from that
 * pod's page, with the pod locked. Same dialog on purpose — two copies would be
 * two answers to "what does this code do".
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CouponFormDialog from '../src/CouponFormDialog';
import type { CouponPodOption, CouponRow } from '../src/queries';

// The validity dates are MUI X pickers, which need a LocalizationProvider the
// surface supplies. Standing in for the picker keeps the test free of one and
// lets the picked / cleared branches be driven directly (the repo-wide pattern).
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: (props: Record<string, any>) => (
    <div>
      <span data-testid={`date-value-${props.label}`}>
        {props.value ? `${props.value.getFullYear()}-${props.value.getMonth() + 1}-${props.value.getDate()}` : 'null'}
      </span>
      <button onClick={() => props.onChange(new Date(2026, 8, 1))}>set-date</button>
      <button onClick={() => props.onChange(null)}>clear-date</button>
    </div>
  ),
}));

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

const inputWithValue = (value: string) =>
  [...document.body.querySelectorAll<HTMLInputElement>('input')].find((input) => input.value === value);

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

    expect(screen.getByRole('dialog')).toHaveTextContent('New coupon');
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByTestId('date-value-Valid from')).toHaveTextContent('null');
  });

  it('prefills from the coupon being edited', async () => {
    mount({ initial: coupon() });
    await settle();

    expect(screen.getByRole('dialog')).toHaveTextContent('Edit coupon');
    expect(inputWithValue('SUMMER25')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('prefills the validity window as calendar days, not instants', async () => {
    mount({
      initial: coupon({ valid_from: '2026-08-10T00:00:00.000Z', valid_until: '2026-08-31T00:00:00.000Z' }),
    });
    await settle();

    expect(screen.getByTestId('date-value-Valid from')).toHaveTextContent('2026-8-10');
    expect(screen.getByTestId('date-value-Valid until')).toHaveTextContent('2026-8-31');
  });

  it('opens with the pod locked, which is how the admin pod page uses it', async () => {
    mount({ lockedPod: POD, initial: coupon({ scope: 'POD', pod_id: 'pod-1' }) });
    await settle();

    expect(document.body.textContent).toContain('Sunday Badminton');
  });

  it('locks a NEW coupon onto the pod it was opened for', async () => {
    mount({ lockedPod: POD });
    await settle();

    expect(screen.getByRole('dialog')).toHaveTextContent('New coupon');
    expect(document.body.textContent).toContain('Sunday Badminton');
  });

  it('offers the pod catalogue when a pod-scoped coupon is edited without a lock', async () => {
    mount({ initial: coupon({ scope: 'POD', pod_id: 'pod-1' }) });
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

  it('shows the localized code rule under the field once a bad code is submitted', async () => {
    mount();
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await settle();

    expect(screen.getByRole('dialog')).toHaveTextContent('Code must be 3-30 chars: A-Z, 0-9, - or _');
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

    expect(document.body.querySelector('input[type="checkbox"]')).not.toBeChecked();
    expect(inputWithValue('100')).toBeDefined();
    expect(inputWithValue('500')).toBeDefined();
  });

  it('flips the live flag from the switch', async () => {
    mount();
    await settle();

    const active = document.body.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(active).toBeChecked();

    fireEvent.click(active);
    await settle();

    expect(active).not.toBeChecked();
  });

  it('picks and clears a validity date through the picker', async () => {
    mount();
    await settle();

    fireEvent.click(screen.getAllByRole('button', { name: 'set-date' })[0]);
    await settle();
    expect(screen.getByTestId('date-value-Valid from')).toHaveTextContent('2026-9-1');

    fireEvent.click(screen.getAllByRole('button', { name: 'clear-date' })[0]);
    await settle();
    expect(screen.getByTestId('date-value-Valid from')).toHaveTextContent('null');
  });

  it('resets onto the next coupon when the caller swaps what is being edited', async () => {
    const view = mount({ initial: coupon() });
    await settle();
    expect(inputWithValue('SUMMER25')).toBeDefined();

    view.rerender(
      <MockedProvider mocks={[]}>
        <ThemeProvider theme={testTheme}>
          <CouponFormDialog open onClose={vi.fn()} onSaved={vi.fn()} pods={[POD]} initial={coupon({ code: 'WINTER10' })} />
        </ThemeProvider>
      </MockedProvider>
    );
    await settle();

    expect(inputWithValue('WINTER10')).toBeDefined();
    expect(inputWithValue('SUMMER25')).toBeUndefined();
  });

  it('hands cancel back to the caller', async () => {
    const onClose = vi.fn();
    mount({ onClose });
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
