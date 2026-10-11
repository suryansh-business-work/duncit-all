import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import IntegrationStep from './IntegrationStep';
import {
  type BrandIntegrationStatus,
  type BrandIntegrations,
  type BrandShippingMode,
  type EcommBrand,
} from '../../queries';
import {
  MY_PARTNER_INTEGRATIONS,
  USE_BRAND_INTEGRATION,
  type PartnerIntegration,
} from '../../integrations/integrations.queries';
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
  sandbox: false,
  connection_id: null,
  ...over,
});

const integrations = (razorpayConnected = true, shiprocket: Partial<BrandIntegrationStatus> = {}): BrandIntegrations => ({
  shiprocket: status('SHIPROCKET', shiprocket),
  razorpay: status('RAZORPAY', { configured: razorpayConnected, connected: razorpayConnected }),
});

const connection = (id: string, label: string, connected: boolean): PartnerIntegration => ({
  id,
  provider: 'RAZORPAY',
  label,
  brands: [],
  status: status('RAZORPAY', { configured: true, connected, identifier: `rzp_test_${id}`, has_secret: true }),
});

const savedMock = (saved: PartnerIntegration[] = []): MockedResponse => ({
  request: { query: MY_PARTNER_INTEGRATIONS },
  result: { data: { myPartnerIntegrations: saved } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

type LiveFacts = Pick<EcommBrand, 'status' | 'live' | 'integration_waived'>;

const mount = (
  shippingMode: BrandShippingMode | null,
  value: BrandIntegrations,
  mocks: MockedResponse[] = [],
  brand: LiveFacts | null = null,
  saved: PartnerIntegration[] = [],
) => {
  const onChanged = vi.fn();
  renderWithProviders(
    <IntegrationStep
      shippingMode={shippingMode}
      integrations={value}
      brand={brand}
      locked={false}
      ensureBrandId={async () => 'b1'}
      onChanged={onChanged}
    />,
    { mocks: [savedMock(saved), ...mocks] },
  );
  return onChanged;
};

const shiprocketPicker = () => screen.queryByTestId('integration-picker-shiprocket');
const notReady = () => screen.queryByText(/goes live in the Pod Shop only once both Razorpay and your ShipRocket account are connected/);

describe('IntegrationStep — who ships the parcels', () => {
  it('shows the ShipRocket picker to a new brand: its own account is the only way to ship', () => {
    mount(null, integrations(true));
    expect(shiprocketPicker()).not.toBeNull();
    expect(screen.queryByText(/Duncit courier service/)).toBeNull();
    expect(screen.queryByTestId('brand-shipping-mode-duncit')).toBeNull();
    expect(notReady()).not.toBeNull();
  });

  it('tells a brand still on the retired Duncit courier to move, and offers the ShipRocket picker to do it', () => {
    mount('DUNCIT_COURIER', integrations(true));
    expect(screen.getByTestId('brand-shipping-legacy-courier').textContent).toMatch(/no longer offered/);
    expect(shiprocketPicker()).not.toBeNull();
    // It keeps shipping on that account until it moves, so the step still reads as settled.
    expect(notReady()).toBeNull();
  });

  it('shows no courier notice to a brand that ships on its own account', () => {
    mount('OWN_SHIPROCKET', integrations(true));
    expect(shiprocketPicker()).not.toBeNull();
    expect(screen.queryByTestId('brand-shipping-legacy-courier')).toBeNull();
  });

  it('marks a ShipRocket account in sandbox mode as test orders only', () => {
    mount('OWN_SHIPROCKET', integrations(true, { configured: true, connected: true, sandbox: true }));
    expect(screen.getByTestId('integration-chip-sandbox').textContent).toMatch(/Sandbox/);
  });

  it('shows no sandbox chip for a live ShipRocket account', () => {
    mount('OWN_SHIPROCKET', integrations(true, { configured: true, connected: true }));
    expect(screen.queryByTestId('integration-chip-sandbox')).toBeNull();
  });
});

describe('IntegrationStep — picking a saved account', () => {
  it('asks a partner with no saved Razorpay account to add one, and links to the Integrations page', async () => {
    mount('DUNCIT_COURIER', integrations(false));
    expect(await screen.findByText(/You have not saved a Razorpay account yet/)).not.toBeNull();
    // One link per picker (ShipRocket, Razorpay) — both lead to the Integrations page.
    const links = screen.getAllByRole('link', { name: 'Manage integrations' });
    expect(links.length).toBeGreaterThan(0);
    for (const manage of links) expect(manage.getAttribute('href')).toBe('/ecomm-brand/integrations');
  });

  it('offers only the accounts that passed their check, and picks one for the brand', async () => {
    const saved = [connection('c1', 'Main Razorpay', true), connection('c2', 'Old keys', false)];
    const onChanged = mount('DUNCIT_COURIER', integrations(false), [
      {
        request: { query: USE_BRAND_INTEGRATION, variables: { brand_doc_id: 'b1', provider: 'RAZORPAY', integration_id: 'c1' } },
        result: { data: { useBrandIntegration: status('RAZORPAY', { configured: true, connected: true, connection_id: 'c1' }) } },
      },
    ], null, saved);
    const picker = await screen.findByRole('combobox', { name: /Razorpay account/ });
    fireEvent.mouseDown(picker);
    const options = within(screen.getByRole('listbox'));
    expect(options.getByRole('option', { name: /Old keys — failed its last check/ }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(options.getByRole('option', { name: 'Main Razorpay — rzp_test_c1' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it('shows the account already picked for the brand', async () => {
    const saved = [connection('c1', 'Main Razorpay', true)];
    mount('DUNCIT_COURIER', { ...integrations(true), razorpay: status('RAZORPAY', { configured: true, connected: true, connection_id: 'c1' }) }, [], null, saved);
    expect((await screen.findByRole('combobox', { name: /Razorpay account/ })).textContent).toContain('Main Razorpay');
  });
});

describe('IntegrationStep — going live', () => {
  const approved = (over: Partial<LiveFacts> = {}): LiveFacts => ({ status: 'APPROVED', live: false, integration_waived: false, ...over });

  it('tells a live brand it is live', () => {
    mount('DUNCIT_COURIER', integrations(true), [], approved({ live: true }));
    expect(screen.getByText('Your brand is live in the Pod Shop.')).not.toBeNull();
  });

  it('warns an approved brand that it is not live until the integrations are picked', () => {
    mount('OWN_SHIPROCKET', integrations(false), [], approved());
    expect(screen.getByText(/Not live yet. Pick the integrations below/)).not.toBeNull();
  });

  it('tells a brand in review with integrations ready that approval takes it live', () => {
    mount('DUNCIT_COURIER', integrations(true), [], { status: 'SUBMITTED', live: false, integration_waived: false });
    expect(screen.getByText(/Integrations are ready. Your brand goes live as soon as it is approved/)).not.toBeNull();
  });

  it('keeps a grandfathered brand live and still asks it to pick its accounts', () => {
    mount('OWN_SHIPROCKET', integrations(false), [], approved({ live: true, integration_waived: true }));
    expect(screen.getByText(/was selling before integrations were required/)).not.toBeNull();
  });

  it('shows each provider with its logo', () => {
    mount('OWN_SHIPROCKET', integrations(false));
    expect(screen.getByRole('img', { name: 'ShipRocket' })).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Razorpay' })).not.toBeNull();
  });
});
