/**
 * What the dialog SENDS, and what it tells the admin when the server refuses.
 *
 * useMutation is stood in for directly so the create / update documents and
 * their variables can be asserted, and so the failure shapes (a message, an
 * empty object, nothing at all) can be driven without a transport.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CouponFormDialog from '../src/CouponFormDialog';
import { CREATE_COUPON, UPDATE_COUPON } from '../src/queries';
import type { CouponRow } from '../src/queries';

const h = vi.hoisted(() => ({
  mutate: vi.fn(),
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useMutation: (document: unknown) => [(options: unknown) => h.mutate(document, options)],
  };
});

vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: (props: Record<string, any>) => (
    <div>
      <button onClick={() => props.onChange(new Date(2026, 8, 1))}>set-date-{props.label}</button>
    </div>
  ),
}));

const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

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

const mount = (props: Record<string, unknown> = {}) => {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <ThemeProvider theme={testTheme}>
      <CouponFormDialog open onClose={onClose} onSaved={onSaved} pods={[]} {...(props as never)} />
    </ThemeProvider>
  );
  return { onClose, onSaved };
};

beforeEach(() => {
  vi.clearAllMocks();
  h.mutate.mockResolvedValue({ data: {} });
});

describe('saving a coupon', () => {
  it('creates a new coupon and hands the win back to the caller', async () => {
    const { onClose, onSaved } = mount();
    await settle();

    fireEvent.change(screen.getByRole('textbox', { name: /Code/ }), { target: { value: 'summer25' } });
    fireEvent.click(screen.getByRole('button', { name: 'set-date-Valid from' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await settle();

    expect(h.mutate).toHaveBeenCalledTimes(1);
    const [document, options] = h.mutate.mock.calls[0];
    expect(document).toBe(CREATE_COUPON);
    expect((options as { variables: { input: Record<string, unknown> } }).variables.input).toMatchObject({
      code: 'SUMMER25',
      scope: 'GLOBAL',
      pod_id: null,
      valid_from: new Date('2026-09-01').toISOString(),
      valid_until: null,
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('updates the coupon being edited under its id', async () => {
    const { onSaved } = mount({ initial: coupon() });
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();

    const [document, options] = h.mutate.mock.calls[0];
    expect(document).toBe(UPDATE_COUPON);
    expect(options).toMatchObject({ variables: { id: 'c-1' } });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows the server refusal and does not close', async () => {
    h.mutate.mockRejectedValue(new Error('Coupon code already exists'));
    const { onClose, onSaved } = mount({ initial: coupon() });
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();

    expect(screen.getByRole('alert')).toHaveTextContent('Coupon code already exists');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to the localized save-failed copy when the refusal has no message', async () => {
    h.mutate.mockRejectedValue({});
    mount({ initial: coupon() });
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();

    expect(screen.getByRole('alert')).toHaveTextContent('Could not save coupon');
  });

  it('survives a rejection carrying nothing at all', async () => {
    h.mutate.mockRejectedValue(null);
    mount({ initial: coupon() });
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();

    expect(screen.getByRole('alert')).toHaveTextContent('Could not save coupon');
  });
});
