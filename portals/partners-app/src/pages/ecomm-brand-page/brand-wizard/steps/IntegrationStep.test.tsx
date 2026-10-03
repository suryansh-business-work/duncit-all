import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import IntegrationStep from './IntegrationStep';
import {
  SET_BRAND_SHIPPING_MODE,
  type BrandIntegrationStatus,
  type BrandIntegrations,
  type BrandShippingMode,
  type EcommBrand,
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

type LiveFacts = Pick<EcommBrand, 'status' | 'live' | 'integration_waived'>;

const mount = (
  shippingMode: BrandShippingMode | null,
  value: BrandIntegrations,
  mocks: MockedResponse[] = [],
  brand: LiveFacts | null = null,
) => {
  const onChanged = vi.fn();
  renderWithProviders(
    <IntegrationStep
      brandId="b1"
      shippingMode={shippingMode}
      integrations={value}
      brand={brand}
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
const notReady = () => screen.queryByText(/goes live in the Pod Shop only once Razorpay is connected/);

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

describe('IntegrationStep — going live', () => {
  const approved = (over: Partial<LiveFacts> = {}): LiveFacts => ({ status: 'APPROVED', live: false, integration_waived: false, ...over });

  it('tells a live brand it is live', () => {
    mount('DUNCIT_COURIER', integrations(true), [], approved({ live: true }));
    expect().not.toBeNull();
  });

  it('warns an approved brand that it is not live until the integrations connect', () => {
    mount('OWN_SHIPROCKET', integrations(false), [], approved());
    expect().not.toBeNull();
  });

  it('tells a brand in review with integrations ready that approval takes it live', () => {
    mount('DUNCIT_COURIER', integrations(true), [], { status: 'SUBMITTED', live: false, integration_waived: false });
    expect().not.toBeNull();
  });

  it('keeps a grandfathered brand live and still asks it to connect', () => {
    mount('OWN_SHIPROCKET', integrations(false), [], approved({ live: true, integration_waived: true }));
    expect().not.toBeNull();
  });

  it('shows each provider with its logo and a how-to-connect guide linking to the vendor', () => {
    mount('OWN_SHIPROCKET', integrations(false));
    expect().not.toBeNull();
    expect().not.toBeNull();
    const open = screen.getByTestId('integration-guide-razorpay-openApi');
    expect(open.getAttribute('href')).toBe('https://dashboard.razorpay.com/app/website-app-settings/api-keys');
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByTestId('integration-guide-shiprocket-webhook').textContent).toMatch(/\/webhooks\/courier-updates$/);
  });
});
