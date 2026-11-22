import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeliverySettingsForm from './delivery-settings.form';
import {
  BLANK_DELIVERY_SETTINGS,
  makeDeliverySettingsSchema,
  toDeliveryInput,
  toDeliveryValues,
  type DeliverySettingsValues,
} from './delivery-settings.types';
import { makeDeliverySettings } from '../../../../../__tests__/mocks/gift-card-order.mock';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;
const schema = makeDeliverySettingsSchema(t);
const valid = toDeliveryValues(makeDeliverySettings());
const errorsOf = (values: DeliverySettingsValues) => {
  const result = schema.safeParse(values);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('makeDeliverySettingsSchema', () => {
  it('accepts the stored policy', () => {
    expect(errorsOf(valid)).toEqual({});
  });

  it('never lets printed cards switch on without a delivery fee', () => {
    expect(errorsOf({ ...valid, shipping_fee: '0' })).toEqual({ shipping_fee: 'loyalty.giftSettings.feeRequired' });
    expect(errorsOf({ ...valid, physical_enabled: false, shipping_fee: '0' })).toEqual({});
  });

  it('refuses a negative or missing fee', () => {
    expect(errorsOf({ ...valid, shipping_fee: '-5' })).toEqual({ shipping_fee: 'loyalty.giftSettings.feeInvalid' });
    expect(errorsOf({ ...valid, shipping_fee: '' })).toEqual({ shipping_fee: 'loyalty.giftSettings.feeInvalid' });
  });

  it.each([['0'], ['51'], ['2.5']])('refuses %j cards per order', (max_quantity) => {
    expect(errorsOf({ ...valid, max_quantity })).toEqual({
      max_quantity: 'loyalty.giftSettings.maxQuantityInvalid({"max":50})',
    });
  });

  it('keeps the parcel inside the courier bounds', () => {
    expect(errorsOf({ ...valid, parcel_weight_kg: '0.01', parcel_height_cm: '121', pickup_location: 'p'.repeat(121) })).toEqual({
      parcel_weight_kg: 'loyalty.giftSettings.measureInvalid({"min":0.05,"max":50})',
      parcel_height_cm: 'loyalty.giftSettings.measureInvalid({"min":0.5,"max":120})',
      pickup_location: 'loyalty.giftSettings.pickupMax({"max":120})',
    });
  });
});

describe('delivery mappers', () => {
  it('reads blank before the settings load and round-trips them after', () => {
    expect(toDeliveryValues(null)).toEqual(BLANK_DELIVERY_SETTINGS);
    expect(toDeliveryInput({ ...valid, pickup_location: '  Duncit HQ  ' })).toEqual(makeDeliverySettings());
  });
});

describe('DeliverySettingsForm', () => {
  it('saves the delivery policy', async () => {
    const onSubmit = vi.fn();
    render(<DeliverySettingsForm settings={makeDeliverySettings()} busy={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Delivery fee'), { target: { value: '120' } });
    fireEvent.click(screen.getByTestId('delivery-settings-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(makeDeliverySettings({ shipping_fee: 120 })));
  });

  it('switching printed cards on with no fee is refused on the field', async () => {
    const onSubmit = vi.fn();
    render(<DeliverySettingsForm settings={makeDeliverySettings({ physical_enabled: false, shipping_fee: 0 })} busy={false} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByLabelText('Members can order printed cards'));
    fireEvent.click(screen.getByTestId('delivery-settings-save'));
    expect(await screen.findByText('Set a delivery fee before switching printed cards on.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a read-only seat the policy without a save button', () => {
    render(<DeliverySettingsForm settings={null} busy={false} readOnly onSubmit={vi.fn()} />);
    expect(screen.queryByTestId('delivery-settings-save')).toBeNull();
    expect(screen.getByLabelText('Delivery fee')).toBeDisabled();
  });
});
