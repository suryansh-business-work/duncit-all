import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AddressForm,
  addressSchema,
  blankAddressValues,
  type AddressFormValues,
  type UserAddress,
} from '../index';

describe('address-book-form barrel (index)', () => {
  it('re-exports blankAddressValues with the expected defaults', () => {
    expect(blankAddressValues.label).toBe('Home');
    expect(blankAddressValues.country).toBe('India');
    expect(blankAddressValues.is_default).toBe(false);
  });

  it('re-exports a working addressSchema', () => {
    const valid: AddressFormValues = {
      ...blankAddressValues,
      line1: '1 Main St',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    };
    expect(addressSchema.safeParse(valid).success).toBe(true);
    expect(addressSchema.safeParse(blankAddressValues).success).toBe(false);
  });

  it('re-exports AddressForm as a renderable component', () => {
    render(
      <AddressForm open title="Barrel address" onCancel={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(screen.getByText('Barrel address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save address/i })).toBeInTheDocument();
  });

  it('exposes the UserAddress type shape via a typed value', () => {
    const addr: UserAddress = {
      ...blankAddressValues,
      id: 'addr_1',
      email: 'a@b.com',
    };
    expect(addr.id).toBe('addr_1');
    expect(addr.email).toBe('a@b.com');
  });
});
