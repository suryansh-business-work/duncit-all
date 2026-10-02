import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import IntegrationStep from './IntegrationStep';
import {
  SET_BRAND_SHIPPING_MODE,
  type BrandIntegrationStatus,
  type BrandIntegrations,
  type BrandShippingMode,
} from '../../queries';
import { renderWithProviders } from '../../../../__tests__/render';

afterEach(cleanup);

const status = (provider: 'SHIPROCKET' | 'RAZORPAY', over: Partial<BrandIntegrationStatus> = {}): BrandIntegrationStatus => ({
  provider,
  configured: false,
  connected: false,
  checked_at: null,
  message: '',
  details: [],
  identifier: '',
  has_secret: false,
  pickup_location: '',
  live_mode: false,
  has_webhook_secret: false,
  ...over,
});

const integrations = (razorpayConnected = true, shiprocket: Partial<BrandIntegrationStatus> = {}): BrandIntegrations => ({
  shiprocket: status('SHIPROCKET', shiprocket),
  razorpay: status('RAZORPAY', { configured: razorpayConnected, connected: razorpayConnected }),
});

const mount = (shippingMode: BrandShippingMode | null, value: BrandIntegrations, mocks: MockedResponse[] = []) => {
  const onChanged = vi.fn();
  renderWithProviders(
    <IntegrationStep
      brandId="b1"
      shippingMode={shippingMode}
      integrations={value}
      locked={false}
      ensureBrandId={async () => 'b1'}
      onChanged={onChanged}
    />,
    { mocks },
  );
  return onChanged;
};

const shiprocketCard = () => screen.queryByText('ShipRocket');
const checked = (label: RegExp) => (screen.getByLabelText(label) as HTMLInputElement).checked;
const notReady = () => screen.queryByText(/Razorpay must connect, and shipping must be settled/);

describe('IntegrationStep — who ships the parcels', () => {
  it('asks a new brand to choose, and hides the ShipRocket form until it picks its own account', () => {
    mount(null, integrations(true));
    expect(checked(/My own ShipRocket account/)).toBe(false);
    expect(checked(/Duncit courier service/)).toBe(false);
    expect(shiprocketCard()).toBeNull();
    expect(notReady()).not.toBeNull();
  });

  it('needs no ShipRocket form from a brand on the Duncit courier — Razorpay alone settles the step', () => {
    mount('DUNCIT_COURIER', integrations(true));
    expect(checked(/Duncit courier service/)).toBe(true);
    expect(shiprocketCard()).toBeNull();
    expect(notReady()).toBeNull();
  });

  it('shows the ShipRocket form for a brand that ships on its own account', () => {
    mount('OWN_SHIPROCKET', integrations(true));
    expect(checked(/My own ShipRocket account/)).toBe(true);
    expect(shiprocketCard()).not.toBeNull();
  });

  it('reads a brand from before the choice that saved its own ShipRocket as shipping on it', () => {
    mount(null, integrations(true, { configured: true, connected: true }));
    expect(checked(/My own ShipRocket account/)).toBe(true);
  });

  it('saves the choice the moment it is picked, then reloads the brand', async () => {
    const onChanged = mount(null, integrations(true), [
      {
        request: { query: SET_BRAND_SHIPPING_MODE, variables: { brand_doc_id: 'b1', mode: 'DUNCIT_COURIER' } },
        result: { data: { setBrandShippingMode: { __typename: 'EcommBrand', id: 'b1', shipping_mode: 'DUNCIT_COURIER' } } },
      },
    ]);
    fireEvent.click(screen.getByTestId('brand-shipping-mode-duncit').querySelector('input') as HTMLInputElement);
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });
});
