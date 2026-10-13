import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { recordNotices } from '../../__tests__/groupC-notices';
import type { SentOperation } from '../../__tests__/groupC-link';
import { deletionRequest } from './__tests__/brandRows';
import { REQUESTS, TABLE, mount, openMenu } from './__tests__/brandPageHarness';

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

describe('EcommBrandPage deleting and withdrawing', () => {
  it('deletes a brand still in setup after a confirmation and reloads the table', async () => {
    const sent: SentOperation[] = [];
    mount({ DeleteMyEcommBrand: { deleteMyEcommBrand: true } }, sent);
    const loads = sent.filter((op) => op.name === TABLE).length;
    fireEvent.click(within(await openMenu('Aurora Pets')).getByTestId('row-actions-menu-delete'));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Delete Aurora Pets?')).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(messages()).toContain('Brand deleted.'));
    expect(sent.find((op) => op.name === 'DeleteMyEcommBrand')?.variables).toEqual({ brand_doc_id: 'b1' });
    await waitFor(() => expect(sent.filter((op) => op.name === TABLE).length).toBeGreaterThan(loads));
  });

  it('reports a refused deletion', async () => {
    mount({ DeleteMyEcommBrand: new Error('Brand has live products') });
    fireEvent.click(within(await openMenu('Aurora Pets')).getByTestId('row-actions-menu-delete'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(messages()).toContain('Brand has live products'));
  });

  it('raises a deletion request, not a deletion, for an approved brand', async () => {
    const sent: SentOperation[] = [];
    mount({}, sent);
    fireEvent.click(within(await openMenu('Blue Kettle')).getByTestId('row-actions-menu-delete'));
    expect(await screen.findByText('Delete Blue Kettle')).toBeTruthy();
    await waitFor(() => expect(sent.some((op) => op.name === 'PartnerCatalogDeletionPreview')).toBe(true));
    expect(sent.some((op) => op.name === 'DeleteMyEcommBrand')).toBe(false);
  });

  it('swaps Delete for Withdraw on a brand with an open request, and withdraws it', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        [REQUESTS]: { myCatalogDeletionRequests: [deletionRequest({ brand_id: 'b2' })] },
        PartnerWithdrawCatalogDeletion: { withdrawCatalogDeletion: deletionRequest({ brand_id: 'b2', status: 'WITHDRAWN' }) },
      },
      sent,
    );
    await screen.findByTestId('deletion-chip');
    const menu = within(await openMenu('Blue Kettle'));
    expect(menu.queryByTestId('row-actions-menu-delete')).toBeNull();
    fireEvent.click(menu.getByTestId('row-actions-menu-withdraw-deletion'));
    expect(await screen.findByText('Withdraw the deletion request?')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Withdraw deletion request' }));

    await waitFor(() => expect(messages()).toContain('Deletion request withdrawn — Blue Kettle is back on sale.'));
    expect(sent.find((op) => op.name === 'PartnerWithdrawCatalogDeletion')?.variables).toEqual({ id: 'r1' });
  });

  it('will not withdraw a request raised by a parent brand deletion', async () => {
    mount({ [REQUESTS]: { myCatalogDeletionRequests: [deletionRequest({ brand_id: 'b2', parent_id: 'r0' })] } });
    await screen.findByTestId('deletion-chip');
    const menu = within(await openMenu('Blue Kettle'));
    expect(menu.getByTestId('row-actions-menu-withdraw-deletion').getAttribute('aria-disabled')).toBe('true');
  });
});
