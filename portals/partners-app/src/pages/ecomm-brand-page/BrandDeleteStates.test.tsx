import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { recordNotices } from '../../__tests__/groupC-notices';
import type { SentOperation } from '../../__tests__/groupC-link';
import { PREVIEW, REQUESTS, mount, openDialog, request } from './__tests__/deleteHarness';

let notices: ReturnType<typeof recordNotices>;
beforeEach(() => {
  notices = recordNotices();
});
afterEach(() => {
  notices.stop();
  cleanup();
});
const messages = () => notices.notices.map((n) => n.message);


describe('BrandDeleteButton for a brand still in setup', () => {
  it('deletes outright after a confirmation and reports it', async () => {
    const sent: SentOperation[] = [];
    const { onDeleted } = mount({ status: 'DRAFT', sent, answers: { DeleteMyEcommBrand: { deleteMyEcommBrand: true } } });
    const dialog = await openDialog();
    expect(dialog.getByText('Delete Chai Point?')).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(sent.find((op) => op.name === 'DeleteMyEcommBrand')?.variables).toEqual({ brand_doc_id: 'b1' });
    expect(messages()).toContain('Brand deleted.');
    expect(sent.some((op) => op.name === PREVIEW)).toBe(false);
  });

  it('reports a refused deletion and does not call onDeleted', async () => {
    const { onDeleted } = mount({ status: 'DRAFT', answers: { DeleteMyEcommBrand: new Error('Brand has products') } });
    const dialog = await openDialog();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(messages()).toContain('Brand has products'));
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

describe('BrandDeleteButton with a deletion already open', () => {
  const chipFor = async (row: Record<string, unknown>) => {
    mount({ answers: { [REQUESTS]: { myCatalogDeletionRequests: [row] } } });
    return screen.findByTestId('deletion-chip');
  };

  it('shows a pending request instead of the button', async () => {
    expect((await chipFor(request())).textContent).toBe('Deletion pending review');
    expect(screen.queryByTestId('brand-danger-delete')).toBeNull();
  });

  it('shows what an approved request is waiting for', async () => {
    const chip = await chipFor(request({ status: 'APPROVED', blocked_reason: '2 running orders' }));
    expect(chip.textContent).toBe('Waiting: 2 running orders');
  });

  it('shows the day an approved, unblocked request will run', async () => {
    const chip = await chipFor(request({ status: 'APPROVED' }));
    expect(chip.textContent).toMatch(/^Deleting on /);
  });

  it('ignores a request that is no longer open', async () => {
    mount({ answers: { [REQUESTS]: { myCatalogDeletionRequests: [request({ status: 'REJECTED' })] } } });
    expect(await screen.findByTestId('brand-danger-delete')).toBeTruthy();
    expect(screen.queryByTestId('deletion-chip')).toBeNull();
  });

  it('reports a failure to read the requests', async () => {
    mount({ answers: { [REQUESTS]: new Error('Requests unavailable') } });
    await waitFor(() => expect(messages()).toContain('Requests unavailable'));
  });
});
