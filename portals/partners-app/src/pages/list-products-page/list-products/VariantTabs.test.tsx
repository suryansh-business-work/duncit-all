import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import VariantTabs from './VariantTabs';
import { ProductFormHarness, type ProductFormApi } from './__tests__/formHarness';
import { emptyVariant } from './list-products.map';
import type { ProductVariantValues } from './list-products.types';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

const variant = (over: Partial<ProductVariantValues> = {}): ProductVariantValues => ({ ...emptyVariant, ...over });

const renderTabs = (variants: ProductVariantValues[] = [variant()]) => {
  const apiRef: { current: ProductFormApi | null } = { current: null };
  const onPickImage = vi.fn();
  renderWithProviders(
    <ProductFormHarness
      apiRef={apiRef}
      defaultValues={{ variants }}
      renderFields={({ control, watch, setValue }) => (
        <VariantTabs control={control} watch={watch} setValue={setValue} onPickImage={onPickImage} />
      )}
    />,
  );
  return { apiRef, onPickImage };
};

describe('VariantTabs', () => {
  it('starts with one unnamed variant that cannot be removed', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: 'Variant 1' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('textbox', { name: 'Variant name (e.g. Default)' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Remove this variant' }) as HTMLButtonElement).disabled).toBe(true);
    for (const label of ['Height (cm)', 'Weight (kg)', 'Length (cm)', 'Breadth (cm)', 'Price (₹)', 'Stock']) {
      expect(screen.getByRole('spinbutton', { name: label })).toBeTruthy();
    }
  });

  it('names the tab after the variant once the partner types a name', async () => {
    renderTabs();

    fireEvent.change(screen.getByRole('textbox', { name: 'Variant name (e.g. Default)' }), { target: { value: 'Default' } });
    expect(await screen.findByRole('tab', { name: 'Default' })).toBeTruthy();
  });

  it('adds a variant, opens its tab, and removing it goes back to the first', async () => {
    const { apiRef } = renderTabs([variant({ option_label: 'Classic' })]);

    fireEvent.click(screen.getByRole('button', { name: 'Add variant' }));
    const second = await screen.findByRole('tab', { name: 'Variant 2' });
    await waitFor(() => expect(second.getAttribute('aria-selected')).toBe('true'));
    expect(screen.getByTestId('location').textContent).toBe('/?selectedtab_variant=1');
    expect(apiRef.current?.getValues('variants')).toHaveLength(2);

    // Only the open tab's fields are on screen; both variants can now be removed.
    fireEvent.click(screen.getByRole('button', { name: 'Remove this variant' }));
    await waitFor(() => expect(screen.queryByRole('tab', { name: 'Variant 2' })).toBeNull());
    expect(screen.getByRole('tab', { name: 'Classic' }).getAttribute('aria-selected')).toBe('true');
    expect(apiRef.current?.getValues('variants')).toHaveLength(1);
  });

  it('lets any variant be opened from its tab', async () => {
    renderTabs([variant({ option_label: 'Small', description: 'Small box' }), variant({ option_label: 'Large', description: 'Large box' })]);

    fireEvent.click(screen.getByRole('tab', { name: 'Large' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Large' }).getAttribute('aria-selected')).toBe('true'));
    expect((screen.getByRole('textbox', { name: 'Description' }) as HTMLTextAreaElement).value).toBe('Large box');
  });

  it('shows a generated variant by its option values instead of a name field', () => {
    renderTabs([
      variant({
        option_label: 'M / Blue',
        option_values: [
          { name: 'Size', value: 'M' },
          { name: 'Colour', value: 'Blue' },
        ],
      }),
    ]);

    expect(screen.getByRole('tab', { name: 'M / Blue' })).toBeTruthy();
    expect(screen.getByText('Size: M')).toBeTruthy();
    expect(screen.getByText('Colour: Blue')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Variant name (e.g. Default)' })).toBeNull();
  });

  it('shows the variant images, removes one, and asks for more for this variant', async () => {
    const { apiRef, onPickImage } = renderTabs([
      variant({ image_urls: ['https://cdn.test/tee-front.jpg', 'https://cdn.test/tee-back.jpg'] }),
    ]);

    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByRole('img', { name: 'Variant' })).toHaveLength(2);
    fireEvent.click(within(panel).getAllByRole('button', { name: 'Remove image' })[0]);
    await waitFor(() => expect(apiRef.current?.getValues('variants.0.image_urls')).toEqual(['https://cdn.test/tee-back.jpg']));
    expect(within(panel).getAllByRole('img', { name: 'Variant' })).toHaveLength(1);

    fireEvent.click(within(panel).getByRole('button', { name: 'Add variant image' }));
    expect(onPickImage).toHaveBeenCalledWith(0);
  });
});
