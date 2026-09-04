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

vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
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

  it('names the brand as the owner for a brand-owned product', () => {
    renderWithProviders(
      <ProductFormHarness values={{ ownership: 'BRAND' }}>
        <BasicInfoSection categories={[]} />
      </ProductFormHarness>,
    );
    expect(screen.getByText('Product owner: Brand')).toBeInTheDocument();
    expect(screen.queryByText('Product owner: Duncit')).not.toBeInTheDocument();
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
    // Toggle the "Delivery available" switch on. MUI's Switch exposes role
    // "switch", not "checkbox", so the label is the stable way in.
    fireEvent.click(screen.getByLabelText('Delivery available'));
    expect(screen.getByLabelText(/Delivery charge/i)).not.toBeDisabled();
    expect(screen.getByText(/set 0 for free delivery/i)).toBeInTheDocument();
  });

  it('calls the delivery charge a fallback once the product ships via ShipRocket', async () => {
    renderWithProviders(
      <ProductFormHarness values={{ delivery_target: 'SHIPROCKET', delivery_available: true }}>
        <DeliveryAvailabilitySection />
      </ProductFormHarness>,
      { mocks: [brandPickupLocationsMock([makeBrandPickupLocation({ owner_kind: 'DUNCIT', brand_id: null })])] },
    );
    // ShipRocket prices the parcel live from the warehouse, so the flat number
    // is only what is charged when the lane cannot be rated — the hint must not
    // keep calling it a flat fee per order.
    expect(screen.getByText(/Fallback only/i)).toBeInTheDocument();
    expect(screen.queryByText(/set 0 for free delivery/i)).not.toBeInTheDocument();
    // The method picker sits beside the warehouse it depends on.
    await waitFor(() => expect(screen.getByText('ShipRocket delivery')).toBeInTheDocument());
  });

  it('hides the delivery method and warehouse pickers for a brand-owned product', async () => {
    renderWithProviders(
      <ProductFormHarness values={{ ownership: 'BRAND' }}>
        <DeliveryAvailabilitySection />
      </ProductFormHarness>,
      { mocks: [brandPickupLocationsMock([makeBrandPickupLocation({ owner_kind: 'DUNCIT', brand_id: null })])] },
    );
    // Shipping dimensions still render; the Duncit-only warehouse select does not.
    expect(screen.getByLabelText(/Weight/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Main WH — Pune')).not.toBeInTheDocument());
    expect(screen.queryByLabelText(/Warehouse/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Delivery method/i)).not.toBeInTheDocument();
  });
});
