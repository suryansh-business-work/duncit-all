import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdvancedSettingsSection from '../../src/pages/inventory-page/inventory-product-page/AdvancedSettingsSection';
import { ProductFormHarness } from './form-harness';

const mut = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useMutation: () => [mut.fn, { loading: false }],
}));

const renderSection = (onError = vi.fn()) =>
  render(
    <ProductFormHarness>
      <AdvancedSettingsSection onError={onError} />
    </ProductFormHarness>,
  );

beforeEach(() => mut.fn.mockReset());

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
    mut.fn.mockResolvedValue({ data: { generateInventorySku: 'GEN-0001' } });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: /Generate new SKU/i }));
    await waitFor(() =>
      expect((screen.getByLabelText('SKU') as HTMLInputElement).value).toBe('GEN-0001'),
    );
  });

  it('ignores an empty generated SKU', async () => {
    mut.fn.mockResolvedValue({ data: { generateInventorySku: '' } });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: /Generate new SKU/i }));
    await waitFor(() => expect(mut.fn).toHaveBeenCalled());
    expect((screen.getByLabelText('SKU') as HTMLInputElement).value).toBe('');
  });

  it('reports a generation error', async () => {
    mut.fn.mockRejectedValue(new Error('rate limited'));
    const onError = vi.fn();
    renderSection(onError);
    fireEvent.click(screen.getByRole('button', { name: /Generate new SKU/i }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('rate limited'));
  });

  it('falls back to a generic error message when the error has none', async () => {
    mut.fn.mockRejectedValue({});
    const onError = vi.fn();
    renderSection(onError);
    fireEvent.click(screen.getByRole('button', { name: /Generate new SKU/i }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Could not generate SKU'));
  });
});
