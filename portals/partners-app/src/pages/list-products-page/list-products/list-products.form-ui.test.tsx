import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { StepBody } from './list-products.form-ui';
import { ProductFormHarness, type ProductFormApi } from './__tests__/formHarness';
import { productToValues } from './list-products.map';
import type { ProductListingValues } from './list-products.types';
import { categoriesMock, listingRow, warehouseRow, warehousesMock } from '../../../__tests__/groupB-fixtures';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

interface RenderArgs {
  step: number;
  brandId?: string;
  mocks?: MockedResponse[];
  defaultValues?: Partial<ProductListingValues>;
}

const renderStep = ({ step, brandId = 'b1', mocks = [], defaultValues }: RenderArgs) => {
  const apiRef: { current: ProductFormApi | null } = { current: null };
  const onPickImage = vi.fn();
  renderWithProviders(
    <ProductFormHarness
      apiRef={apiRef}
      defaultValues={defaultValues}
      renderFields={({ control, watch, setValue }) => (
        <StepBody step={step} brandId={brandId} control={control} watch={watch} setValue={setValue} onPickImage={onPickImage} />
      )}
    />,
    { mocks },
  );
  return apiRef;
};

const openWarehouses = () => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: /Ship-from warehouse/ }));
  return screen.findByRole('listbox');
};

describe('StepBody — early steps', () => {
  it('asks for categories first', () => {
    renderStep({ step: 0, mocks: [categoriesMock] });
    expect(screen.getByText('Which categories do you want to sell your product in?')).toBeTruthy();
  });

  it('asks for the product title with a hint for hosts', () => {
    renderStep({ step: 1 });
    expect(screen.getByRole('textbox', { name: /Product title/ })).toBeTruthy();
    expect(screen.getByText('Use the exact product name hosts will understand during pod creation.')).toBeTruthy();
  });

  it('pairs the options editor with the variant tabs', () => {
    renderStep({ step: 2 });
    expect(screen.getByText('Options (e.g. Size, Colour)')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Variant 1' })).toBeTruthy();
  });
});

describe('StepBody — commission', () => {
  it('shows the commission and moves it with the slider', async () => {
    const apiRef = renderStep({ step: 3 });

    expect(screen.getByText('Duncit commission: 15%')).toBeTruthy();
    fireEvent.change(screen.getByRole('slider', { name: /Duncit commission/ }), { target: { value: '22' } });

    expect(await screen.findByText('Duncit commission: 22%')).toBeTruthy();
    expect(apiRef.current?.getValues('commission_pct')).toBe(22);
  });
});

describe('StepBody — delivery', () => {
  it('offers only approved warehouses and stores the one picked', async () => {
    const apiRef = renderStep({
      step: 4,
      mocks: [
        warehousesMock([
          warehouseRow(),
          warehouseRow({ id: 'w2', nickname: 'Pune hub', city: 'Pune', review_status: 'PENDING', is_default: false }),
          warehouseRow({ id: 'w3', nickname: 'Old depot', city: 'Agra', review_status: 'REJECTED', is_default: false }),
        ]),
      ],
    });

    expect((screen.getByRole('radio', { name: 'ShipRocket delivery' }) as HTMLInputElement).checked).toBe(true);
    const listbox = await openWarehouses();
    expect(within(listbox).getByRole('option', { name: 'Pune hub — Pune (awaiting approval)' }).getAttribute('aria-disabled')).toBe('true');
    expect(within(listbox).getByRole('option', { name: 'Old depot — Agra (rejected)' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(within(listbox).getByRole('option', { name: 'Delhi warehouse — New Delhi' }));

    await waitFor(() => expect(apiRef.current?.getValues('pickup_location_id')).toBe('w1'));
    expect(screen.queryByText(/has no warehouses yet/)).toBeNull();
    expect(screen.queryByText(/None of this brand's warehouses is approved yet/)).toBeNull();
    expect(screen.getByText('Orders for this product are shipped through ShipRocket using the warehouse selected above.')).toBeTruthy();
  });

  it('sends the partner to Brand Settings when the brand has no warehouse', async () => {
    renderStep({ step: 4, mocks: [warehousesMock([])] });

    const warning = (await screen.findByText(/This brand has no warehouses yet/)).closest('[role="alert"]') as HTMLElement;
    expect(within(warning).getByRole('link', { name: 'Brand Settings' }).getAttribute('href')).toBe('/ecomm-brand/b1/settings');
  });

  it('explains the wait when no warehouse is approved yet', async () => {
    renderStep({ step: 4, mocks: [warehousesMock([warehouseRow({ review_status: 'PENDING' })])] });

    const warning = (await screen.findByText(/None of this brand's warehouses is approved yet/)).closest('[role="alert"]') as HTMLElement;
    expect(within(warning).getByRole('link', { name: 'Brand Settings' }).getAttribute('href')).toBe('/ecomm-brand/b1/settings');
    expect(screen.queryByText(/has no warehouses yet/)).toBeNull();
  });

  it('moves a legacy host-delivered listing onto ShipRocket when the partner picks it', async () => {
    const apiRef = renderStep({
      step: 4,
      mocks: [warehousesMock([warehouseRow()])],
      defaultValues: productToValues(listingRow({ delivery_target: 'HOST' })),
    });

    const shiprocket = screen.getByRole('radio', { name: 'ShipRocket delivery' }) as HTMLInputElement;
    expect(shiprocket.checked).toBe(false);
    fireEvent.click(shiprocket);

    await waitFor(() => expect(apiRef.current?.getValues('delivery_target')).toBe('SHIPROCKET'));
    expect(shiprocket.checked).toBe(true);
  });

  it('takes a free-delivery threshold', async () => {
    const apiRef = renderStep({ step: 4, mocks: [warehousesMock([warehouseRow()])] });

    fireEvent.change(screen.getByRole('spinbutton', { name: /Free delivery above/ }), { target: { value: '999' } });
    await waitFor(() => expect(apiRef.current?.getValues('free_delivery_above')).toBe('999'));
  });
});

describe('StepBody — preview', () => {
  it('previews the values entered so far', () => {
    renderStep({ step: 5, mocks: [warehousesMock([warehouseRow()])], defaultValues: { product_name: 'Alpha Tee' } });
    expect(screen.getByRole('heading', { name: 'Alpha Tee' })).toBeTruthy();
    expect(screen.getByText('No free-delivery offer')).toBeTruthy();
  });
});
