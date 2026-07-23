import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import SupplierDetailsSection from '../../src/pages/inventory-page/inventory-product-page/SupplierDetailsSection';
import BasicInfoSection from '../../src/pages/inventory-page/inventory-product-page/BasicInfoSection';
import PricingTaxSection from '../../src/pages/inventory-page/inventory-product-page/PricingTaxSection';
import InventoryManagementSection from '../../src/pages/inventory-page/inventory-product-page/InventoryManagementSection';
import DeliveryAvailabilitySection from '../../src/pages/inventory-page/inventory-product-page/DeliveryAvailabilitySection';
import { ProductFormHarness } from './form-harness';
import { renderWithProviders } from '../testkit';
import { brandPickupLocationsMock, makeBrandPickupLocation } from '../mocks/pickup.mock';

vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ dateFormat: 'dd MMM yyyy' }),
}));

const renderSection = (node: React.ReactElement) =>
  renderWithProviders(<ProductFormHarness>{node}</ProductFormHarness>);

describe('SupplierDetailsSection', () => {
  it('renders the vendor and supplier fields', () => {
    renderSection(<SupplierDetailsSection />);
    expect(screen.getByLabelText(/Vendor \/ supplier name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Supplier contact/i)).toBeInTheDocument();
  });
});

describe('BasicInfoSection', () => {
  it('renders the owner chip, fields and category options', () => {
    renderSection(<BasicInfoSection categories={[{ id: 'c1', name: 'Beverages' }]} />);
    expect(screen.getByText('Product owner: Duncit')).toBeInTheDocument();
    expect(screen.getByLabelText(/Product name/i)).toBeInTheDocument();
    // The short-description hint shows a live character counter.
    expect(screen.getByText(/0\/280/)).toBeInTheDocument();
    expect(screen.getByText(/0\/4000/)).toBeInTheDocument();
  });

  it('updates the short-description counter as the user types', () => {
    renderSection(<BasicInfoSection categories={[]} />);
    fireEvent.change(screen.getByLabelText(/Short description/i), {
      target: { value: 'Hello' },
    });
    expect(screen.getByText(/5\/280/)).toBeInTheDocument();
  });
});

describe('PricingTaxSection', () => {
  it('computes the effective price from selling price, discount and tax', () => {
    renderSection(<PricingTaxSection />);
    expect(screen.getByText(/Effective price/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Selling price/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Tax \/ GST/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Discount/i), { target: { value: '10' } });
    // 100 * (1 - 0.1) * (1 + 0.1) = 99.00
    expect(screen.getByText('₹99.00')).toBeInTheDocument();
  });
});

describe('InventoryManagementSection', () => {
  it('reflects the live stock chip as counts change', () => {
    renderSection(<InventoryManagementSection />);
    // inventory_count defaults to 0 → out of stock.
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Current stock/i), { target: { value: '25' } });
    expect(screen.getByText('25 in stock')).toBeInTheDocument();
  });
});

describe('DeliveryAvailabilitySection', () => {
  it('enables the delivery charge only when delivery is available and shows the warehouse picker', async () => {
    renderWithProviders(
      <ProductFormHarness>
        <DeliveryAvailabilitySection />
      </ProductFormHarness>,
      { mocks: [brandPickupLocationsMock([makeBrandPickupLocation({ owner_kind: 'DUNCIT', brand_id: null })])] },
    );
    const charge = screen.getByLabelText(/Delivery charge/i);
    expect(charge).toBeDisabled();
    expect(screen.getByText(/Enable "Delivery available" to set a charge/i)).toBeInTheDocument();
    // The required warehouse picker is rendered alongside the shipping fields.
    await waitFor(() => expect(screen.getByText('Main WH — Pune')).toBeInTheDocument());
    // Toggle the "Delivery available" switch on.
    const deliverySwitch = within(
      screen.getByText('Delivery available').closest('label') as HTMLElement,
    ).getByRole('checkbox');
    fireEvent.click(deliverySwitch);
    expect(screen.getByLabelText(/Delivery charge/i)).not.toBeDisabled();
    expect(screen.getByText(/set 0 for free delivery/i)).toBeInTheDocument();
  });
});
