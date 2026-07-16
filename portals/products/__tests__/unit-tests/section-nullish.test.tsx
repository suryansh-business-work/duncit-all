import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { screen } from '@testing-library/react';
import PricingTaxSection from '../../src/pages/inventory-page/inventory-product-page/PricingTaxSection';
import BasicInfoSection from '../../src/pages/inventory-page/inventory-product-page/BasicInfoSection';
import InventoryManagementSection from '../../src/pages/inventory-page/inventory-product-page/InventoryManagementSection';
import MediaBrandingSection from '../../src/pages/inventory-page/inventory-product-page/MediaBrandingSection';
import { renderWithProviders } from './testkit';

vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ dateFormat: 'dd MMM yyyy' }),
}));
// Isolate the media section from its heavy children — we only exercise the
// section's own nullish fallbacks here.
vi.mock('../../src/pages/inventory-page/inventory-product-page/ImagesField', () => ({
  default: () => <div data-testid="images-field" />,
}));
vi.mock('../../src/pages/inventory-page/inventory-product-page/AiDescribeButton', () => ({
  default: () => <div data-testid="ai-btn" />,
}));

// A form context whose numeric/string/array fields are all `undefined`, so the
// sections' `?? 0` / `?? ''` / `?? []` fallbacks are taken.
function UndefinedForm({ children }: Readonly<{ children: ReactNode }>) {
  const methods = useForm({
    defaultValues: {
      selling_price: undefined,
      discount_percent: undefined,
      tax_percent: undefined,
      unit_cost: undefined,
      purchase_price: undefined,
      weight_volume: undefined,
      short_description: undefined,
      description: undefined,
      tags: undefined,
      product_name: undefined,
      brand_name: undefined,
      product_type: 'CONSUMABLE',
      unit_type: 'PIECE',
      category_id: undefined,
      inventory_count: undefined,
      low_stock_alert: undefined,
      reserved_count: undefined,
      damaged_count: undefined,
      min_order_qty: undefined,
      max_order_qty: undefined,
      batch_number: undefined,
      manufacturing_date: undefined,
      expiry_date: undefined,
      storage_instructions: undefined,
      images: undefined,
      image_url: undefined,
    } as any,
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe('section nullish fallbacks', () => {
  it('PricingTaxSection defaults undefined money fields to 0', () => {
    renderWithProviders(
      <UndefinedForm>
        <PricingTaxSection />
      </UndefinedForm>,
    );
    // net = 0 → effective price ₹0.00.
    expect(screen.getByText('₹0.00')).toBeInTheDocument();
  });

  it('BasicInfoSection defaults undefined text/tags to empty', () => {
    renderWithProviders(
      <UndefinedForm>
        <BasicInfoSection categories={[]} />
      </UndefinedForm>,
    );
    expect(screen.getByText(/0\/280/)).toBeInTheDocument();
    expect(screen.getByText(/0\/4000/)).toBeInTheDocument();
  });

  it('InventoryManagementSection defaults undefined dates to empty', () => {
    renderWithProviders(
      <UndefinedForm>
        <InventoryManagementSection />
      </UndefinedForm>,
    );
    expect(screen.getByLabelText(/Manufacturing date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Expiry date/i)).toBeInTheDocument();
  });

  it('MediaBrandingSection defaults undefined images/cover to empty', () => {
    renderWithProviders(
      <UndefinedForm>
        <MediaBrandingSection onError={vi.fn()} />
      </UndefinedForm>,
    );
    expect(screen.getByTestId('images-field')).toBeInTheDocument();
  });
});
