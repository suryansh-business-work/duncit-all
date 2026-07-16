import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import PaymentSection from '../../src/sections/PaymentSection';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormData, PodFormValues } from '../../src/types';

const FINANCE = { platform_fee_pct: 10, gst_pct: 18, currency_symbol: '₹' };

function renderPayment(data: PodFormData, defaults: Partial<PodFormValues> = {}) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness data={data} defaultValues={defaults} methodsRef={methodsRef}>
      <PaymentSection />
    </Harness>,
  );
  return methodsRef;
}

describe('PaymentSection', () => {
  it('changes the pod type and zeroes the amount for a free type', async () => {
    const user = userEvent.setup();
    const ref = renderPayment(makeData(), { pod_type: 'NATIVE_PAID', pod_amount: 500 });
    await user.click(screen.getByLabelText(/Pod type/));
    await user.click(await screen.findByRole('option', { name: 'Native · Free' }));
    expect(ref.current?.getValues('pod_type')).toBe('NATIVE_FREE');
    expect(ref.current?.getValues('pod_amount')).toBe(0);
  });

  it('changes the occurrence', async () => {
    const user = userEvent.setup();
    const ref = renderPayment(makeData());
    await user.click(screen.getByLabelText(/Occurrence/));
    await user.click(await screen.findByRole('option', { name: 'Weekly' }));
    expect(ref.current?.getValues('pod_occurrence')).toBe('WEEKLY');
  });

  it('edits the amount and spots for a paid pod', async () => {
    const user = userEvent.setup();
    const ref = renderPayment(makeData(), { pod_type: 'NATIVE_PAID' });
    const amount = screen.getByLabelText(/Amount/);
    await user.clear(amount);
    await user.type(amount, '750');
    const spots = screen.getByLabelText(/No. of spots/);
    await user.clear(spots);
    await user.type(spots, '30');
    expect(ref.current?.getValues('pod_amount')).toBe(750);
    expect(ref.current?.getValues('no_of_spots')).toBe(30);
  });

  it('disables the amount for a free pod', () => {
    renderPayment(makeData(), { pod_type: 'NATIVE_FREE' });
    expect(screen.getByLabelText(/Amount/)).toBeDisabled();
  });

  it('coerces non-numeric amount and spots to zero', async () => {
    const user = userEvent.setup();
    const ref = renderPayment(makeData(), { pod_type: 'NATIVE_PAID', pod_amount: 5, no_of_spots: 5 });
    await user.clear(screen.getByLabelText(/Amount/));
    await user.clear(screen.getByLabelText(/No. of spots/));
    expect(ref.current?.getValues('pod_amount')).toBe(0);
    expect(ref.current?.getValues('no_of_spots')).toBe(0);
  });

  it('shows the finance breakdown for a paid pod when finance is enabled', () => {
    const data = makeData({ config: makeConfig({ showFinance: true, showInventory: true }), finance: FINANCE });
    renderPayment(data, { pod_type: 'NATIVE_PAID', pod_amount: 500, products_enabled: false });
    expect(screen.getByText('User pays')).toBeInTheDocument();
  });

  it('feeds product cost into the breakdown when inventory + products are on', () => {
    const data = makeData({
      config: makeConfig({ showFinance: true, showInventory: true }),
      finance: FINANCE,
      products: [{ id: 'p1', unit_cost: 100 }],
    });
    renderPayment(data, {
      pod_type: 'NATIVE_PAID',
      pod_amount: 500,
      products_enabled: true,
      product_requests: [{ product_id: 'p1', quantity: 2 }],
    });
    expect(screen.getByText('Product cost / spot')).toBeInTheDocument();
  });

  it('hides the breakdown for a free pod even with finance enabled', () => {
    const data = makeData({ config: makeConfig({ showFinance: true }), finance: FINANCE });
    renderPayment(data, { pod_type: 'NATIVE_FREE', pod_amount: 0 });
    expect(screen.queryByText('User pays')).not.toBeInTheDocument();
  });

  it('toggles the active switch while editing when the flag is on', async () => {
    const user = userEvent.setup();
    const data = makeData({ config: makeConfig({ showIsActive: true }) });
    const ref = renderPayment(data, { pod_id: 'pod-1', is_active: true });
    expect(screen.getByText('Active')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    expect(ref.current?.getValues('is_active')).toBe(false);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('hides the active switch when creating a new pod', () => {
    const data = makeData({ config: makeConfig({ showIsActive: true }) });
    renderPayment(data, { pod_id: '' });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('renders the place charges editor for a physical pod', () => {
    const data = makeData({ config: makeConfig({ showPlaceCharges: true }) });
    renderPayment(data, { pod_mode: 'PHYSICAL' });
    expect(screen.getByText('Place charges')).toBeInTheDocument();
  });

  it('hides place charges for a virtual pod', () => {
    const data = makeData({ config: makeConfig({ showPlaceCharges: true }) });
    renderPayment(data, { pod_mode: 'VIRTUAL' });
    expect(screen.queryByText('Place charges')).not.toBeInTheDocument();
  });

  it('shows amount and spot validation errors', () => {
    const ref = renderPayment(makeData(), { pod_type: 'NATIVE_PAID' });
    act(() => {
      ref.current?.setError('pod_amount', { type: 'custom', message: 'Amount cannot exceed 1999' });
      ref.current?.setError('no_of_spots', { type: 'custom', message: 'Spots must be a number' });
    });
    expect(screen.getByText('Amount cannot exceed 1999')).toBeInTheDocument();
    expect(screen.getByText('Spots must be a number')).toBeInTheDocument();
  });
});
