import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { recordNotices } from '../../__tests__/groupC-notices';
import type { SentOperation } from '../../__tests__/groupC-link';
import { brandRow, brandsPage } from './__tests__/brandRows';
import { TABLE, mount, rowOf } from './__tests__/brandPageHarness';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  globalThis.localStorage.clear();
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});

/** A brand started but never named: the wizard saves the first step before any name is typed. */
const bare = brandRow({
  id: 'b9',
  brand_name: null,
  tagline: null,
  product_categories: null,
  updated_at: null,
  completion: null,
});

describe('EcommBrandPage — a brand with nothing filled in yet', () => {
  it('shows placeholders instead of blanks for its name, categories, update time and progress', async () => {
    mount({ [TABLE]: brandsPage([bare]) });
    const row = within(await rowOf('Untitled brand'));
    expect(row.getByText('?')).toBeTruthy();
    expect(row.getByText('0%')).toBeTruthy();
    // The tagline and the categories have nothing to show.
    expect(row.getAllByText('—')).toHaveLength(2);
  });

  it('shows a dash in the Updated column too once it is switched on', async () => {
    mount({ [TABLE]: brandsPage([bare]) });
    await rowOf('Untitled brand');
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Updated' }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(document.querySelectorAll('[role="gridcell"][col-id="updated_at"]')).toHaveLength(1));
    expect(document.querySelector('[role="gridcell"][col-id="updated_at"]')?.textContent).toBe('—');
  });

  it('raises a deletion request, named as untitled, for an approved brand that never got a name', async () => {
    mount({ [TABLE]: brandsPage([brandRow({ id: 'b8', brand_name: null, status: 'APPROVED' })]) });
    await rowOf('Untitled brand');
    fireEvent.click(await screen.findByRole('button', { name: 'Options for Untitled brand' }));
    fireEvent.click(within(await screen.findByRole('menu')).getByTestId('row-actions-menu-delete'));
    expect(await screen.findByText('Delete Untitled brand')).toBeTruthy();
  });

  it('says an approved brand that is not selling yet is waiting on its integrations', async () => {
    mount({ [TABLE]: brandsPage([brandRow({ id: 'b7', brand_name: 'Waiting Co', status: 'APPROVED', live: false })]) });
    const row = within(await rowOf('Waiting Co'));
    expect(row.getByTestId('brand-live-chip').textContent).toBe('Integration pending');
  });

  it('names the nameless brand as untitled in its row menu and in the delete question', async () => {
    mount({ [TABLE]: brandsPage([bare]) });
    await rowOf('Untitled brand');
    fireEvent.click(await screen.findByRole('button', { name: 'Options for Untitled brand' }));
    fireEvent.click(within(await screen.findByRole('menu')).getByTestId('row-actions-menu-delete'));
    expect(await screen.findByText('Delete Untitled brand?')).toBeTruthy();
  });

  it('ignores a second click on Delete that lands while the dialog is already closing', async () => {
    const sent: SentOperation[] = [];
    mount({ [TABLE]: brandsPage([bare]), DeleteMyEcommBrand: { deleteMyEcommBrand: true } }, sent);
    await rowOf('Untitled brand');
    fireEvent.click(await screen.findByRole('button', { name: 'Options for Untitled brand' }));
    fireEvent.click(within(await screen.findByRole('menu')).getByTestId('row-actions-menu-delete'));
    const confirm = within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' });
    fireEvent.click(confirm);
    await waitFor(() => expect(notices.notices.map((n) => n.message)).toContain('Brand deleted.'));
    // The dialog fades out for a moment after the brand is forgotten; its button is still there.
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent.filter((op) => op.name === 'DeleteMyEcommBrand')).toHaveLength(1);
  });
});
