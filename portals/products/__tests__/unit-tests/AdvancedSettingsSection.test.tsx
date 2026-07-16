import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AdvancedSettingsSection from '../../src/pages/inventory-page/inventory-product-page/AdvancedSettingsSection';
import { GENERATE_INVENTORY_SKU } from '../../src/pages/inventory-page/inventory-product-page/productQueries';
import { ProductFormHarness } from './form-harness';
import { renderWithProviders } from './testkit';

const skuMock = (value: string): MockedResponse => ({
  request: { query: GENERATE_INVENTORY_SKU },
  result: { data: { generateInventorySku: value } },
});
const skuError: MockedResponse = {
  request: { query: GENERATE_INVENTORY_SKU },
  result: { errors: [{ message: 'rate limited' }] },
};

const renderSection = (mocks: MockedResponse[] = [], onError = vi.fn()) =>
  renderWithProviders(
    <ProductFormHarness>
      <AdvancedSettingsSection onError={onError} />
    </ProductFormHarness>,
    { mocks },
  );

const generate = () => fireEvent.click(screen.getByRole('button', { name: /Generate new SKU/i }));

describe('AdvancedSettingsSection', () => {
  it('renders the SKU, barcode, status and visibility controls', () => {
    renderSection();
    expect(screen.getByLabelText('SKU')).toBeInTheDocument();
    expect(screen.getByLabelText(/Barcode value/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Visibility')).toBeInTheDocument();
  });

  it('upper-cases typed SKU input', () => {
    renderSection();
    const sku = screen.getByLabelText('SKU') as HTMLInputElement;
    fireEvent.change(sku, { target: { value: 'ab-12' } });
    expect(sku.value).toBe('AB-12');
  });

  it('generates a SKU and writes it into the field', async () => {
    renderSection([skuMock('GEN-0001')]);
    generate();
    await waitFor(() =>
      expect((screen.getByLabelText('SKU') as HTMLInputElement).value).toBe('GEN-0001'),
    );
  });

  it('ignores an empty generated SKU', async () => {
    renderSection([skuMock('')]);
    generate();
    // Give the mutation a tick to resolve; the field stays blank.
    await new Promise((r) => setTimeout(r, 0));
    expect((screen.getByLabelText('SKU') as HTMLInputElement).value).toBe('');
  });

  it('reports a generation error', async () => {
    const onError = vi.fn();
    renderSection([skuError], onError);
    generate();
    await waitFor(() => expect(onError).toHaveBeenCalledWith('rate limited'));
  });
});
