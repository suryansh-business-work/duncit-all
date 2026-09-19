import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import OptionsEditor from './OptionsEditor';
import { ProductFormHarness, type ProductFormApi } from './__tests__/formHarness';
import type { ProductOptionValues } from './list-products.types';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

const renderEditor = (options: ProductOptionValues[] = []) => {
  const apiRef: { current: ProductFormApi | null } = { current: null };
  renderWithProviders(
    <ProductFormHarness
      apiRef={apiRef}
      defaultValues={{ options }}
      renderFields={({ control }) => <OptionsEditor control={control} />}
    />,
  );
  return apiRef;
};

const addValue = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('OptionsEditor', () => {
  it('explains options and starts with none', () => {
    renderEditor();
    expect(screen.getByText('Options (e.g. Size, Colour)')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Option name' })).toBeNull();
  });

  it('adds an option and collects its typed values', async () => {
    const apiRef = renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Option name' }), { target: { value: 'Size' } });
    const values = screen.getByRole('combobox', { name: 'Values' });
    expect(screen.getByText('e.g. S, M, L')).toBeTruthy();
    addValue(values, 'S');
    addValue(values, 'M');

    await waitFor(() => expect(apiRef.current?.getValues('options')).toEqual([{ name: 'Size', values: ['S', 'M'] }]));
    // Each value becomes a chip in the field.
    expect(screen.getByText('S')).toBeTruthy();
    expect(screen.getByText('M')).toBeTruthy();
  });

  it('shows the option rules when an incomplete option is validated', async () => {
    const apiRef = renderEditor([{ name: '', values: [] }]);

    await act(async () => {
      await apiRef.current?.trigger('options');
    });

    expect(await screen.findByText('Option name is required')).toBeTruthy();
    expect(screen.getByText('Add at least one value')).toBeTruthy();
    expect(screen.queryByText('e.g. S, M, L')).toBeNull();
  });

  it('removes an option', async () => {
    const apiRef = renderEditor([
      { name: 'Size', values: ['S', 'M'] },
      { name: 'Colour', values: ['Red'] },
    ]);

    expect(screen.getAllByRole('button', { name: 'Remove option' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove option' })[0]);

    await waitFor(() => expect(apiRef.current?.getValues('options')).toEqual([{ name: 'Colour', values: ['Red'] }]));
    expect(screen.getAllByRole('button', { name: 'Remove option' })).toHaveLength(1);
  });
});
