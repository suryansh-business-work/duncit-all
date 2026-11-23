import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrderAddressForm from './order-address.form';
import { makeOrderAddressSchema, orderAddressValues } from './order-address.types';
import { makeOrder } from '../../../../../__tests__/mocks/gift-card-order.mock';

const t = (key: string) => key;
const address = makeOrder().shipping_address;

describe('makeOrderAddressSchema', () => {
  it('accepts the order’s own ship-to and refuses what a courier cannot deliver to', () => {
    const schema = makeOrderAddressSchema(t);
    expect(schema.safeParse(orderAddressValues(address)).success).toBe(true);
    const bad = schema.safeParse({ ...orderAddressValues(address), pincode: '5600', phone: '12345' });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map((i) => i.path[0]).sort()).toEqual(['phone', 'pincode']);
  });

  it('starts blank, in India, when the order has no address', () => {
    expect(orderAddressValues(null)).toMatchObject({ name: '', line1: '', country: 'India' });
  });
});

describe('OrderAddressForm', () => {
  it('saves a corrected address', async () => {
    const onSubmit = vi.fn();
    render(<OrderAddressForm open address={address} busy={false} onCancel={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/^Pincode/), { target: { value: '560025' } });
    fireEvent.click(screen.getByTestId('order-address-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ pincode: '560025', city: 'Bengaluru' })));
  });

  it('refuses a short pincode on the field and shows the server’s refusal', async () => {
    const onSubmit = vi.fn();
    render(<OrderAddressForm open address={address} busy={false} errorMessage="Address rejected" onCancel={vi.fn()} onSubmit={onSubmit} />);
    expect(screen.getByText('Address rejected')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Pincode/), { target: { value: '12' } });
    fireEvent.click(screen.getByTestId('order-address-submit'));
    await waitFor(() => expect(screen.getByLabelText(/^Pincode/)).toHaveAttribute('aria-invalid', 'true'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('starts from the order’s address on every opening and cancels', () => {
    const onCancel = vi.fn();
    const { rerender } = render(<OrderAddressForm open={false} address={address} busy={false} onCancel={onCancel} onSubmit={vi.fn()} />);
    rerender(<OrderAddressForm open address={address} busy={false} onCancel={onCancel} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/^City/)).toHaveValue('Bengaluru');
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
