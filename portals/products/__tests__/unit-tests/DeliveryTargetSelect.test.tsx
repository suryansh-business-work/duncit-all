import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import DeliveryTargetSelect from '../../src/pages/inventory-page/inventory-product-page/DeliveryTargetSelect';
import {
  blankProductForm,
  type DeliveryTarget,
  type InventoryProductFormValues,
} from '../../src/pages/inventory-page/inventory-product-page/types';
import { renderWithProviders } from '../testkit';

const HINT = /ShipRocket rates and books the courier live from the warehouse below/i;

function Harness({
  children,
  value = 'HOST',
}: Readonly<{ children: ReactNode; value?: DeliveryTarget }>) {
  const methods = useForm<InventoryProductFormValues, any, InventoryProductFormValues>({
    defaultValues: { ...blankProductForm, delivery_target: value },
    mode: 'onChange',
  });
  return (
    <FormProvider {...methods}>
      {children}
      <output data-testid="value">{methods.watch('delivery_target')}</output>
    </FormProvider>
  );
}

describe('DeliveryTargetSelect', () => {
  it('shows the current method and explains what ShipRocket changes', () => {
    renderWithProviders(
      <Harness value="SHIPROCKET">
        <DeliveryTargetSelect />
      </Harness>,
    );
    expect(screen.getByText('ShipRocket delivery')).toBeInTheDocument();
    expect(screen.getByText(HINT)).toBeInTheDocument();
  });

  it('offers every delivery method and records the one the admin picks', async () => {
    renderWithProviders(
      <Harness>
        <DeliveryTargetSelect />
      </Harness>,
    );
    expect(screen.getByText('Host delivery')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = within(screen.getByRole('listbox'));
    expect(listbox.getByText('Venue delivery')).toBeInTheDocument();
    fireEvent.click(listbox.getByText('ShipRocket delivery'));
    // The stored value is what the checkout reads to rate the parcel — assert
    // that, not only the label MUI paints.
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('SHIPROCKET'));
  });
});
