import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import WarehouseSelect from '../../src/pages/inventory-page/inventory-product-page/WarehouseSelect';
import { productSchema } from '../../src/pages/inventory-page/inventory-product-page/schema';
import { blankProductForm, type InventoryProductFormValues } from '../../src/pages/inventory-page/inventory-product-page/types';
import { renderWithProviders } from '../testkit';
import { brandPickupLocationsMock, makeBrandPickupLocation } from '../mocks/pickup.mock';

function Harness({ children, value = '' }: Readonly<{ children: ReactNode; value?: string }>) {
  const methods = useForm<InventoryProductFormValues>({
    defaultValues: { ...blankProductForm, pickup_location_id: value },
    resolver: zodResolver(productSchema),
    mode: 'onChange',
  });
  return (
    <FormProvider {...methods}>
      {children}
      <button type="button" onClick={() => methods.trigger('pickup_location_id')}>
        validate
      </button>
    </FormProvider>
  );
}

const wh = (over = {}) => makeBrandPickupLocation({ owner_kind: 'DUNCIT', brand_id: null, ...over });

describe('WarehouseSelect', () => {
  it('shows the empty hint and surfaces the required error when no warehouse is chosen', async () => {
    renderWithProviders(
      <Harness>
        <WarehouseSelect />
      </Harness>,
      { mocks: [brandPickupLocationsMock([])] },
    );
    await waitFor(() =>
      expect(screen.getByText(/No Duncit warehouses yet/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'validate' }));
    await waitFor(() => expect(screen.getByText('Warehouse is required')).toBeInTheDocument());
  });

  it('preselects the default warehouse and marks it in the option label', async () => {
    renderWithProviders(
      <Harness>
        <WarehouseSelect />
      </Harness>,
      {
        mocks: [
          brandPickupLocationsMock([
            wh({ id: 'w1', nickname: 'North WH', city: 'Delhi', is_default: false }),
            wh({ id: 'w2', nickname: 'Main WH', city: 'Pune', is_default: true }),
          ]),
        ],
      },
    );
    // The default warehouse becomes the selected value (shown in the closed select).
    await waitFor(() => expect(screen.getByText('Main WH — Pune (default)')).toBeInTheDocument());
  });

  it('falls back to the first warehouse when none is marked default', async () => {
    renderWithProviders(
      <Harness>
        <WarehouseSelect />
      </Harness>,
      {
        mocks: [
          brandPickupLocationsMock([
            wh({ id: 'w1', nickname: 'North WH', city: 'Delhi', is_default: false }),
            wh({ id: 'w2', nickname: 'South WH', city: 'Chennai', is_default: false }),
          ]),
        ],
      },
    );
    await waitFor(() => expect(screen.getByText('North WH — Delhi')).toBeInTheDocument());
  });

  it('changes the selection when the user picks a different warehouse', async () => {
    renderWithProviders(
      <Harness>
        <WarehouseSelect />
      </Harness>,
      {
        mocks: [
          brandPickupLocationsMock([
            wh({ id: 'w1', nickname: 'North WH', city: 'Delhi', is_default: true }),
            wh({ id: 'w2', nickname: 'South WH', city: 'Chennai', is_default: false }),
          ]),
        ],
      },
    );
    await waitFor(() => expect(screen.getByText('North WH — Delhi (default)')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = within(screen.getByRole('listbox'));
    fireEvent.click(listbox.getByText('South WH — Chennai'));
    await waitFor(() => expect(screen.getByText('South WH — Chennai')).toBeInTheDocument());
  });

  it('keeps an already-chosen warehouse instead of overriding it', async () => {
    renderWithProviders(
      <Harness value="w2">
        <WarehouseSelect />
      </Harness>,
      {
        mocks: [
          brandPickupLocationsMock([
            wh({ id: 'w1', nickname: 'North WH', city: 'Delhi', is_default: true }),
            wh({ id: 'w2', nickname: 'South WH', city: 'Chennai', is_default: false }),
          ]),
        ],
      },
    );
    // The preset value 'w2' wins even though 'w1' is the default.
    await waitFor(() => expect(screen.getByText('South WH — Chennai')).toBeInTheDocument());
  });
});
