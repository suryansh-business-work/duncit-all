import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import BrandDetailsRoute from './index';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';
import { integrationsOf, wizardBrand } from '../brand-wizard/__tests__/harness';

// The tab bodies have suites of their own; only the details shell is under test here.
vi.mock('../../list-products-page/ListProductsPage', () => ({ default: () => <p>products tab</p> }));
vi.mock('../brand-settings/BrandSettingsPage', () => ({ default: () => <p>warehouses tab</p> }));

afterEach(cleanup);

const mount = (answer: ScriptedAnswer, sent: SentOperation[] = []) =>
  renderWithProviders(<BrandDetailsRoute />, {
    route: '/ecomm-brand/b1',
    path: '/ecomm-brand/:brandId',
    link: scriptedLink({ MyEcommBrand: answer }, sent),
  });

const brand = (over: Record<string, unknown> = {}) => ({ myEcommBrand: wizardBrand(over) });
const where = () => screen.getByTestId('location').textContent;

describe('BrandDetailsRoute states', () => {
  it('shows a spinner, then the brand', async () => {
    mount(brand({ brand_name: 'Aurora Pets' }));
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(await screen.findByTestId('brand-details-page')).toBeTruthy();
    // The back header and the brand card both carry the name.
    expect(screen.getAllByRole('heading', { name: 'Aurora Pets' })).toHaveLength(2);
  });

  it('says so when the brand is not the partner’s', async () => {
    mount({ myEcommBrand: null });
    expect(await screen.findByText('This brand was not found, or it is not yours.')).toBeTruthy();
  });

  it('shows the server error and reloads on Try again', async () => {
    const sent: SentOperation[] = [];
    mount(new Error('Brands are down'), sent);
    expect(await screen.findByText('Brands are down')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(sent.filter((op) => op.name === 'MyEcommBrand').length).toBeGreaterThan(1));
  });
});

describe('BrandDetailsHeader', () => {
  it('offers edit setup, no products and brand settings on a draft', async () => {
    mount(brand({ tagline: 'Happy tails', brand_no: 'BRD-14' }));
    await screen.findByTestId('brand-details-page');
    expect(screen.getByText('Happy tails')).toBeTruthy();
    // The id shows on the header chip and in the completion card.
    expect(screen.getAllByText('BRD-14')).toHaveLength(2);
    expect(screen.getByTestId('brand-details-setup').textContent).toBe('Edit setup');
    expect(screen.queryByTestId('brand-details-products')).toBeNull();
    fireEvent.click(screen.getByTestId('brand-details-setup'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b1/edit'));
  });

  it('offers view setup and products on an approved brand', async () => {
    mount(brand({ status: 'APPROVED' }));
    expect((await screen.findByTestId('brand-details-setup')).textContent).toBe('View setup');
    fireEvent.click(screen.getByTestId('brand-details-products'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b1/products'));
  });

  it('opens the brand settings', async () => {
    mount(brand());
    fireEvent.click(await screen.findByTestId('brand-details-settings'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b1/settings'));
  });

  it('falls back to a placeholder name for an unnamed brand', async () => {
    mount(brand({ brand_name: '' }));
    expect(await screen.findByRole('heading', { name: 'Untitled brand', level: 1 })).toBeTruthy();
  });
});

describe('BrandOverviewTab', () => {
  it('asks a brand with nothing connected to connect, and links to the integration step', async () => {
    mount(brand({ completion: { __typename: 'BrandCompletion', percent: 45, next_step: 0, steps: [] } }));
    expect((await screen.findByText('Your brand goes live in the Pod Shop only once both Razorpay and your ShipRocket account are connected.')).textContent).toBeTruthy();
    expect(screen.getByText('Own ShipRocket account')).toBeTruthy();
    expect(screen.getAllByText('Not connected')).toHaveLength(2);
    fireEvent.click(screen.getByTestId('brand-details-connect'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b1/edit?step=integration'));
  });

  it('shows a live brand as live with no connect button', async () => {
    mount(brand({ status: 'APPROVED', live: true, live_since: '2026-07-01T10:00:00.000Z', integrations: integrationsOf(true, true, 'rzp_live_abc') }));
    expect(await screen.findByText('Your brand is live in the Pod Shop.')).toBeTruthy();
    expect(screen.getAllByText('Connected')).toHaveLength(2);
    expect(screen.getByText('rzp_live_abc')).toBeTruthy();
    expect(screen.queryByTestId('brand-details-connect')).toBeNull();
  });

  it('warns an approved brand that is waiting on its integrations, and shows reviewer notes', async () => {
    mount(brand({ status: 'APPROVED', reviewer_notes: 'Add GST certificate', contact_email: 'asha@brand.example.com' }));
    expect(await screen.findByText(/Not live yet\. Pick the integrations below/)).toBeTruthy();
    expect(screen.getByText('Add GST certificate')).toBeTruthy();
    expect(screen.getByText('asha@brand.example.com')).toBeTruthy();
    expect(screen.getByText('Treats, Toys')).toBeTruthy();
  });

  it('says Duncit courier for a brand still on it', async () => {
    mount(brand({ shipping_mode: 'DUNCIT_COURIER' }));
    expect(await screen.findByText('Duncit courier')).toBeTruthy();
    expect(screen.getAllByText('Connected')).toHaveLength(1);
  });
});

describe('BrandDetailsRoute tabs', () => {
  it('moves between the brand’s sections', async () => {
    mount(brand());
    await screen.findByTestId('brand-details-page');
    const tabs = within(screen.getByRole('tablist'));
    fireEvent.click(tabs.getByRole('tab', { name: 'Products' }));
    expect(await screen.findByText('products tab')).toBeTruthy();
    fireEvent.click(tabs.getByRole('tab', { name: 'Pickup Addresses' }));
    expect(await screen.findByText('warehouses tab')).toBeTruthy();
  });
});
