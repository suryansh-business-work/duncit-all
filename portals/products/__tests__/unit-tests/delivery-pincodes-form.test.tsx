import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  DeliveryPincodesForm,
  deliveryPincodesInitialValues,
  makeDeliveryPincodesSchema,
  parsePincodes,
} from '../../src/pages/catalog-brands/delivery-pincodes/delivery-pincodes-form';

const t = (key: string, options?: { vars?: Record<string, unknown> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeDeliveryPincodesSchema(t as never);
const messages = (pincodes: string) => {
  const result = schema.safeParse({ pincodes });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('parsePincodes', () => {
  it('splits on newlines, commas, spaces and tabs, trimming and de-duplicating in order', () => {
    expect(parsePincodes('411001,\n560001\t411001  110001 ')).toEqual(['411001', '560001', '110001']);
  });

  it('returns nothing for blank input', () => {
    expect(parsePincodes('  \n , ')).toEqual([]);
    expect(parsePincodes('')).toEqual([]);
  });
});

describe('delivery pincodes schema', () => {
  it('starts empty', () => {
    expect(deliveryPincodesInitialValues).toEqual({ pincodes: '' });
  });

  it('accepts a list of valid 6-digit pincodes', () => {
    expect(schema.safeParse({ pincodes: '411001\n560001' }).success).toBe(true);
  });

  it('requires at least one pincode', () => {
    expect(messages('  ,\n')).toEqual(['products.deliveryPincodes.required']);
  });

  it('names only the first five invalid entries', () => {
    expect(messages('411001 12 abc 1234567 000 99 x7 560001')).toEqual([
      'products.deliveryPincodes.invalid:{"list":"12, abc, 1234567, 000, 99"}',
    ]);
  });
});

describe('DeliveryPincodesForm', () => {
  it('submits the parsed list and clears the box once the parent confirms', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<DeliveryPincodesForm onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox', { name: /Add pincodes/i });
    fireEvent.change(box, { target: { value: '411001, 560001\n411001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add pincodes' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(['411001', '560001']));
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('keeps what was typed when the parent reports a failure', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(<DeliveryPincodesForm onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox', { name: /Add pincodes/i });
    fireEvent.change(box, { target: { value: '411001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add pincodes' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(box).toHaveValue('411001');
  });

  it('shows validation errors and does not submit invalid pincodes', async () => {
    const onSubmit = vi.fn();
    render(<DeliveryPincodesForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add pincodes' }));
    expect(await screen.findByText('Enter at least one pincode')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /Add pincodes/i }), { target: { value: '41100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add pincodes' }));
    expect(await screen.findByText('Not a valid 6-digit pincode: 41100')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables the button and says it is adding while saving', () => {
    render(<DeliveryPincodesForm saving onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Adding/ })).toBeDisabled();
  });
});
