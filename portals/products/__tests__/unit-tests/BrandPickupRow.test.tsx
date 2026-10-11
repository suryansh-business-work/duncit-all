import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import BrandPickupRow from '../../src/pages/ecomm/BrandPickupRow';
import { renderWithProviders } from '../testkit';

const location = (over: Record<string, unknown> = {}) => ({
  id: 'l1',
  nickname: 'Main WH',
  is_default: false,
  review_status: 'APPROVED',
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
  onToggleActive: vi.fn(),
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

  it('shows why an automatic ShipRocket registration did not land', () => {
    const h = handlers();
    renderWithProviders(
      <BrandPickupRow
        location={location({ shiprocket_error: 'Invalid ShipRocket credentials' })}
        busy={false}
        {...h}
      />,
    );

    // Registration runs automatically on approval; without the reason, a host
    // sees only a button that already failed once and no way to know why.
    expect(screen.getByText('Invalid ShipRocket credentials')).toBeInTheDocument();
  });

  it('falls back to the pending chip for a review state it does not know', () => {
    const h = handlers();
    renderWithProviders(
      <BrandPickupRow location={location({ review_status: 'SOMETHING_NEW' })} busy={false} {...h} />,
    );

    // A status added server-side must not render a blank chip on an older build.
    expect(screen.getByText('Main WH')).toBeInTheDocument();
  });

  it('locks the register button while a request is already running', () => {
    const h = handlers();
    renderWithProviders(<BrandPickupRow location={location()} busy {...h} />);

    expect(screen.getByRole('button', { name: /Register with ShipRocket/i })).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('shows an address as active and asks to switch it off from its Active switch', () => {
    const h = handlers();
    renderWithProviders(<BrandPickupRow location={location()} busy={false} {...h} />);

    const toggle = screen.getByRole('switch', { name: 'Active — switch off to disable this pickup address' });
    expect(toggle).toBeChecked();
    expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(h.onToggleActive).toHaveBeenCalledWith(false);
  });

  it('marks an inactive address, offers to switch it on and will not make it the default', () => {
    const h = handlers();
    renderWithProviders(<BrandPickupRow location={location({ is_active: false })} busy={false} {...h} />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: 'Inactive — switch on to enable this pickup address' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(h.onToggleActive).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('products-pickup-set-default')).toBeDisabled();
  });
});
