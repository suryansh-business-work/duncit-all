import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductAccordion from '../../src/pages/inventory-page/inventory-product-page/ProductAccordion';

const stub = (label: string) => ({ default: () => <div>{label}</div> });
vi.mock('../../src/pages/inventory-page/inventory-product-page/BasicInfoSection', () => stub('BASIC'));
vi.mock('../../src/pages/inventory-page/inventory-product-page/PricingTaxSection', () => stub('PRICING'));
vi.mock('../../src/pages/inventory-page/inventory-product-page/InventoryManagementSection', () =>
  stub('INVENTORY'),
);
vi.mock('../../src/pages/inventory-page/inventory-product-page/SupplierDetailsSection', () =>
  stub('SUPPLIER'),
);
vi.mock('../../src/pages/inventory-page/inventory-product-page/DeliveryAvailabilitySection', () =>
  stub('DELIVERY'),
);
vi.mock('../../src/pages/inventory-page/inventory-product-page/MediaBrandingSection', () =>
  stub('MEDIA'),
);
vi.mock('../../src/pages/inventory-page/inventory-product-page/AdvancedSettingsSection', () =>
  stub('ADVANCED'),
);
vi.mock('../../src/pages/inventory-page/inventory-product-page/ActivityLogsSection', () =>
  stub('ACTIVITY'),
);

const renderAccordion = () =>
  render(
    <ProductAccordion
      isNew={false}
      categories={[]}
      logs={[]}
      movements={[]}
      analytics={[]}
      activityLoading={false}
      onError={vi.fn()}
    />,
  );

describe('ProductAccordion', () => {
  it('renders all section headers with basic info expanded first', () => {
    renderAccordion();
    expect(screen.getByText('Basic info')).toBeInTheDocument();
    expect(screen.getByText('Activity & analytics')).toBeInTheDocument();
    expect(screen.getByText('BASIC')).toBeInTheDocument();
  });

  it('expands each section on demand', () => {
    renderAccordion();
    const open = (label: string) => fireEvent.click(screen.getByText(label));
    open('Pricing & tax');
    expect(screen.getByText('PRICING')).toBeInTheDocument();
    open('Inventory management');
    expect(screen.getByText('INVENTORY')).toBeInTheDocument();
    open('Supplier details');
    expect(screen.getByText('SUPPLIER')).toBeInTheDocument();
    open('Delivery & availability');
    expect(screen.getByText('DELIVERY')).toBeInTheDocument();
    open('Media & branding');
    expect(screen.getByText('MEDIA')).toBeInTheDocument();
    open('Advanced settings');
    expect(screen.getByText('ADVANCED')).toBeInTheDocument();
    open('Activity & analytics');
    expect(screen.getByText('ACTIVITY')).toBeInTheDocument();
  });

  it('collapses the open section when its header is clicked again', () => {
    renderAccordion();
    // Basic is open by default; clicking it collapses (expanded -> '').
    fireEvent.click(screen.getByText('Basic info'));
    // MUI keeps the panel mounted during the collapse transition, so assert the
    // summary reflects the collapsed state instead.
    expect(screen.getByText('Basic info').closest('.MuiAccordionSummary-root')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
