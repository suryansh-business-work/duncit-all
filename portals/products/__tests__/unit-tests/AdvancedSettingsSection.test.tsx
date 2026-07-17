import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AdvancedSettingsSection from '../../src/pages/inventory-page/inventory-product-page/AdvancedSettingsSection';
import { renderWithProviders } from '../testkit';
import { generateSkuMock } from '../mocks/inventory.mock';
import { ProductFormHarness } from './form-harness';

const renderSection = (mocks: MockedResponse[] = [], onError = vi.fn()) =>
  renderWithProviders(
    <ProductFormHarness>
      <AdvancedSettingsSection onError={onError} />
    </ProductFormHarness>,
    { mocks },
  );

// A resolver-backed harness so the SKU field can hold `undefined` (nullish
// value fallback) and surface a real validation error (error helper text).
const skuFormSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string(),
  status: z.string(),
  visibility: z.string(),
});

function ResolverHarness() {
  const methods = useForm({
    resolver: zodResolver(skuFormSchema),
    defaultValues: { sku: undefined, barcode: '', status: 'ACTIVE', visibility: 'PUBLIC' },
    mode: 'onChange',
  });
  return (
    <FormProvider {...methods}>
      <AdvancedSettingsSection onError={() => undefined} />
    </FormProvider>
  );
}

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
    renderSection([generateSkuMock({ value: 'GEN-0001' })]);
    generate();
    await waitFor(() =>
      expect((screen.getByLabelText('SKU') as HTMLInputElement).value).toBe('GEN-0001'),
    );
  });

  it('ignores an empty generated SKU', async () => {
    renderSection([generateSkuMock({ value: '' })]);
    generate();
    // Give the mutation a tick to resolve; the field stays blank.
    await new Promise((r) => setTimeout(r, 0));
    expect((screen.getByLabelText('SKU') as HTMLInputElement).value).toBe('');
  });

  it('reports a generation error', async () => {
    const onError = vi.fn();
    renderSection([generateSkuMock({ fail: true })], onError);
    generate();
    await waitFor(() => expect(onError).toHaveBeenCalledWith('rate limited'));
  });

  it('shows the hint and a validation error for an undefined/blank SKU', async () => {
    renderWithProviders(<ResolverHarness />);
    const sku = screen.getByLabelText('SKU') as HTMLInputElement;
    // Nullish default renders as an empty field, showing the hint (no error yet).
    expect(sku.value).toBe('');
    expect(screen.getByText(/Auto-generated 8 chars/i)).toBeInTheDocument();
    // A real value, then a blank one, trips the schema's min-length error.
    fireEvent.change(sku, { target: { value: 'ab' } });
    expect(sku.value).toBe('AB');
    fireEvent.change(sku, { target: { value: '' } });
    await waitFor(() => expect(screen.getByText('SKU is required')).toBeInTheDocument());
  });
});
