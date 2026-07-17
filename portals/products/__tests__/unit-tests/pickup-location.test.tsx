import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  PickupLocationForm,
  pickupLocationInitialValues,
  pickupLocationSchema,
  toFormValues,
  toSubmitInput,
  type PickupLocationFormValues,
} from '../../src/pages/ecomm/pickup-location-form';

const valid: PickupLocationFormValues = {
  ...pickupLocationInitialValues,
  nickname: 'Main warehouse',
  contact_name: 'Asha Rao',
  phone: '9876543210',
  email: 'ops@brand.com',
  address_line1: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
};

describe('pickupLocationSchema', () => {
  it('accepts a fully valid location', () => {
    expect(pickupLocationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects short nicknames, bad phone/pincode/email', () => {
    const msgs = (over: Partial<PickupLocationFormValues>) => {
      const r = pickupLocationSchema.safeParse({ ...valid, ...over });
      return r.success ? [] : r.error.issues.map((i) => i.message);
    };
    expect(msgs({ nickname: 'ab' })).toContain('Nickname must be at least 3 characters');
    expect(msgs({ phone: '123' })).toContain('Enter a valid 10-digit phone number');
    expect(msgs({ pincode: '12' })).toContain('Enter a valid 6-digit pincode');
    expect(msgs({ email: 'nope' })).toContain('Enter a valid email');
  });

  it('lowercases the email', () => {
    expect(pickupLocationSchema.parse({ ...valid, email: 'OPS@Brand.com' }).email).toBe(
      'ops@brand.com',
    );
  });
});

describe('pickup location mappers', () => {
  it('returns the initial values when there is no location', () => {
    expect(toFormValues(null)).toEqual(pickupLocationInitialValues);
  });

  it('maps a location and defaults the country to India', () => {
    const values = toFormValues({ nickname: 'W', city: 'Pune', country: '' });
    expect(values.nickname).toBe('W');
    expect(values.city).toBe('Pune');
    expect(values.country).toBe('India');
  });

  it('defaults missing string fields to empty', () => {
    // A partial object exercises the `?? ''` fallbacks (nickname, city, …).
    const values = toFormValues({ contact_name: 'Only Contact' });
    expect(values.nickname).toBe('');
    expect(values.city).toBe('');
    expect(values.contact_name).toBe('Only Contact');
  });

  it('carries owner kind + brand id into the submit input', () => {
    expect(toSubmitInput(valid, { owner_kind: 'BRAND', brand_id: 'b1' })).toMatchObject({
      owner_kind: 'BRAND',
      brand_id: 'b1',
      pincode: '560001',
    });
    // Null brand id is preserved for Duncit-owned locations.
    expect(toSubmitInput(valid, { owner_kind: 'DUNCIT' }).brand_id).toBeNull();
  });
});

describe('PickupLocationForm', () => {
  it('does not render fields when closed', () => {
    render(
      <PickupLocationForm open={false} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.queryByLabelText(/Nickname/)).not.toBeInTheDocument();
  });

  it('opens with the built-in defaults when no initial values are given', () => {
    render(<PickupLocationForm open onClose={vi.fn()} onSubmit={vi.fn()} />);
    // Country defaults to India from pickupLocationInitialValues.
    expect(screen.getByDisplayValue('India')).toBeInTheDocument();
    // Default dialog title is used.
    expect(screen.getByText('Pickup location')).toBeInTheDocument();
  });

  it('renders seeded values and submits them', async () => {
    const onSubmit = vi.fn();
    render(
      <PickupLocationForm open initialValues={valid} onClose={vi.fn()} onSubmit={onSubmit} />,
    );
    expect(screen.getByDisplayValue('Main warehouse')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save location/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ nickname: 'Main warehouse' });
  });

  it('disables both actions while saving', () => {
    render(
      <PickupLocationForm open saving initialValues={valid} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('closes on cancel when not saving', () => {
    const onClose = vi.fn();
    render(
      <PickupLocationForm open initialValues={valid} onClose={onClose} onSubmit={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles the default-location checkbox', () => {
    render(<PickupLocationForm open initialValues={valid} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
