import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { recordNotices } from '../../__tests__/groupC-notices';
import type { SentOperation } from '../../__tests__/groupC-link';
import { brandsPage, deletionRequest } from './__tests__/brandRows';
import { REQUESTS, TABLE, draft, live, mount, openMenu, paused, rowOf, submitted, where } from './__tests__/brandPageHarness';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  globalThis.localStorage.clear();
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);

describe('EcommBrandPage table', () => {
  it('lists each brand with its progress, status and go-live state', async () => {
    mount();
    const liveRow = within(await rowOf('Blue Kettle'));
    expect(liveRow.getByText('100%')).toBeTruthy();
    expect(liveRow.getByText('APPROVED')).toBeTruthy();
    expect(liveRow.getByTestId('brand-live-chip').textContent).toBe('Live');

    const draftRow = within(await rowOf('Aurora Pets'));
    expect(draftRow.getByText('Treats for happy tails')).toBeTruthy();
    expect(draftRow.getByText('40%')).toBeTruthy();
    expect(draftRow.getByText('DRAFT')).toBeTruthy();
    expect(draftRow.queryByTestId('brand-live-chip')).toBeNull();

    const pausedRow = within(await rowOf('Cedar Cats'));
    expect(pausedRow.getByText('Paused')).toBeTruthy();
    expect(pausedRow.queryByTestId('brand-live-chip')).toBeNull();
  });

  it('shows the empty state when the partner has no brand', async () => {
    mount({ [TABLE]: brandsPage([]) });
    expect(await screen.findByText('No brands yet — create your first product brand to get started.')).toBeTruthy();
  });

  it('shows an open deletion request beside the brand status', async () => {
    mount({ [REQUESTS]: { myCatalogDeletionRequests: [deletionRequest({ brand_id: 'b2' })] } });
    const row = within(await rowOf('Blue Kettle'));
    expect((await row.findByTestId('deletion-chip')).textContent).toBe('Deletion pending review');
  });

  it('starts a new brand from the toolbar', async () => {
    mount();
    fireEvent.click(await screen.findByTestId('brands-new-brand'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/new'));
  });

  it('opens the brand details from a row click', async () => {
    mount();
    fireEvent.click(await screen.findByText('Blue Kettle'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b2'));
  });
});

describe('EcommBrandPage row menu', () => {
  it('offers setup and integrations, but not products, on a draft brand', async () => {
    mount();
    const menu = within(await openMenu('Aurora Pets'));
    expect(menu.getByTestId('row-actions-menu-setup').textContent).toBe('Continue setup');
    expect(menu.getByTestId('row-actions-menu-integrations')).toBeTruthy();
    expect(menu.queryByTestId('row-actions-menu-products')).toBeNull();
    expect(menu.queryByTestId('row-actions-menu-pause')).toBeNull();

    fireEvent.click(menu.getByTestId('row-actions-menu-integrations'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b1/edit?step=integration'));
  });

  it('opens the wizard read-only on a submitted brand', async () => {
    mount();
    const menu = within(await openMenu('Delta Dogs'));
    expect(menu.getByTestId('row-actions-menu-setup').textContent).toBe('View');
    fireEvent.click(menu.getByTestId('row-actions-menu-setup'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b4/edit'));
  });

  it('offers products and pausing on an approved brand and hides the integrations once both are connected', async () => {
    mount();
    const menu = within(await openMenu('Blue Kettle'));
    expect(menu.queryByTestId('row-actions-menu-integrations')).toBeNull();
    expect(menu.getByTestId('row-actions-menu-pause').textContent).toBe('Temporarily deactivate');
    fireEvent.click(menu.getByTestId('row-actions-menu-products'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b2/products'));
  });

  it('opens the brand settings', async () => {
    mount();
    fireEvent.click(within(await openMenu('Aurora Pets')).getByTestId('row-actions-menu-settings'));
    await waitFor(() => expect(where()).toBe('/ecomm-brand/b1/settings'));
  });

  it('reactivates a paused brand and refreshes the table', async () => {
    const sent: SentOperation[] = [];
    mount({ SetMyEcommBrandActive: { setMyEcommBrandActive: { __typename: 'EcommBrand', id: 'b3', is_active: true } } }, sent);
    const menu = within(await openMenu('Cedar Cats'));
    expect(menu.getByTestId('row-actions-menu-pause').textContent).toBe('Reactivate');
    const loads = sent.filter((op) => op.name === TABLE).length;
    fireEvent.click(menu.getByTestId('row-actions-menu-pause'));
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate' }));

    await waitFor(() => expect(messages()).toContain('Brand visibility updated.'));
    expect(sent.find((op) => op.name === 'SetMyEcommBrandActive')?.variables).toEqual({ brand_doc_id: 'b3', active: true });
    await waitFor(() => expect(sent.filter((op) => op.name === TABLE).length).toBeGreaterThan(loads));
  });
});
