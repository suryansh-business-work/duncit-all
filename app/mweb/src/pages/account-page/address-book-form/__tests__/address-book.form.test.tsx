import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddressForm, { addressSchema } from '../address-book.form';
import { blankAddressValues, type AddressFormValues } from '../address-book.types';

const filled: AddressFormValues = {
  label: 'Office',
  name: 'Jane Doe',
  phone: '9999999999',
  line1: '221B Baker Street',
  line2: 'Suite 5',
  landmark: 'Near the park',
  city: 'London',
  state: 'Greater London',
  pincode: '123456',
  country: 'UK',
  is_default: true,
};

const textbox = (name: RegExp) => screen.getByRole('textbox', { name });

function renderForm(overrides: Partial<React.ComponentProps<typeof AddressForm>> = {}) {
  const onCancel = vi.fn();
  const onSubmit = vi.fn();
  const utils = render(
    <AddressForm open title="Add address" onCancel={onCancel} onSubmit={onSubmit} {...overrides} />,
  );
  return { onCancel, onSubmit, ...utils };
}

describe('addressSchema', () => {
  it('accepts a fully valid address', () => {
    expect(addressSchema.safeParse(filled).success).toBe(true);
  });

  it('rejects a missing label, line1, city, state and a bad pincode', () => {
    const res = addressSchema.safeParse({ ...filled, label: '', line1: '', city: '', state: '', pincode: 'abc' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path[0]);
      expect(paths).toEqual(expect.arrayContaining(['label', 'line1', 'city', 'state', 'pincode']));
    }
  });
});

describe('AddressForm', () => {
  it('renders the title and all fields with blank defaults', () => {
    renderForm();
    expect(screen.getByText('Add address')).toBeInTheDocument();
    expect(textbox(/label/i)).toHaveValue(blankAddressValues.label);
    expect(textbox(/country/i)).toHaveValue(blankAddressValues.country);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('does not render its content when closed', () => {
    renderForm({ open: false });
    expect(screen.queryByText('Add address')).not.toBeInTheDocument();
  });

  it('seeds fields from initial values', () => {
    renderForm({ initial: filled, title: 'Edit address' });
    expect(textbox(/label/i)).toHaveValue('Office');
    expect(textbox(/receiver name/i)).toHaveValue('Jane Doe');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('fires onCancel when Cancel is clicked', () => {
    const { onCancel } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('toggles the default-address checkbox', () => {
    renderForm();
    const box = screen.getByRole('checkbox');
    fireEvent.click(box);
    expect(box).toBeChecked();
  });

  it('submits typed values through onSubmit when valid', async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(textbox(/address line 1/i), { target: { value: '10 Downing Street' } });
    fireEvent.change(textbox(/^city/i), { target: { value: 'London' } });
    fireEvent.change(textbox(/^state/i), { target: { value: 'London' } });
    fireEvent.change(textbox(/pincode/i), { target: { value: '112233' } });
    fireEvent.click(screen.getByRole('button', { name: /save address/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      line1: '10 Downing Street',
      city: 'London',
      state: 'London',
      pincode: '112233',
    });
  });

  it('blocks submit and shows validation errors when required fields are empty', async () => {
    const { onSubmit } = renderForm({ initial: { ...blankAddressValues, label: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save address/i }));
    expect(await screen.findByText(/give this address a label/i)).toBeInTheDocument();
    expect(screen.getByText(/address line 1 is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables both buttons while saving', () => {
    renderForm({ saving: true });
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save address/i })).toBeDisabled();
  });
});
