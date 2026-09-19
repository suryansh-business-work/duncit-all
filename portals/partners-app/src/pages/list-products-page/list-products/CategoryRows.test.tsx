import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import CategoryRows from './CategoryRows';
import { ProductFormHarness, type ProductFormApi } from './__tests__/formHarness';
import { categoriesMock } from '../../../__tests__/groupB-fixtures';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

const renderRows = () => {
  const apiRef: { current: ProductFormApi | null } = { current: null };
  renderWithProviders(
    <ProductFormHarness apiRef={apiRef} renderFields={({ control }) => <CategoryRows control={control} />} />,
    { mocks: [categoriesMock] },
  );
  return apiRef;
};

const pick = async (label: RegExp, option: string) => {
  const input = screen.getAllByRole('combobox', { name: label })[0];
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: option }));
};

describe('CategoryRows', () => {
  it('asks where the product sells, starting with one row that cannot be removed', () => {
    renderRows();

    expect(screen.getByText('Which categories do you want to sell your product in?')).toBeTruthy();
    const removes = screen.getAllByRole('button', { name: 'Remove category' });
    expect(removes).toHaveLength(1);
    expect((removes[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it('adds and removes category rows', async () => {
    const apiRef = renderRows();

    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    const removes = await screen.findAllByRole('button', { name: 'Remove category' });
    expect(removes).toHaveLength(2);
    expect(removes.every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
    expect(apiRef.current?.getValues('categories')).toHaveLength(2);

    fireEvent.click(removes[1]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remove category' })).toHaveLength(1));
    expect(apiRef.current?.getValues('categories')).toHaveLength(1);
  });

  it('stores the full Super → Category → Sub path picked from the admin tree', async () => {
    const apiRef = renderRows();

    await pick(/^Super Category/, 'Apparel');
    await pick(/^Category/, 'Tops');
    await pick(/^Sub Category/, 'T-shirts');

    await waitFor(() =>
      expect(apiRef.current?.getValues('categories.0')).toEqual({
        super_id: 's1',
        super_name: 'Apparel',
        category_id: 'c1',
        category_name: 'Tops',
        sub_id: 'sc1',
        sub_name: 'T-shirts',
      }),
    );
    expect(screen.getByDisplayValue('Apparel')).toBeTruthy();
    expect(screen.getByDisplayValue('Tops')).toBeTruthy();
    expect(screen.getByDisplayValue('T-shirts')).toBeTruthy();
  });
});
