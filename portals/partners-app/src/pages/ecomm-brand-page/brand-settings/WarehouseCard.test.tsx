import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import WarehouseCard from './WarehouseCard';
import { isWarehouseUsable, type BrandWarehouse } from './warehouse.queries';
import { warehouseToValues } from './warehouse-form/warehouse.types';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

const warehouse = (over: Partial<BrandWarehouse> = {}): BrandWarehouse => ({
  id: 'w1',
  owner_kind: 'BRAND',
  brand_id: 'b1',
  review_status: 'APPROVED',
  nickname: 'Delhi warehouse',
  contact_name: 'Asha Verma',
  phone: '9876543210',
  email: 'asha@brand.example.com',
  address_line1: '12 Industrial Area',
  address_line2: '',
  city: 'New Delhi',
  state: 'Delhi',
  pincode: '110020',
  country: 'India',
  is_default: false,
  is_active: true,
  shiprocket_registered: true,
  shiprocket_error: '',
  shiprocket_pickup_id: 'sr-1',
  updated_at: '2026-10-01T10:00:00.000Z',
  ...over,
});

const mount = (over: Partial<BrandWarehouse> = {}) => {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onSetDefault: vi.fn(), onToggleActive: vi.fn() };
  renderWithProviders(<WarehouseCard warehouse={warehouse(over)} busy={false} {...handlers} />);
  return handlers;
};

describe('WarehouseCard review state', () => {
  it('shows an approved address without any waiting note', () => {
    mount();
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.queryByText(/until the Duncit team approves it|was rejected/)).toBeNull();
  });

  it('says a pending address is waiting on the Products team', () => {
    mount({ review_status: 'PENDING' });
    expect(screen.getByText('Awaiting approval')).toBeTruthy();
    expect(screen.getByText('Products cannot ship from this pickup address until the Duncit team approves it.')).toBeTruthy();
  });

  it('says a rejected address was turned down, in its own words', () => {
    mount({ review_status: 'REJECTED' });
    expect(screen.getByText('Rejected')).toBeTruthy();
    expect(
      screen.getByText('This pickup address was rejected — edit the address and save to request another review.'),
    ).toBeTruthy();
  });

  it('treats a review state this console does not know yet as awaiting approval', () => {
    mount({ review_status: 'ON_HOLD' as BrandWarehouse['review_status'] });
    expect(screen.getByText('Awaiting approval')).toBeTruthy();
  });
});

describe('WarehouseCard ShipRocket note', () => {
  it('stays quiet when ShipRocket has nothing to say', () => {
    mount();
    expect(screen.queryByTestId('warehouse-shiprocket-note')).toBeNull();
  });

  it('shows ShipRocket’s reason as a quiet note while the address only awaits its phone check', () => {
    mount({ shiprocket_registered: true, shiprocket_error: 'Phone not verified yet' });
    const note = screen.getByTestId('warehouse-shiprocket-note');
    expect(note.textContent).toBe('Phone not verified yet');
    expect(getComputedStyle(note).color).toBe('rgba(0, 0, 0, 0.6)');
  });

  it('shows the reason as an error when ShipRocket holds no such address at all', () => {
    mount({ shiprocket_registered: false, shiprocket_error: 'Pickup address not found on your account' });
    const note = screen.getByTestId('warehouse-shiprocket-note');
    expect(note.textContent).toBe('Pickup address not found on your account');
    expect(getComputedStyle(note).color).toBe('rgb(211, 47, 47)');
  });
});

describe('WarehouseCard actions', () => {
  it('hands the address to each action', () => {
    const handlers = mount();
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /primary/i }));
    fireEvent.click(screen.getByTestId('pickup-active-w1').querySelector('input') as HTMLElement);
    expect(handlers.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }));
    expect(handlers.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }));
    expect(handlers.onSetDefault).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }));
    expect(handlers.onToggleActive).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }), false);
  });
});

describe('isWarehouseUsable', () => {
  it('needs both approval and an active switch', () => {
    expect(isWarehouseUsable(warehouse())).toBe(true);
    expect(isWarehouseUsable(warehouse({ review_status: 'PENDING' }))).toBe(false);
    expect(isWarehouseUsable(warehouse({ is_active: false }))).toBe(false);
  });
});

describe('warehouseToValues', () => {
  it('prefills every field from a saved address', () => {
    expect(warehouseToValues(warehouse({ is_default: true }))).toEqual({
      nickname: 'Delhi warehouse',
      contact_name: 'Asha Verma',
      phone: '9876543210',
      email: 'asha@brand.example.com',
      address_line1: '12 Industrial Area',
      address_line2: '',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110020',
      country: 'India',
      is_default: true,
    });
  });

  it('turns the gaps of an address taken in from ShipRocket into blanks, and defaults the country to India', () => {
    const adopted = warehouse({
      nickname: null,
      contact_name: null,
      phone: null,
      email: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      pincode: null,
      country: '',
    } as unknown as Partial<BrandWarehouse>);
    expect(warehouseToValues(adopted)).toMatchObject({
      nickname: '',
      address_line1: '',
      city: '',
      state: '',
      pincode: '',
      contact_name: '',
      phone: '',
      email: '',
      address_line2: '',
      country: 'India',
    });
  });

  it('starts every field empty for a new address, except the India default', () => {
    expect(warehouseToValues(null)).toMatchObject({ nickname: '', country: 'India', is_default: false });
  });
});
