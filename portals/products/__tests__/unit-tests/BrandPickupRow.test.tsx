import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import BrandPickupRow from '../../src/pages/ecomm/BrandPickupRow';
import { renderWithProviders } from '../testkit';

const location = (over: Record<string, unknown> = {}) => ({
  id: 'l1',
  nickname: 'Main WH',
  is_default: false,
  shiprocket_registered: false,
  contact_name: 'Asha',
  phone: '9999',
  address_line1: '12 MG Rd',
  address_line2: '',
  city: 'Pune',
  state: 'MH',
  pincode: '411001',
  ...over,
});

const handlers = () => ({
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onSetDefault: vi.fn(),
  onRegister: vi.fn(),
});

describe('BrandPickupRow', () => {
  it('renders a non-default, unregistered location with a register button', () => {
    const h = handlers();
    renderWithProviders(<BrandPickupRow location={location()} busy={false} {...h} />);
    expect(screen.getByText('Main WH')).toBeInTheDocument();
    expect(screen.getByText('Not registered')).toBeInTheDocument();
    expect(screen.getByText('12 MG Rd, Pune, MH, 411001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Register with ShipRocket/i }));
    expect(h.onRegister).toHaveBeenCalled();
    // The star (set-default) button is icon-only inside a tooltip span.
    fireEvent.click(screen.getByTestId('StarBorderIcon').closest('button') as HTMLElement);
    expect(h.onSetDefault).toHaveBeenCalled();
  });

  it('renders a default, registered location without the register button', () => {
    const h = handlers();
    renderWithProviders(
      <BrandPickupRow
        location={location({ is_default: true, shiprocket_registered: true })}
        busy={false}
        {...h}
      />,
    );
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('ShipRocket ready')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Register with ShipRocket/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(h.onEdit).toHaveBeenCalled();
    expect(h.onDelete).toHaveBeenCalled();
  });
});
