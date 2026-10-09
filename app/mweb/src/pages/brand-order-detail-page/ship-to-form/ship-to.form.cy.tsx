import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ShipToForm, { shipToFormSchema } from './ship-to.form';
import type { ShipToFormValues } from './ship-to.types';

const valid: ShipToFormValues = {
  name: 'Riya Sharma',
  phone: '9845012345',
  line1: '221B, Indiranagar 2nd Stage',
  line2: '',
  landmark: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
  country: 'India',
};

const issuesOf = (values: ShipToFormValues) => {
  const result = shipToFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('shipToFormSchema', () => {
  it('accepts a courier-ready address', () => {
    expect(shipToFormSchema.safeParse(valid).success).toBe(true);
  });

  it('needs the recipient, a mobile and a six-digit PIN', () => {
    expect(issuesOf({ ...valid, name: '' })).toContain('name');
    expect(issuesOf({ ...valid, phone: '12345' })).toContain('phone');
    expect(issuesOf({ ...valid, pincode: '1010' })).toContain('pincode');
  });
});

describe('ShipToForm', () => {
  const renderForm = (initial: ShipToFormValues, onSubmit = vi.fn(), onCancel = vi.fn()) => {
    render(<ShipToForm open initial={initial} saving={false} onCancel={onCancel} onSubmit={onSubmit} />);
    return { onSubmit, onCancel };
  };

  it('opens on the order’s address and saves it as corrected', async () => {
    const { onSubmit } = renderForm({ ...valid, pincode: '56003' });
    const pincode = screen.getByRole('textbox', { name: /Pincode/ });
    expect(pincode).toHaveValue('56003');
    fireEvent.change(pincode, { target: { value: '560038' } });
    fireEvent.click(screen.getByTestId('ship-to-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual(valid);
  });

  it('says what is wrong and sends nothing', async () => {
    const { onSubmit } = renderForm({ ...valid, phone: '' });
    fireEvent.click(screen.getByTestId('ship-to-save'));
    expect(await screen.findByText('Enter a valid phone number')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels without saving', () => {
    const { onSubmit, onCancel } = renderForm(valid);
    fireEvent.click(screen.getByTestId('ship-to-cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
